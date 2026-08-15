import type { RawFestival } from '../lib/types.js'

// 한국관광공사 구석구석 축제 포털(kfes) — 1순위 소스.
//
// 왜 1순위인가: 615건 전부 이미지·좌표·산문 개요·요금을 갖고 있다(2026-08-15 실측 100%).
// 다른 소스는 이미지가 8~13%뿐이고 개요가 '공연+체험' 조각이라 비교가 안 된다.
//
// 이전 구현이 놓친 것 두 가지:
//  1) 응답에 dispFstvlCntntsImgRout(이미지)·xcrdVal/ycrdVal(좌표)·fstvlOutlCn(개요)가
//     그대로 들어 있는데 그걸 무시하고 TourAPI detailCommon2로 우회하다 이미지를 놓쳤다.
//  2) 이름이 겹치면 '이미 있다'며 건너뛰어 kfes에만 있던 413건을 버렸다.
//     겹치는 것은 병합 단계에서 합치면 되지, 수집 단계에서 버릴 이유가 없다.
//
// 호출 규약(실측): POST, UA·Referer 필수, locationx/y는 문자열 'null'(빈 값이면 404),
// 12건/페이지 startIdx, searchType 'A'. cmsCntntsId == TourAPI contentid.

const URL = 'https://korean.visitkorea.or.kr/kfes/list/selectWntyFstvlList.do'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  Referer: 'https://korean.visitkorea.or.kr/kfes/list/wntyFstvlList.do',
  'Content-Type': 'application/x-www-form-urlencoded',
}

interface KfesItem {
  cmsCntntsId: number | string
  cntntsNm: string
  fstvlBgngDe: string // 2026.08.14
  fstvlEndDe: string
  areaNm?: string // '경상남도 김해시'
  adres?: string
  dtadr?: string
  xcrdVal?: string | number | null
  ycrdVal?: string | number | null
  dispFstvlCntntsImgRout?: string | null
  posterImgRout?: string | null
  fstvlOutlCn?: string | null
  fstvlProgrmCn?: string | null
  fstvlUtztFareInfo?: string | null
  fstvlHmpgUrl?: string | null // <a href="…"> 로 감싸여 온다
  instaUrl?: string | null
  ytbUrl?: string | null
  fstvlAspcsTelno?: string | null
  fstvlMngtTelno?: string | null
  fstvlClCd?: string | null
  fstvlAspcsNm?: string | null // 주최
  fstvlMngtNm?: string | null // 주관
  boothInfoList?: { boothName?: string; menuDetails?: string }[] | null
  vwngPsblAgeInfo?: string | null
  vwngRqmtTime?: string | null
}

// 부스 메뉴 — menuDetails가 JSON 객체를 쉼표로 이어붙인 문자열이라 배열로 감싸 파싱한다
function parseBooths(list?: { boothName?: string; menuDetails?: string }[] | null) {
  if (!list?.length) return null
  const out: { name: string; menu: { name: string; price: number | null }[] }[] = []
  for (const b of list) {
    const name = b.boothName?.trim()
    if (!name) continue
    let menu: { name: string; price: number | null }[] = []
    try {
      const arr = JSON.parse(`[${b.menuDetails ?? ''}]`) as { menuName?: string; menuPrice?: string }[]
      menu = arr
        .filter((m) => m.menuName?.trim())
        .map((m) => ({ name: m.menuName!.trim(), price: m.menuPrice && /^\d+$/.test(m.menuPrice) ? Number(m.menuPrice) : null }))
    } catch {
      /* 깨진 항목은 메뉴 없이 부스명만 */
    }
    out.push({ name, menu })
  }
  return out.length ? out : null
}

const toDate = (s: string) => s.replace(/\./g, '-')
const strip = (html?: string | null) => (html ?? '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || null
const hrefOf = (html?: string | null) => html?.match(/href="([^"]+)"/)?.[1] ?? null
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : null
}

async function page(startIdx: number): Promise<{ total: number; list: KfesItem[] }> {
  const body = new URLSearchParams({
    startIdx: String(startIdx),
    searchType: 'A',
    searchDate: '',
    searchArea: '',
    searchCate: '',
    locationx: 'null',
    locationy: 'null',
  })
  const res = await fetch(URL, { method: 'POST', headers: HEADERS, body })
  if (!res.ok) throw new Error(`kfes ${res.status} @${startIdx}`)
  const j = (await res.json()) as { totalCnt?: number; resultList?: KfesItem[] }
  return { total: j.totalCnt ?? 0, list: j.resultList ?? [] }
}

export async function fetchKfes(): Promise<RawFestival[]> {
  const out: RawFestival[] = []
  const seen = new Set<string>()
  let idx = 1
  let total = Infinity
  while (idx <= total) {
    const { total: t, list } = await page(idx)
    total = t
    if (list.length === 0) break
    for (const it of list) {
      const id = String(it.cmsCntntsId)
      if (seen.has(id)) continue
      seen.add(id)
      const [sido, sigungu] = (it.areaNm ?? '').split(/\s+/, 2)
      out.push({
        externalId: `kfes:${id}`,
        source: 'kfes',
        tourapiId: id, // 같은 CMS라 contentid와 동일
        name: it.cntntsNm.trim(),
        startDate: toDate(it.fstvlBgngDe),
        endDate: toDate(it.fstvlEndDe),
        sido: sido || null,
        sigungu: sigungu || null,
        address: [it.adres, it.dtadr].filter(Boolean).join(' ').trim() || null,
        lat: num(it.ycrdVal),
        lng: num(it.xcrdVal),
        imageUrl: it.dispFstvlCntntsImgRout || it.posterImgRout || null,
        summary: strip(it.fstvlOutlCn),
        program: strip(it.fstvlProgrmCn),
        fee: strip(it.fstvlUtztFareInfo),
        homepage: hrefOf(it.fstvlHmpgUrl),
        instagram: it.instaUrl?.trim() || null,
        youtube: it.ytbUrl?.trim() || null,
        tel: it.fstvlAspcsTelno?.trim() || it.fstvlMngtTelno?.trim() || null,
        category: it.fstvlClCd ?? null,
        organizer: [it.fstvlAspcsNm, it.fstvlMngtNm].map((v) => v?.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') || null,
        booths: parseBooths(it.boothInfoList),
        ageInfo: it.vwngPsblAgeInfo?.trim() || null,
        hours: it.vwngRqmtTime?.trim() || null,
      })
    }
    idx += 12
    await new Promise((r) => setTimeout(r, 120)) // 공사 서버에 예의
  }
  return out
}
