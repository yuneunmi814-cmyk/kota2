// 한국관광공사 TourAPI — 화면을 그릴 때 직접 부른다.
//
// 왜 이렇게 바꿨나(2026-08-19):
// 원래는 파이프라인이 빌드 전에 TourAPI를 받아 Supabase에 넣어두고, 웹은 그 DB만 읽었다.
// 빠르지만 두 가지가 걸렸다.
//   1) 공모전 안내가 "로컬 DB 저장이 아닌 실시간 호출 방식으로 활용할 것"을 강력히 권고한다.
//      호출 이력으로 API 활용 여부를 검증한다고 명시돼 있다.
//   2) 그보다 실질적인 이유 — 파이프라인을 돌려야만 일정 변경이 반영됐다. 축제 날짜가
//      바뀌어도 사람이 손을 대기 전까지 옛 날짜가 그대로 떠 있었다.
//
// 그래서 목록을 만들 때마다 TourAPI를 실제로 부르고, 그 결과를 DB 위에 덮는다.
// 요청마다 부르는 것은 아니다 — 페이지가 ISR(revalidate 3600)이고 이 fetch에도 같은
// 주기를 걸어서, 방문자가 몇이든 한 시간에 한 번만 나간다.
//
// 역할 분담:
//   TourAPI(실시간) — 일정·좌표·공식 이미지·연락처. 원천이 바뀌면 그대로 따라간다.
//   Supabase(축적)  — 4개 언어 번역, 손으로 보강한 포스터, 테마 분류, 리뷰·조회수.
//                     이건 우리가 쌓은 것이라 API가 돌려주지 않는다.

const BASE = 'https://apis.data.go.kr/B551011/KorService2'

/** 한 시간. 페이지의 revalidate와 맞춘다 */
const REVALIDATE = 3600

export interface LiveRow {
  contentId: string
  name: string
  startDate: string
  endDate: string
  imageUrl: string | null
  address: string | null
  tel: string | null
  lat: number | null
  lng: number | null
  areaCode: string | null
}

interface Item {
  contentid?: string
  title?: string
  eventstartdate?: string
  eventenddate?: string
  addr1?: string
  addr2?: string
  areacode?: string
  firstimage?: string
  firstimage2?: string
  mapx?: string
  mapy?: string
  tel?: string
}

interface Env {
  response?: { body?: { totalCount?: number; items?: '' | { item?: Item | Item[] } } }
}

