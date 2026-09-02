import type { DayBadge } from './festivals.ts'
import { REGIONS } from './sido.ts'

export interface ListItem {
  k: string
  n: string
  p: string | null
  s: string
  e: string
  st: 'ongoing' | 'upcoming' | 'ended'
  al: boolean
  lr: boolean
  db: DayBadge
  mf: boolean
  m: number[]
  sd: string | null
  th: string[]
  img: string | null
  ip: boolean
  lat: number | null
  lng: number | null
  pop: number
}

export type ListPeriod = 'all' | 'ongoing' | 'upcoming' | 'weekend' | number
export type ListSort = 'date' | 'distance' | 'popularity'

export interface ListFilters {
  period: ListPeriod
  region: string | null
  sido: string | null
  theme: string | null
  graded: boolean
  query: string
  weekend: [string, string]
}

export interface LocatedListItem {
  f: ListItem
  km: number | null
}

/** 날짜순 기본 정렬 — 진행중 단기, 예정, 장기, 상시 순서. */
export function defaultOrder(items: ListItem[]): ListItem[] {
  const rank = (x: ListItem) => (x.al ? 3 : x.lr ? 2 : x.st === 'ongoing' ? 0 : 1)
  return [...items].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    return ra === 0 ? a.e.localeCompare(b.e) : a.s.localeCompare(b.s)
  })
}

/** 목록 화면의 필터 규칙. 같은 입력은 항상 같은 결과를 낸다. */
export function filterListItems(items: ListItem[], filters: ListFilters): ListItem[] {
  let out = items.filter((f) => f.st !== 'ended')

  if (filters.period === 'ongoing') out = out.filter((f) => f.st === 'ongoing' && !f.al)
  else if (filters.period === 'upcoming') out = out.filter((f) => f.st === 'upcoming')
  else if (filters.period === 'weekend') {
    const [sat, sun] = filters.weekend
    out = out.filter((f) => f.s <= sun && f.e >= sat && !f.al)
  } else if (typeof filters.period === 'number') {
    const month = filters.period
    out = out.filter((f) => f.m.includes(month) && !f.al)
  }

  if (filters.sido) out = out.filter((f) => f.sd === filters.sido)
  else if (filters.region) {
    const sidos = REGIONS.find((region) => region.key === filters.region)?.sidos ?? []
    out = out.filter((f) => f.sd != null && sidos.includes(f.sd))
  }

  if (filters.theme) out = out.filter((f) => f.th.includes(filters.theme as string))
  if (filters.graded) out = out.filter((f) => f.mf)

  const needle = filters.query.trim().toLowerCase()
  if (needle) out = out.filter((f) => `${f.n} ${f.p ?? ''}`.toLowerCase().includes(needle))
  return out
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const radius = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/** 날짜·거리·인기 정렬. 원본 배열은 바꾸지 않는다. */
export function sortListItems(
  items: ListItem[],
  sort: ListSort,
  coords: { lat: number; lng: number } | null,
): LocatedListItem[] {
  const located = items.map((f) => ({
    f,
    km:
      sort === 'distance' && coords && f.lat != null && f.lng != null
        ? distanceKm(coords, { lat: f.lat, lng: f.lng })
        : null,
  }))

  if (sort === 'distance' && coords) {
    return located.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))
  }
  if (sort === 'popularity') return located.sort((a, b) => b.f.pop - a.f.pop)

  const order = new Map(defaultOrder(items).map((f, index) => [f.k, index]))
  return located.sort((a, b) => (order.get(a.f.k) ?? 0) - (order.get(b.f.k) ?? 0))
}
