import { cache } from 'react'
import { supabase } from './supabase'
import { DEFAULT_LANG, type Lang } from './i18n'
import { fetchLive, fetchLiveStdfest, fetchLiveKfes } from './tourapi-live'
import { classifyThemes } from './classify-themes'
import { daysBetween, festivalStatus, todayKst, type FestivalStatus } from './date'
import { externalIdsToSlugs } from './festival-routes'

// 축제 데이터 접근 — Supabase에서 읽는다.
//
// 예전에는 data/festivals.json 파일 하나를 통째로 import했다(정적 내보내기 시절).
// 이제 DB를 읽지만 화면 쪽 코드는 그대로다 — 아래 fromRow가 DB 행을 예전 Festival 모양으로
// 되돌려 놓기 때문이다. 출처만 갈아끼우고 425건을 쓰는 컴포넌트 수십 개는 손대지 않았다.
//
// 조회는 react cache()로 감싼다. 한 페이지를 그리는 동안 목록·근처축제·테마수를 각각
// 부르더라도 DB에는 한 번만 간다. 여기에 페이지의 revalidate가 얹혀서, 실제 조회는
// 방문자 수와 무관하게 재생성 주기마다 한 번이다(축제 데이터는 주 1회만 바뀐다).

export interface Translation {
  langCode: string
  name: string
  summary?: string | null
  placeName?: string | null
}

export interface Festival {
  /** 원본 소스의 id — 식별에는 쓰지 않는다(환경마다 달라진다). externalId를 쓸 것 */
  id: string | number
  externalId: string
  name: string
  summary?: string | null
  startDate: string
  endDate: string
  sido?: string | null
  sigungu?: string | null
  address?: string | null
  imageUrl?: string | null
  imageFrom?: 'own' | 'past' | 'scraped' | null
  imageSource?: string | null
  regionPhoto?: { url: string; title: string; photographer: string } | null
  /** 'MF' = 문체부 지정 문화관광축제 */
  category?: string | null
  homepage?: string | null
  tel?: string | null
  /** kfes가 주는 것들 — 요금·프로그램·SNS. 다른 소스는 비어 있다 */
  fee?: string | null
  program?: string | null
  lineup?: string | null
  instagram?: string | null
  youtube?: string | null
  sources?: string[]
  lat?: number | null
  lng?: number | null
  popularity?: number
  /** 관광빅데이터 유입 배율 — 지난 회차 개최지 외지인 방문자 피크 ÷ 평소 */
  visitorLift?: number | null
  organizer?: string | null
  photos?: { url: string; thumb: string; name: string }[] | null
  booths?: { name: string; menu: { name: string; price: number | null }[] }[] | null
  boothsFromPastEdition?: boolean
  ageInfo?: string | null
  hours?: string | null
  themes?: string[]
  region?: { name: string } | null
  translations?: Translation[]
}

/** 축제 식별자는 언제나 externalId — 숫자 id는 환경마다 달라진다(이전 구현에서 겪은 버그) */
export const key = (f: Festival) => f.externalId

/** 주소에 쓰는 형태 — 콜론이 카카오 공유를 막는다. 자세한 사정은 lib/slug.ts */
export { toSlug, fromSlug } from './slug'

// 요금 — 셋으로 가른다. 둘이 아니라 셋인 이유는 '모른다'가 다수이기 때문이다.
//
// 425건 중 fee 값이 있는 건 125건뿐이다(29%). 나머지 300건은 공공 API가 요금을
// 안 준 것이지 공짜라는 뜻이 아니다. 그런데 화면은 `f.fee ?? '무료'` 로 그 300건을
// 전부 「무료」라고 단정하고 있었다. 지금도 틀렸고, 유료 티켓 축제를 싣기 시작하면
// 2만원짜리 행사를 공짜라고 알리는 일이 생긴다.
//
// 판정 규칙은 하나다 — '무료'라는 말이 들어 있으면 그건 입장료 이야기다.
// 실제 데이터로 검산했다:
//   "입장료 무료 (먹거리 유료)"          → free  (입장은 공짜, 부대비용은 따로 적혀 있다)
//   "무료입장 및 기타체험비 유료"          → free
//   "입장료 유료 (8,000원/시민 6,000원)"  → paid
//   "유료(2,000원)"                     → paid
export type FeeKind = 'free' | 'paid' | 'unknown'

export function feeKind(f: Pick<Festival, 'fee'>): FeeKind {
  const s = f.fee?.trim()
  if (!s) return 'unknown'
  return /무료|free/i.test(s) ? 'free' : 'paid'
}