/** '20260921' → '2026-09-21'. 형식이 어긋나면 빈 문자열 */
function dash(v?: string): string {
  if (!v || !/^\d{8}$/.test(v)) return ''
  return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`
}

function todayKst(): string {
  const now = new Date(Date.now() + 9 * 3600 * 1000)
  return now.toISOString().slice(0, 10).replace(/-/g, '')
}

function num(v?: string): number | null {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? n : null
}

/**
 * 지금 하는 축제와 앞으로 할 축제를 TourAPI에서 그대로 받는다.
 *
 * 실패하면 던지지 않고 빈 배열을 준다 — 공사 API가 잠깐 흔들려도 사이트는 DB 데이터로
 * 계속 뜨는 게 맞다. 심사 기간에 남의 서버 사정으로 화면이 비면 안 된다.
 */
export async function fetchLive(): Promise<LiveRow[]> {
  const key = process.env.TOURAPI_SERVICE_KEY
  if (!key) {
    console.warn('[tourapi-live] TOURAPI_SERVICE_KEY 없음 — 실시간 호출을 건너뛴다')
    return []
  }

  const from = todayKst()
  const rows = 100
  const out: LiveRow[] = []
  const seen = new Set<string>()

  try {
    let page = 1
    let total = Infinity
    // 상한을 둔다. totalCount가 이상하게 와도 무한히 돌지 않게.
    while ((page - 1) * rows < total && page <= 12) {
      const url =
        `${BASE}/searchFestival2?serviceKey=${key}&MobileOS=ETC&MobileApp=KOTA&_type=json` +
        `&eventStartDate=${from}&arrange=A&numOfRows=${rows}&pageNo=${page}`

      const res = await fetch(url, {
        next: { revalidate: REVALIDATE, tags: ['tourapi'] },
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const j = (await res.json()) as Env
      total = j.response?.body?.totalCount ?? 0
      const raw = j.response?.body?.items
      const items =
        raw && typeof raw === 'object' ? (Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []) : []
      if (items.length === 0) break

      for (const it of items) {
        const id = it.contentid
        if (!id || seen.has(id)) continue
        seen.add(id)
        const s = dash(it.eventstartdate)
        const e = dash(it.eventenddate)
        if (!s || !e) continue // 날짜 없는 건 덮어쓸 값이 못 된다
        out.push({
          contentId: id,
          name: (it.title ?? '').trim(),
          startDate: s,
          endDate: e,
          imageUrl: it.firstimage || it.firstimage2 || null,
          address: [it.addr1, it.addr2].filter(Boolean).join(' ').trim() || null,
          tel: it.tel?.trim() || null,
          lat: num(it.mapy),
          lng: num(it.mapx),
          areaCode: it.areacode ?? null,
        })
      }
      page++
    }
  } catch (err) {
    console.warn(`[tourapi-live] 실시간 호출 실패 — DB 데이터로 진행: ${String(err).slice(0, 160)}`)
    return out // 중간까지 받은 건 살려 쓴다
  }

  return out
}

// ─────────────────────────────────────────────────────────────
// 전국문화축제표준데이터(공공데이터포털) — 두 번째 실시간 소스.
//
// TourAPI는 공사에 등록된 축제만 갖고 있다. 지자체가 직접 올리는 이쪽에는 소규모 축제가
// 훨씬 많다. 커버리지의 실제 바닥은 여기가 만든다.
//
// 이 API에는 고유 id가 없어서 '이름+시작일'로 키를 만든다 — 파이프라인의 stdfest.ts와
// 같은 규칙이어야 DB에 이미 있는 행과 짝이 맞는다. 규칙을 바꾸면 전부 새 축제로 보인다.
// ─────────────────────────────────────────────────────────────

const STD_BASE = 'https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api'

const SIDO_RE =
  /^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s*(\S+)?/

interface StdItem {
  fstvlNm?: string
  fstvlStartDate?: string
  fstvlEndDate?: string
  fstvlCo?: string
  rdnmadr?: string
  lnmadr?: string
  latitude?: string
  longitude?: string
  phoneNumber?: string
  homepageUrl?: string
}

interface StdEnv {
  header?: { resultCode?: string; resultMsg?: string }
  body?: { totalCount?: number; items?: StdItem[] | { item?: StdItem[] } }
}

export interface StdRow {
  key: string
  name: string
  startDate: string
  endDate: string
  sido: string | null
  sigungu: string | null
  address: string | null
  summary: string | null
  homepage: string | null
  tel: string | null
  lat: number | null
  lng: number | null
}

/** 파이프라인 stdfest.ts와 같은 키 규칙 — 어긋나면 중복이 생긴다 */
function stdKey(name: string, start: string): string {
  return `${name}-${start}`.replace(/\s+/g, '').slice(0, 80)
}

export async function fetchLiveStdfest(): Promise<StdRow[]> {
  const key = process.env.TOURAPI_SERVICE_KEY
  if (!key) return []

  const today = todayKst().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
  const rows = 1000
  const out: StdRow[] = []
  const seen = new Set<string>()

  try {
    let page = 1
    let total = Infinity
    while ((page - 1) * rows < total && page <= 6) {
      const url = `${STD_BASE}?serviceKey=${key}&pageNo=${page}&numOfRows=${rows}&type=json`
      const res = await fetch(url, {
        next: { revalidate: REVALIDATE, tags: ['stdfest'] },
        signal: AbortSignal.timeout(20_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const j = (await res.json()) as StdEnv
      const code = j.header?.resultCode
      if (code && code !== '00') throw new Error(j.header?.resultMsg ?? code)
      total = j.body?.totalCount ?? 0
      const raw = j.body?.items
      const items: StdItem[] = Array.isArray(raw) ? raw : (raw?.item ?? [])
      if (items.length === 0) break

      for (const it of items) {
        const name = it.fstvlNm?.trim()
        const s = it.fstvlStartDate?.slice(0, 10)
        const e = it.fstvlEndDate?.slice(0, 10)
        if (!name || !s || !e || e < today) continue // 끝난 건 안 받는다
        const k = stdKey(name, s)
        if (seen.has(k)) continue
        seen.add(k)
        const addr = (it.rdnmadr || it.lnmadr || '').trim()
        const m = addr.match(SIDO_RE)
        const lat = parseFloat(it.latitude ?? '')
        const lng = parseFloat(it.longitude ?? '')
        out.push({
          key: k,
          name,
          startDate: s,
          endDate: e,
          sido: m?.[1]?.replace('강원도', '강원특별자치도').replace('전라북도', '전북특별자치도') ?? null,
          sigungu: m?.[2] ?? null,
          address: addr || null,
          summary: it.fstvlCo?.trim() || null,
          homepage: it.homepageUrl?.trim() || null,
          tel: it.phoneNumber?.trim() || null,
          lat: Number.isFinite(lat) && lat > 30 ? lat : null,
          lng: Number.isFinite(lng) && lng > 120 ? lng : null,
        })
      }
      page++
    }
  } catch (err) {
    console.warn(`[stdfest-live] 실시간 호출 실패 — 받은 데까지 쓴다: ${String(err).slice(0, 160)}`)
    return out
  }

  return out
}

// ─────────────────────────────────────────────────────────────
// 구석구석 축제 포털(kfes) — 세 번째 실시간 소스이자 가장 알찬 소스.
//
// 615건 전부가 이미지·좌표·산문 개요·요금을 갖고 있다. 다른 소스는 이미지가 10% 안팎이고
// 개요도 조각이라 비교가 안 된다. 화면에 보이는 '축제답게 생긴 정보'는 대부분 여기서 온다.
//
// 다만 공식 OpenAPI가 아니다 — 구석구석 웹페이지가 내부적으로 쓰는 주소다. 저쪽이 막거나
// 규약을 바꾸면 응답이 끊긴다. 그래서 두 가지를 지킨다.
//   1) 실패하면 받은 데까지만 쓰고 조용히 넘어간다. 다른 두 원천과 DB는 그대로 살아 있다.
//   2) 12건씩 52번을 순차로 부르면 페이지 재생성이 20초 가까이 걸린다. 4개씩 묶어 부르되
//      묶음 사이에 간격을 둔다 — 공사 서버에 예의는 지킨다.
// ─────────────────────────────────────────────────────────────

const KFES_URL = 'https://korean.visitkorea.or.kr/kfes/list/selectWntyFstvlList.do'
const KFES_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  Referer: 'https://korean.visitkorea.or.kr/kfes/list/wntyFstvlList.do',
  'Content-Type': 'application/x-www-form-urlencoded',
}

interface KfesItem {
  cmsCntntsId: number | string
  cntntsNm: string
  fstvlBgngDe: string
  fstvlEndDe: string
  areaNm?: string
  adres?: string
  dtadr?: string
  xcrdVal?: string | number | null
  ycrdVal?: string | number | null
  dispFstvlCntntsImgRout?: string | null
  posterImgRout?: string | null
  fstvlOutlCn?: string | null
  fstvlUtztFareInfo?: string | null
  fstvlHmpgUrl?: string | null
  fstvlAspcsTelno?: string | null
  fstvlMngtTelno?: string | null
}

export interface KfesRow {
  contentId: string
  name: string
  startDate: string
  endDate: string
  sido: string | null
  sigungu: string | null
  address: string | null
  imageUrl: string | null
  summary: string | null
  fee: string | null
  homepage: string | null
  tel: string | null
  lat: number | null
  lng: number | null
}

const kstrip = (html?: string | null) =>
  (html ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || null
const khref = (html?: string | null) => html?.match(/href="([^"]+)"/)?.[1] ?? null
const knum = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : null
}
// 개요 앞머리 운영 메모('*하기 축제(장) 먹거리 …*')는 소개글이 아니다. 떼어낸다.
const KOPS = /^\s*[\*※]\s*하기[^*※]*[\*※]\s*/
function kSummary(text: string | null): string | null {
  if (!text) return null
  const m = text.match(KOPS)
  return m ? text.slice(m[0].length).trim() || null : text
}

async function kfesPage(startIdx: number): Promise<{ total: number; list: KfesItem[] }> {
  const body = new URLSearchParams({
    startIdx: String(startIdx),
    searchType: 'A',
    searchDate: '',
    searchArea: '',
    searchCate: '',
    locationx: 'null',
    locationy: 'null',
  })
  const res = await fetch(KFES_URL, {
    method: 'POST',
    headers: KFES_HEADERS,
    body,
    next: { revalidate: REVALIDATE, tags: ['kfes'] },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`kfes ${res.status} @${startIdx}`)
  const j = (await res.json()) as { totalCnt?: number; resultList?: KfesItem[] }
  return { total: j.totalCnt ?? 0, list: j.resultList ?? [] }
}

export async function fetchLiveKfes(): Promise<KfesRow[]> {
  const out: KfesRow[] = []
  const seen = new Set<string>()
  // kfes는 지난 축제까지 전부 준다(TourAPI·표준데이터와 다른 점). 끝난 건 걸러야
  // 목록이 과거로 부풀지 않는다.
  const today = todayKst().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')

  const take = (list: KfesItem[]) => {
    for (const it of list) {
      const id = String(it.cmsCntntsId ?? '')
      const name = it.cntntsNm?.trim()
      if (!id || !name || seen.has(id)) continue
      const s = (it.fstvlBgngDe ?? '').replace(/\./g, '-')
      const e = (it.fstvlEndDe ?? '').replace(/\./g, '-')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) continue
      if (e < today) continue // 이미 끝난 축제
      seen.add(id)
      const [sido, sigungu] = (it.areaNm ?? '').split(/\s+/, 2)
      out.push({
        contentId: id,
        name,
        startDate: s,
        endDate: e,
        sido: sido || null,
        sigungu: sigungu || null,
        address: [it.adres, it.dtadr].filter(Boolean).join(' ').trim() || null,
        imageUrl: it.dispFstvlCntntsImgRout || it.posterImgRout || null,
        summary: kSummary(kstrip(it.fstvlOutlCn)),
        fee: kstrip(it.fstvlUtztFareInfo),
        homepage: khref(it.fstvlHmpgUrl),
        tel: it.fstvlAspcsTelno?.trim() || it.fstvlMngtTelno?.trim() || null,
        lat: knum(it.ycrdVal),
        lng: knum(it.xcrdVal),
      })
    }
  }

  try {
    // 첫 장으로 총 건수를 안다
    const first = await kfesPage(1)
    take(first.list)
    const total = first.total
    if (!total || first.list.length === 0) return out

    // 나머지를 4개씩 묶어 부른다. 상한 800건(=67장)까지만 — 응답이 이상해도 무한히 돌지 않게.
    const PER = 12
    const BATCH = 4
    const starts: number[] = []
    for (let i = 1 + PER; i <= Math.min(total, 800); i += PER) starts.push(i)

    for (let i = 0; i < starts.length; i += BATCH) {
      const chunk = starts.slice(i, i + BATCH)
      const pages = await Promise.all(
        chunk.map((idx) => kfesPage(idx).catch(() => ({ total, list: [] as KfesItem[] }))),
      )
      for (const p of pages) take(p.list)
      if (i + BATCH < starts.length) await new Promise((r) => setTimeout(r, 120))
    }
  } catch (err) {
    console.warn(`[kfes-live] 실시간 호출 실패 — 받은 ${out.length}건까지만 쓴다: ${String(err).slice(0, 160)}`)
    return out
  }

  return out
}
