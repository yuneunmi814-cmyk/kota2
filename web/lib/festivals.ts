import raw from '@/data/festivals.json'
import { DEFAULT_LANG, type Lang } from './i18n'

// 축제 데이터 접근 — 빌드 시점에만 쓰인다(SSG).
//
// 파일 하나를 통째로 읽는 이유: 715건 850KB이라 메모리에 올려도 문제가 없고,
// 빌드 중 715 × 4개 언어 = 2,860장을 찍어내려면 어차피 전량이 필요하다.
// 런타임에는 이 모듈이 번들에 들어가지 않는다(서버 컴포넌트에서만 부른다).

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

const ALL = (raw as unknown as { items: Festival[] }).items

/** 축제 식별자는 언제나 externalId — 숫자 id는 환경마다 달라진다(이전 구현에서 겪은 버그) */
export const key = (f: Festival) => f.externalId

export function allFestivals(): Festival[] {
  return ALL
}

export function findByKey(externalId: string): Festival | undefined {
  return ALL.find((f) => f.externalId === externalId)
}

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
export function regionRank(f: Festival): { rank: number; total: number } | null {
  if (f.visitorLift == null || !f.sido) return null
  const peers = allFestivals().filter((x) => x.sido === f.sido && x.visitorLift != null)
  if (peers.length < 3) return null // 두셋 중 1위는 순위라 할 게 못 된다
  const sorted = [...peers].sort((a, b) => (b.visitorLift ?? 0) - (a.visitorLift ?? 0))
  const i = sorted.findIndex((x) => x.externalId === f.externalId)
  return i < 0 ? null : { rank: i + 1, total: sorted.length }
}