// 누가 여는가 — 공공이 연 것인가, 우리가 직접 확인해 넣은 것인가.
//
// 가격과는 다른 축이다. 춘천 썸머워터 페스티벌은 8,000원이지만 지자체 축제이고,
// 무료 브랜드 행사도 있다. 가격으로 가르면 엉뚱하게 갈린다.
//
// 새 컬럼이 필요 없다 — sources 에 이미 답이 있다. 이 구분을 화면에 밝히는 것이
// 우리가 파는 것(데이터 신뢰)의 설명이기도 하다.
const PUBLIC_SOURCES = ['tourapi', 'kfes', 'stdfest']

export function isPublicData(f: Pick<Festival, 'sources'>): boolean {
  return (f.sources ?? []).some((s) => PUBLIC_SOURCES.includes(s))
}

/** DB 행(snake_case) → 화면이 쓰는 Festival(camelCase) */
interface Row {
  id: string
  name: string
  start_date: string
  end_date: string
  sido: string | null
  sigungu: string | null
  address: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
  image_from: string | null
  image_source: string | null
  summary: string | null
  program: string | null
  lineup: string | null
  fee: string | null
  homepage: string | null
  instagram: string | null
  youtube: string | null
  tel: string | null
  category: string | null
  organizer: string | null
  booths: Festival['booths']
  booths_from_past: boolean | null
  age_info: string | null
  hours: string | null
  themes: string[] | null
  popularity: number | null
  visitor_lift: number | null
  sources: string[] | null
  tourapi_id: string | null
  festival_translations?: { lang: string; name: string | null; summary: string | null; place_name: string | null }[]
  festival_photos?: { ord: number; url: string; thumb: string | null; caption: string | null }[]
}

// 목록·달력·테마 화면이 실제로 쓰는 DB 필드만 읽는 행.
// 상세 소개·프로그램·부스·사진은 제외하되, 실시간 출처 병합에 필요한
// sources/tourapi_id는 남긴다.
interface SummaryRow {
  id: string
  name: string
  start_date: string
  end_date: string
  sido: string | null
  sigungu: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
  image_from: string | null
  category: string | null
  themes: string[] | null
  popularity: number | null
  sources: string[] | null
  tourapi_id: string | null
  festival_translations?: { lang: string; name: string | null; place_name: string | null }[]
}

function fromRow(r: Row): Festival {
  return {
    id: r.id,
    externalId: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    sido: r.sido,
    sigungu: r.sigungu,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    imageUrl: r.image_url,
    imageFrom: (r.image_from as Festival['imageFrom']) ?? null,
    imageSource: r.image_source,
    summary: r.summary,
    program: r.program,
    lineup: r.lineup,
    fee: r.fee,
    homepage: r.homepage,
    instagram: r.instagram,
    youtube: r.youtube,
    tel: r.tel,
    category: r.category,
    organizer: r.organizer,
    booths: r.booths ?? null,
    boothsFromPastEdition: r.booths_from_past ?? false,
    ageInfo: r.age_info,
    hours: r.hours,
    themes: r.themes ?? [],
    popularity: r.popularity ?? 0,
    visitorLift: r.visitor_lift,
    sources: r.sources ?? [],
    translations: (r.festival_translations ?? []).map((t) => ({
      langCode: t.lang,
      name: t.name ?? '',
      summary: t.summary,
      placeName: t.place_name,
    })),
    photos: (r.festival_photos ?? [])
      .sort((a, b) => a.ord - b.ord)
      .map((p) => ({ url: p.url, thumb: p.thumb ?? p.url, name: p.caption ?? '' })),
  }
}

function fromSummaryRow(r: SummaryRow): Festival {
  return {
    id: r.id,
    externalId: r.id,
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    sido: r.sido,
    sigungu: r.sigungu,
    lat: r.lat,
    lng: r.lng,
    imageUrl: r.image_url,
    imageFrom: (r.image_from as Festival['imageFrom']) ?? null,
    category: r.category,
    themes: r.themes ?? [],
    popularity: r.popularity ?? 0,
    sources: r.sources ?? [],
    translations: (r.festival_translations ?? []).map((t) => ({
      langCode: t.lang,
      name: t.name ?? '',
      placeName: t.place_name,
    })),
  }
}


