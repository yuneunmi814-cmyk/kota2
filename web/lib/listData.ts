import { dayBadge, isAlwaysOn, isLongRun, listFestivalSummaries, localized, monthsOf, statusOf, type Festival } from './festivals'
import type { Lang } from './i18n'
import {
  defaultOrder as applyDefaultOrder,
  filterListItems as applyListFilters,
  sortListItems as applyListSort,
  type ListFilters,
  type ListItem,
  type ListSort,
  type LocatedListItem,
} from './list-rules'

export {
  type ListFilters,
  type ListItem,
  type ListPeriod,
  type ListSort,
  type LocatedListItem,
} from './list-rules'

// 목록 화면에 넘길 최소 데이터.
//
// 왜 최소인가: 정적 내보내기라 목록 페이지 HTML에 전체 축제가 박힌다. 원본 JSON은
// 850KB이고 4개 언어판을 각각 찍으므로, 그대로 넣으면 페이지가 무거워진다.
// 필터·정렬·카드 표시에 실제로 쓰는 필드만 골라 언어별로 이미 번역된 문자열로 굳힌다.

export async function listItems(lang: Lang): Promise<ListItem[]> {
  return (await listFestivalSummaries()).map((f: Festival) => {
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
  return applyDefaultOrder(items)
}

/**
 * 목록 화면의 필터 규칙. 화면 상태나 브라우저 API를 읽지 않아
 * 같은 입력은 항상 같은 결과를 낸다.
 */
export function filterListItems(items: ListItem[], filters: ListFilters): ListItem[] {
  return applyListFilters(items, filters)
}

/** 날짜·거리·인기 정렬 규칙. 원본 배열은 바꾸지 않는다. */
export function sortListItems(
  items: ListItem[],
  sort: ListSort,
  coords: { lat: number; lng: number } | null,
): LocatedListItem[] {
  return applyListSort(items, sort, coords)
}
