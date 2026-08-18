import { cache } from 'react'
import { supabase } from './supabase'
import { DEFAULT_LANG, type Lang } from './i18n'

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

const SELECT = '*, festival_translations(*), festival_photos(*)'

export const allFestivals = cache(async (): Promise<Festival[]> => {
  // Supabase는 기본 1,000행에서 끊는다. 지금은 425건이지만 해가 쌓이면 넘어가므로 범위를 넓혀 둔다.
  const { data, error } = await supabase.from('festivals').select(SELECT).order('start_date').range(0, 19_999)
  if (error) throw new Error(`축제 조회 실패: ${error.message}`)
  return (data as unknown as Row[]).map(fromRow)
})

export const findByKey = cache(async (externalId: string): Promise<Festival | undefined> => {
  const { data, error } = await supabase.from('festivals').select(SELECT).eq('id', externalId).maybeSingle()
  if (error) throw new Error(`축제 조회 실패(${externalId}): ${error.message}`)
  return data ? fromRow(data as unknown as Row) : undefined
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

export type Status = 'ongoing' | 'upcoming' | 'ended'

export function statusOf(f: Festival, today = new Date()): Status {
  const t = new Date(today.toISOString().slice(0, 10)).getTime()
  const s = new Date(f.startDate).getTime()
  const e = new Date(f.endDate).getTime()
  if (t < s) return 'upcoming'
  if (t > e) return 'ended'
  return 'ongoing'
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

export function dayBadge(f: Festival, today = new Date()): DayBadge {
  if (isAlwaysOn(f)) return null
  const t = new Date(today.toISOString().slice(0, 10)).getTime()
  const s = new Date(f.startDate).getTime()
  const e = new Date(f.endDate).getTime()
  if (t > e) return null
  if (t >= s) return e === t ? { kind: 'endsToday' } : { kind: 'ongoing' }
  const days = Math.round((s - t) / DAY)
  return days <= 14 ? { kind: 'countdown', days } : null
}
