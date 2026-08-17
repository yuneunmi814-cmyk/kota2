import { allFestivals, dayBadge, isAlwaysOn, isLongRun, localized, monthsOf, statusOf, type DayBadge, type Festival } from './festivals'
import type { Lang } from './i18n'

// 목록 화면에 넘길 최소 데이터.
//
// 왜 최소인가: 정적 내보내기라 목록 페이지 HTML에 전체 축제가 박힌다. 원본 JSON은
// 850KB이고 4개 언어판을 각각 찍으므로, 그대로 넣으면 페이지가 무거워진다.
// 필터·정렬·카드 표시에 실제로 쓰는 필드만 골라 언어별로 이미 번역된 문자열로 굳힌다.

export interface ListItem {
  k: string // externalId
  n: string // 표시 이름(그 언어)
  p: string | null // 표시 지명(그 언어)
  s: string // startDate
  e: string // endDate
  st: 'ongoing' | 'upcoming' | 'ended'
  al: boolean // 상시 여부
  lr: boolean // 장기(60일 초과) — 상설 프로그램에 가깝다
  db: DayBadge // 오늘 종료 / D-N / 진행중
  mf: boolean // 문화관광축제 지정
  m: number[] // 걸쳐 있는 달
  sd: string | null // 시·도(지역 필터용, 한국어 정식명)
  th: string[] // 목적 테마
  img: string | null
  /** 지난 회차 포스터인가 */
  ip: boolean
  lat: number | null
  lng: number | null
  pop: number
}

export async function listItems(lang: Lang): Promise<ListItem[]> {
  return (await allFestivals()).map((f: Festival) => {
    const L = localized(f, lang)
    return {
      k: f.externalId,
      n: L.name,
      p: L.placeName,
      s: f.startDate,
      e: f.endDate,
      st: statusOf(f),
      al: isAlwaysOn(f),
      lr: isLongRun(f),
      db: dayBadge(f),
      mf: f.category === 'MF',
      m: monthsOf(f),
      sd: f.sido ?? null,
      th: f.themes ?? [],
      img: f.imageUrl ?? null,
      ip: f.imageFrom === 'past',
      lat: f.lat ?? null,
      lng: f.lng ?? null,
      pop: f.popularity ?? 0,
    }
  })
}

/** 날짜순 기본 정렬 — '가까운 날짜' 순.
 * 진행중(단기)은 곧 끝나는 순, 예정은 곧 시작하는 순, 장기 → 상시 순으로 뒤로.
 * 서버 fallback과 클라이언트 목록이 같은 순서를 써야 하이드레이션 때 화면이 안 튄다. */
export function defaultOrder(items: ListItem[]): ListItem[] {
  const rank = (x: ListItem) => (x.al ? 3 : x.lr ? 2 : x.st === 'ongoing' ? 0 : 1)
  return [...items].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    return ra === 0 ? a.e.localeCompare(b.e) : a.s.localeCompare(b.s)
  })
}