// TourAPI 실시간 응답을 DB 데이터 위에 덮는다.
//
// DB는 우리가 쌓은 것(번역·보강 포스터·테마)을 갖고 있고, TourAPI는 원천이 지금 뭐라고
// 하는지를 갖고 있다. 겹치는 항목은 원천을 따른다 — 일정이 바뀌면 사람 손을 안 거치고
// 바로 반영되는 게 이 구조의 목적이다.
//
// 다만 덮어쓰지 않는 것이 있다:
//   - 이미지: DB 쪽이 사람이 찾아 넣은 공식 포스터인 경우가 많다(image_from='scraped').
//     TourAPI 이미지는 DB가 비어 있을 때만 채운다.
//   - 이름: 번역이 한국어 원문에 맞춰 붙어 있어서, 원문이 바뀌면 짝이 어긋난다.
//
// TourAPI에만 있고 DB에 없는 축제는 목록에 새로 넣는다. 번역이 없으므로 4개 언어에서
// 한국어 이름으로 보이지만, 없는 것보다는 낫다 — 다음 파이프라인 실행 때 번역이 붙는다.
async function overlayLive(base: Festival[], rows: Array<{ tourapi_id: string | null }>): Promise<Festival[]> {

  // 두 원천을 동시에 부른다. 하나가 늦어도 다른 하나를 기다리게 하지 않는다.
  const [live, std, kfes] = await Promise.all([fetchLive(), fetchLiveStdfest(), fetchLiveKfes()])
  if (live.length === 0 && std.length === 0 && kfes.length === 0) return base // 셋 다 실패 — DB 그대로

  const today = todayKst()
  const byId = new Map(live.map((l) => [l.contentId, l]))
  const byStd = new Map(std.map((l) => [l.key, l]))
  const byKfes = new Map(kfes.map((l) => [l.contentId, l]))
  const usedTour = new Set<string>()
  const usedStd = new Set<string>()
  const usedKfes = new Set<string>()
  const dropped: number[] = []

  for (let i = 0; i < rows.length; i++) {
    const f = base[i]
    const ext = f.externalId

    // ── 구석구석(kfes) 쪽 ──
    //
    // 셋 중 가장 알찬 소스라 먼저 덮는다. 이미지·개요·요금은 여기만 제대로 갖고 있다.
    // 다만 DB에 사람이 넣은 포스터가 있으면 그건 건드리지 않는다.
    const kid = ext.startsWith('kfes:') ? ext.slice(5) : rows[i].tourapi_id
    if (kid) {
      const k = byKfes.get(kid)
      if (k) {
        usedKfes.add(kid)
        f.startDate = k.startDate
        f.endDate = k.endDate
        if (!f.imageUrl && k.imageUrl) {
          f.imageUrl = k.imageUrl
          f.imageFrom = 'own'
          f.imageSource = 'ⓒ한국관광공사'
        }
        if (!f.summary && k.summary) f.summary = k.summary
        if (!f.fee && k.fee) f.fee = k.fee
        if (!f.address && k.address) f.address = k.address
        if (!f.tel && k.tel) f.tel = k.tel
        if (!f.homepage && k.homepage) f.homepage = k.homepage
        if (f.lat == null && k.lat != null) f.lat = k.lat
        if (f.lng == null && k.lng != null) f.lng = k.lng
        if (!f.sources?.includes('kfes')) f.sources = [...(f.sources ?? []), 'kfes']
      } else if (kfes.length > 0 && (f.sources ?? []).every((x) => x === 'kfes') && f.endDate >= today) {
        dropped.push(i)
        continue
      }
    }

    // ── TourAPI 쪽 ──
    const tid = rows[i].tourapi_id ?? (ext.startsWith('tourapi:') ? ext.slice(8) : null)
    if (tid) {
      const l = byId.get(tid)
      if (l) {
        usedTour.add(tid)
        f.startDate = l.startDate
        f.endDate = l.endDate
        if (!f.imageUrl && l.imageUrl) {
          f.imageUrl = l.imageUrl
          f.imageFrom = 'own'
          f.imageSource = 'ⓒ한국관광공사'
        }
        if (!f.address && l.address) f.address = l.address
        if (!f.tel && l.tel) f.tel = l.tel
        if (f.lat == null && l.lat != null) f.lat = l.lat
        if (f.lng == null && l.lng != null) f.lng = l.lng
        if (!f.sources?.includes('tourapi')) f.sources = [...(f.sources ?? []), 'tourapi']
        continue
      }
      // 원천에서 사라졌다.
      //
      // TourAPI만이 출처이고, 아직 안 끝난 축제인데 실시간 응답에 없다면 원천에서 내렸다는
      // 뜻이다(취소·연기·등록 철회). 그런 걸 계속 띄우면 헛걸음을 만든다.
      // 끝난 축제는 애초에 응답에 안 오므로 여기 걸리지 않게 endDate로 거른다.
      const onlyTour = (f.sources ?? []).every((x) => x === 'tourapi') && ext.startsWith('tourapi:')
      if (live.length > 0 && onlyTour && f.endDate >= today) {
        dropped.push(i)
        continue
      }
    }

    // ── 표준데이터 쪽 ──
    if (ext.startsWith('stdfest:')) {
      const l = byStd.get(ext.slice(8))
      if (l) {
        usedStd.add(l.key)
        f.startDate = l.startDate
        f.endDate = l.endDate
        if (!f.address && l.address) f.address = l.address
        if (!f.tel && l.tel) f.tel = l.tel
        if (!f.homepage && l.homepage) f.homepage = l.homepage
        if (f.lat == null && l.lat != null) f.lat = l.lat
        if (f.lng == null && l.lng != null) f.lng = l.lng
      } else if (std.length > 0 && (f.sources ?? []).every((x) => x === 'stdfest') && f.endDate >= today) {
        dropped.push(i)
      }
    }
  }

  const drop = new Set(dropped)
  const kept = base.filter((_, i) => !drop.has(i))

  // ── 원천에 새로 올라온 축제 ──
  const AREA: Record<string, string> = {
    '1': '서울특별시', '2': '인천광역시', '3': '대전광역시', '4': '대구광역시', '5': '광주광역시',
    '6': '부산광역시', '7': '울산광역시', '8': '세종특별자치시', '31': '경기도', '32': '강원특별자치도',
    '33': '충청북도', '34': '충청남도', '35': '경상북도', '36': '경상남도', '37': '전북특별자치도',
    '38': '전라남도', '39': '제주특별자치도',
  }
  // 이미 목록에 있는 축제 — 소스가 달라도 같은 축제면 두 번 넣지 않는다.
  //
  // 이름+시작일만으로 판정하던 것을 두 갈래로 넓힌다(BUG-01, 2026-08-23).
  //
  //  ① contentId — tourapi와 kfes는 같은 CMS라 숫자 id가 같다(파이프라인 merge.ts가 선 전제다).
  //     런타임 경로만 이 사실을 안 쓰고 있어서, 두 원천이 이름을 조금 다르게 주거나
  //     일정을 하루 어긋나게 주면 같은 축제가 tourapi:X와 kfes:X로 둘 다 들어갔다.
  //     전수조사에서 이렇게 갈라진 것이 8쌍이었다(수원 국가유산야행 / 수원 국가유산 야행 …).
  //  ② 정규화한 이름 + 시작일 — 회차·연도·'축제/페스티벌' 접미사와 공백·기호를 떼고 비교한다.
  //     전에는 원문 이름에서 공백만 지웠던 탓에 '수원 국가유산야행'과 '수원 국가유산 야행'처럼
  //     띄어쓰기 하나가 다른 것만 겨우 잡혔고, '제23회 …' 같은 회차 표기가 붙으면 놓쳤다.
  //
  // 시작일은 열쇠에 남긴다. 빼면 무창포처럼 한 해에 두 번 여는 축제가 한 건으로 합쳐진다
  // (파이프라인 merge.ts가 같은 이유로 기간을 반드시 함께 본다).
  //
  // ①이 있어도 ②를 남기는 이유: contentId가 없는 소스(stdfest·manual)끼리는 이름이 유일한 근거다.
  // 같은 축제인데 이름이 아예 다른 것 — 규칙으로는 못 잡아서 손으로 적는다.
  // pipeline/src/lib/match.ts의 SAME과 같은 표다. ⚠ 한쪽만 고치면 다시 갈라진다.
  const SAME: Record<string, string> = { 재즈in가평: '자라섬재즈' }

  const bareName = (s: string) => {
    const n = s
      .replace(/[(（[].*?[)）\]]/g, '')
      .replace(/제?\s*\d+\s*회/g, '')
      .replace(/20\d{2}\s*년?/g, '')
      .replace(/축제|페스티벌|페스타|한마당|문화제|축전/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '')
      .toLowerCase()
    return SAME[n] ?? n
  }

  /** tourapi:1916616 · kfes:1916616 → 1916616. 소스 접두사를 뗀 숫자 id */
  const contentIdOf = (f: Festival): string | null => {
    const m = f.externalId.match(/^(?:tourapi|kfes):(\d+)$/)
    return m ? m[1]! : null
  }

  const knownIds = new Set<string>()
  // 이름 → 그 이름으로 이미 잡혀 있는 기간들.
  //
  // 시작일이 정확히 같은지를 보던 것을 '기간이 겹치는지'로 바꾼다(2026-08-23 실측).
  // 같은 축제인데 원천마다 시작일을 다르게 주는 경우가 흔하다 — 안동국제탈춤은 TourAPI가
  // 9/24, 표준데이터가 9/25로 준다. 하루 차이로 같은 축제가 둘이 됐다. 이런 쌍이 7개였다.
  //
  // 그렇다고 이름만 보면 안 된다. 한 해에 두 번 여는 축제(무창포 신비의바닷길)와, 이름이
  // 사실상 같은 별개 행사(파주포크페스티벌 전야제 9/4 · 본공연 9/5)가 한 건으로 합쳐진다.
  // 기간이 겹치는지를 보면 둘 다 제자리를 지킨다 — 같은 축제는 날짜가 어긋나도 겹치고,
  // 다른 회차·다른 행사는 애초에 안 겹친다.
  const knownRanges = new Map<string, { s: string; e: string }[]>()

  const overlaps = (a: { s: string; e: string }, b: { s: string; e: string }) => !(a.e < b.s || b.e < a.s)

  const seenBefore = (f: Pick<Festival, 'name' | 'startDate' | 'endDate'>): boolean => {
    const n = bareName(f.name)
    if (!n) return false
    const range = { s: f.startDate, e: f.endDate }
    return (knownRanges.get(n) ?? []).some((r) => overlaps(r, range))
  }

  const remember = (f: Pick<Festival, 'name' | 'startDate' | 'endDate'>) => {
    const n = bareName(f.name)
    if (!n) return
    const list = knownRanges.get(n)
    if (list) list.push({ s: f.startDate, e: f.endDate })
    else knownRanges.set(n, [{ s: f.startDate, e: f.endDate }])
  }

  for (const f of kept) {
    const cid = contentIdOf(f)
    if (cid) knownIds.add(cid)
    remember(f)
  }
  // DB 행이 들고 있는 tourapi_id도 같은 열쇠다 — externalId가 kfes:… 인 행에도 붙어 있다
  for (const r of rows) if (r.tourapi_id) knownIds.add(String(r.tourapi_id))

  const fresh: Festival[] = []

  const push = (f: Festival, contentId?: string | null) => {
    if (contentId && knownIds.has(contentId)) return
    if (seenBefore(f)) return
    if (contentId) knownIds.add(contentId)
    remember(f)
    fresh.push(f)
  }

  for (const l of live) {
    if (usedTour.has(l.contentId) || !l.name) continue
    push({
      id: `tourapi:${l.contentId}`, externalId: `tourapi:${l.contentId}`, name: l.name,
      startDate: l.startDate, endDate: l.endDate,
      sido: l.areaCode ? (AREA[l.areaCode] ?? null) : null, sigungu: null,
      address: l.address, lat: l.lat, lng: l.lng,
      imageUrl: l.imageUrl, imageFrom: l.imageUrl ? 'own' : null,
      imageSource: l.imageUrl ? 'ⓒ한국관광공사' : null,
      summary: null, tel: l.tel, themes: classifyThemes(l.name), popularity: 0,
      sources: ['tourapi'], translations: [], photos: [],
    } as Festival, l.contentId)
  }

  for (const k of kfes) {
    if (usedKfes.has(k.contentId) || !k.name) continue
    push({
      id: `kfes:${k.contentId}`, externalId: `kfes:${k.contentId}`, name: k.name,
      startDate: k.startDate, endDate: k.endDate,
      sido: k.sido, sigungu: k.sigungu, address: k.address,
      lat: k.lat, lng: k.lng,
      imageUrl: k.imageUrl, imageFrom: k.imageUrl ? 'own' : null,
      imageSource: k.imageUrl ? 'ⓒ한국관광공사' : null,
      summary: k.summary, fee: k.fee, homepage: k.homepage, tel: k.tel,
      themes: classifyThemes(k.name, k.summary), popularity: 0,
      sources: ['kfes'], translations: [], photos: [],
    } as Festival, k.contentId)
  }

  for (const l of std) {
    if (usedStd.has(l.key) || !l.name) continue
    push({
      id: `stdfest:${l.key}`, externalId: `stdfest:${l.key}`, name: l.name,
      startDate: l.startDate, endDate: l.endDate,
      sido: l.sido, sigungu: l.sigungu, address: l.address,
      lat: l.lat, lng: l.lng,
      imageUrl: null, imageFrom: null, imageSource: null,
      summary: l.summary, tel: l.tel, homepage: l.homepage,
      themes: classifyThemes(l.name, l.summary), popularity: 0,
      sources: ['stdfest'], translations: [], photos: [],
    } as Festival)
  }

  if (fresh.length || drop.size) {
    console.info(`[live] 원천 동기화 — 추가 ${fresh.length}건, 내려간 축제 ${drop.size}건 제외 (기준 ${today})`)
  }
  return [...kept, ...fresh].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

const SELECT = '*, festival_translations(*), festival_photos(*)'
const SUMMARY_SELECT =
  'id, name, start_date, end_date, sido, sigungu, lat, lng, image_url, image_from, category, themes, popularity, sources, tourapi_id, festival_translations(lang, name, place_name)'

// 조회는 모듈 수준에서 한 번만 한다.
//
// react의 cache()는 '한 번의 렌더' 안에서만 중복을 없앤다. 그런데 빌드 때는 페이지마다
// 렌더가 따로여서, 444건 × 4언어 = 1,776 페이지가 각자 전체 목록을 다시 불렀다.
// Supabase 무료 플랜이 그 폭격을 견디지 못하고 `canceling statement due to statement
// timeout`으로 빌드를 깼다(2026-08-18, 축제가 424건이 된 시점). 축제가 늘수록 심해진다.
//
// 그래서 약속(Promise)을 모듈에 붙들어 둔다. 빌드 워커 하나가 한 번만 부르고 나머지
// 1,775 페이지는 그 결과를 나눠 쓴다. TTL을 두는 이유는 오래 사는 서버에서 낡은 데이터를
// 붙들고 있지 않기 위해서다 — 페이지 자체는 revalidate 3600으로 다시 굽히므로
// 60초면 충분하다.
const TTL = 60_000
let cached: { at: number; rows: Promise<Festival[]> } | null = null

// 경로 생성과 사이트맵에는 상세·번역·사진·실시간 보정이 필요 없다.
// ID만 읽는 작은 조회를 따로 두어 외부 API 장애가 공개 경로 목록까지 흔들지 않게 한다.
const SLUG_TTL = 3_600_000
let slugCached: { at: number; rows: Promise<string[]> } | null = null
let summaryCached: { at: number; rows: Promise<Festival[]> } | null = null

export function listFestivalSlugs(): Promise<string[]> {
  if (slugCached && Date.now() - slugCached.at < SLUG_TTL) return slugCached.rows

  const rows = (async () => {
    const CHUNK = 1_000
    const ATTEMPTS = 3
    const ids: string[] = []

    for (let from = 0; ; from += CHUNK) {
      let page: Array<{ id: string }> | null = null
      for (let i = 1; i <= ATTEMPTS; i++) {
        const { data, error } = await supabase
          .from('festivals')
          .select('id')
          .order('id')
          .range(from, from + CHUNK - 1)
        if (!error) {
          page = data as Array<{ id: string }>
          break
        }
        if (i === ATTEMPTS) throw new Error(`축제 경로 조회 실패(${from}~, ${ATTEMPTS}회): ${String(error.message).slice(0, 120)}`)
        await new Promise((r) => setTimeout(r, 400 * i))
      }
      if (!page || page.length === 0) break
      ids.push(...page.map((row) => row.id))
      if (page.length < CHUNK) break
    }

    return externalIdsToSlugs(ids)
  })()

  rows.catch(() => { if (slugCached?.rows === rows) slugCached = null })
  slugCached = { at: Date.now(), rows }
  return rows
}

/**
 * 목록·달력·테마 화면용 축제 요약.
 *
 * 상세 화면용 전량 조회와 같은 실시간 TourAPI 보정을 적용하므로
 * 상세와 카드가 다른 날짜를 말하지 않는다. 다만 카드에 안 쓰는 소개,
 * 프로그램, 부스, 사진 원문은 DB에서 가져오지 않는다.
 */
export function listFestivalSummaries(): Promise<Festival[]> {
  if (summaryCached && Date.now() - summaryCached.at < TTL) return summaryCached.rows

  const rows = (async () => {
    const CHUNK = 200
    const ATTEMPTS = 3
    const out: SummaryRow[] = []

    for (let from = 0; ; from += CHUNK) {
      let page: SummaryRow[] | null = null
      for (let i = 1; i <= ATTEMPTS; i++) {
        const { data, error } = await supabase
          .from('festivals')
          .select(SUMMARY_SELECT)
          .order('start_date')
          .order('id')
          .range(from, from + CHUNK - 1)
        if (!error) {
          page = data as unknown as SummaryRow[]
          break
        }
        if (i === ATTEMPTS) throw new Error(`축제 요약 조회 실패(${from}~, ${ATTEMPTS}회): ${String(error.message).slice(0, 120)}`)
        await new Promise((r) => setTimeout(r, 400 * i))
      }
      if (!page || page.length === 0) break
      out.push(...page)
      if (page.length < CHUNK) break
    }

    return overlayLive(out.map(fromSummaryRow), out)
  })()

  rows.catch(() => { if (summaryCached?.rows === rows) summaryCached = null })
  summaryCached = { at: Date.now(), rows }
  return rows
}

export function allFestivals(): Promise<Festival[]> {
  if (cached && Date.now() - cached.at < TTL) return cached.rows
  const rows = (async () => {
    // 한 번에 다 가져오지 않고 나눠 가져온다.
    //
    // 전량은 1.3MB다(축제 463건 + 번역 1,323 + 사진). 이걸 한 응답으로 받으면 빌드 중에만
    // 깨졌다 — 워커 9개가 모듈 캐시를 따로 들고 있어 같은 1.3MB를 아홉 번 동시에 당기는데,
    // 그때 본문이 중간에서 잘린다. 잘린 JSON을 postgrest-js가 파싱하지 못하고 원문을 그대로
    // error.message에 담아 던지는 바람에, 에러 메시지 자리에 축제 데이터가 찍혀 나와
    // 처음엔 무슨 일인지 알아보지 못했다(2026-08-19).
    //
    // 빌드 밖에서 같은 쿼리를 아홉 번 동시에 던지면 아홉 번 다 성공한다. Supabase나 쿼리의
    // 문제가 아니라 한 응답이 큰 것이 문제라, 조각으로 나눠 받는다. 요청 수는 늘지만 모듈
    // 캐시 덕에 워커당 한 번뿐이고, 조각마다 재시도가 붙어 한 조각이 잘려도 살아난다.
    // 축제 수와 번역·사진이 늘면서 150건 응답도 빌드 중 잘리기 시작했다(2026-09-01).
    // 한 요청의 본문을 절반 수준으로 낮춰 워커 9개가 동시에 읽어도 파싱 여유를 둔다.
    const CHUNK = 75
    const ATTEMPTS = 3
    const out: Row[] = []
    for (let from = 0; ; from += CHUNK) {
      let page: Row[] | null = null
      for (let i = 1; i <= ATTEMPTS; i++) {
        const { data, error } = await supabase
          .from('festivals')
          .select(SELECT)
          .order('start_date')
          // 같은 날 시작하는 축제가 많다. start_date만으로 페이지를 나누면 동점 행의
          // 순서가 요청마다 달라져 어떤 워커에서는 행이 빠지고 다른 행이 중복될 수 있다.
          // PK를 두 번째 기준으로 고정해 모든 빌드 워커가 같은 목록을 읽게 한다.
          .order('id')
          .range(from, from + CHUNK - 1)
        if (!error) {
          page = data as unknown as Row[]
          break
        }
        if (i === ATTEMPTS) throw new Error(`축제 조회 실패(${from}~, ${ATTEMPTS}회): ${String(error.message).slice(0, 120)}`)
        await new Promise((r) => setTimeout(r, 400 * i))
      }
      if (!page || page.length === 0) break
      out.push(...page)
      if (page.length < CHUNK) break
    }
    return overlayLive(out.map(fromRow), out)
  })()
  // 실패한 약속을 캐시에 남기면 TTL 동안 같은 오류만 되풀이한다
  rows.catch(() => { if (cached?.rows === rows) cached = null })
  cached = { at: Date.now(), rows }
  return rows
}

// 한 건 조회도 위 목록에서 꺼낸다.
//
// 전에는 페이지마다 별도 쿼리를 날렸다 — 그것만으로 빌드에 1,776번이었다.
// 어차피 전체를 이미 들고 있으므로 다시 물을 이유가 없다.
export const findByKey = cache(async (externalId: string): Promise<Festival | undefined> => {
  return (await allFestivals()).find((f) => f.externalId === externalId)
})

/** 그 언어로 보이는 이름·요약·지명. 번역이 없으면 한국어 원문으로 떨어진다 */
export function localized(f: Festival, lang: Lang) {
  if (lang === DEFAULT_LANG) {
    return { name: f.name, summary: f.summary ?? null, placeName: placeFallback(f) }
  }
  const t = f.translations?.find((x) => x.langCode === lang)
  return {
    name: t?.name || f.name,
    summary: t?.summary || f.summary || null,
    placeName: t?.placeName || placeFallback(f),
  }
}

function placeFallback(f: Festival): string | null {
  return [f.sido, f.sigungu].filter(Boolean).join(' ') || null
}

const DAY = 86_400_000

/**
 * 상시 운영 행사 — '지금 뭐하지'를 물을 때 답이 되지 못한다.
 * 기준을 300일로 잡는 이유: 1/1~12/31은 364일이라 '365일 이상'으로 하면 빠져나간다.
 * 실측으로 그 사이(300~364일)에 놓이는 축제는 전부 연중 상설 행사였다.
 */
/** 기간이 60일을 넘으면 축제라기보다 상설 프로그램·전시·투어다.
 * 실측 경계: 31~60일은 계절 축제(세미원 연꽃 53일, 춘천 썸머워터 45일, 태백 해바라기 32일),
 * 91일 넘어가면 상설 전시·정기공연·연간 투어가 대부분(41건). 목록에서 뒤로 보낸다. */
export function isLongRun(f: Festival): boolean {
  const days = (new Date(f.endDate).getTime() - new Date(f.startDate).getTime()) / 86_400_000 + 1
  return days > 60
}

export function isAlwaysOn(f: Festival): boolean {
  return new Date(f.endDate).getTime() - new Date(f.startDate).getTime() >= 300 * DAY
}

export type Status = FestivalStatus

export function statusOf(f: Festival, today = todayKst()): Status {
  return festivalStatus(f.startDate, f.endDate, today)
}

/** 축제가 걸쳐 있는 달(1~12) — 월별 필터는 kfes에 있고 우리에겐 없던 축이다 */
export function monthsOf(f: Festival): number[] {
  const s = new Date(f.startDate)
  const e = new Date(f.endDate)
  const out: number[] = []
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  while (cur <= e && out.length < 24) {
    out.push(cur.getMonth() + 1)
    cur.setMonth(cur.getMonth() + 1)
  }
  return [...new Set(out)]
}

/** 두 지점 사이 거리(km) */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/**
 * 시·도 안에서 방문객 배율 순위 — 트립어드바이저가 "서울의 즐길거리 1,619개 중 5위"를
 * 놓는 자리다. 그쪽 순위는 리뷰 평점에서 나오지만 우리에겐 리뷰가 없다. 대신 통신사
 * 방문자 실측(visitorLift)으로 매긴다. 근거의 성격이 다를 뿐 "이 지역에서 몇 번째로
 * 사람이 몰리는 축제인가"라는 질문에는 오히려 더 곧게 답한다.
 *
 * 배율이 없는 축제(전체의 23%)는 순위에서 빼고, 모수도 '배율이 있는 축제 수'로 센다 —
 * 425개 중 5위라고 해 놓고 실제로는 327개만 비교했다면 그 숫자가 거짓말이 된다.
 */
export async function regionRank(f: Festival): Promise<{ rank: number; total: number } | null> {
  if (f.visitorLift == null || !f.sido) return null
  const peers = (await allFestivals()).filter((x) => x.sido === f.sido && x.visitorLift != null)
  if (peers.length < 3) return null // 두셋 중 1위는 순위라 할 게 못 된다
  const sorted = [...peers].sort((a, b) => (b.visitorLift ?? 0) - (a.visitorLift ?? 0))
  const i = sorted.findIndex((x) => x.externalId === f.externalId)
  return i < 0 ? null : { rank: i + 1, total: sorted.length }
}

/**
 * 카드에 붙일 시간 뱃지 — T맵 「가볼만한 축제」가 쓰는 문법.
 *
 * '진행중'만으로는 급한 정도가 안 보인다. 오늘 끝나는 축제와 다음 주까지 하는 축제가
 * 같은 얼굴을 하고 있으면 여행자는 어느 쪽을 서둘러야 할지 모른다.
 *
 * 우선순위는 다급한 순이다: 오늘 끝남 > 곧 시작(D-N) > 진행중.
 * D-N은 2주 안쪽만 붙인다 — 'D-113'은 정보가 아니라 소음이다.
 */
export type DayBadge = { kind: 'endsToday' | 'countdown' | 'ongoing'; days?: number } | null

export function dayBadge(f: Festival, today = todayKst()): DayBadge {
  if (isAlwaysOn(f)) return null
  if (today > f.endDate) return null
  if (today >= f.startDate) return f.endDate === today ? { kind: 'endsToday' } : { kind: 'ongoing' }
  const days = daysBetween(today, f.startDate)
  return days <= 14 ? { kind: 'countdown', days } : null
}
