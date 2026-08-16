import { allFestivals, isAlwaysOn, isLongRun, localized, monthsOf, statusOf, type Festival } from './festivals'
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

export function listItems(lang: Lang): ListItem[] {
  return allFestivals().map((f: Festival) => {
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

/** 지역 필터 목록 — 실제 데이터에 있는 시·도만, 건수 많은 순 */
export function sidoOptions(): { sido: string; count: number }[] {
  const m = new Map<string, number>()
  for (const f of allFestivals()) {
    if (!f.sido) continue
    m.set(f.sido, (m.get(f.sido) ?? 0) + 1)
  }
  return [...m.entries()].map(([sido, count]) => ({ sido, count })).sort((a, b) => b.count - a.count)
}
