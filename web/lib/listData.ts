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
