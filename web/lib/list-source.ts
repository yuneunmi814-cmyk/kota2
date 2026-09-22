import 'server-only'
import { currentCatalog } from './catalog-source'
import { dayBadge, isAlwaysOn, isLongRun, localized, monthsOf, statusOf, type Festival } from './festivals'
import type { Lang } from './i18n'
import type { ListItem } from './list-rules'

// 목록 화면에 넘길 최소 데이터.
//
// 왜 최소인가: 정적 내보내기라 목록 페이지 HTML에 전체 축제가 박힌다. 원본 JSON은
// 850KB이고 4개 언어판을 각각 찍으므로, 그대로 넣으면 페이지가 무거워진다.
// 필터·정렬·카드 표시에 실제로 쓰는 필드만 골라 언어별로 이미 번역된 문자열로 굳힌다.

export async function listItems(lang: Lang): Promise<ListItem[]> {
  return (await currentCatalog()).map((f: Festival) => {
    const L = localized(f, lang)
    return {
      k: f.externalId,
      n: L.name,
      p: L.placeName,
      s: f.startDate,
      wd: f.operatingWeekdays,
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
      imageNotice: f.imageNotice,
      lat: f.lat ?? null,
      lng: f.lng ?? null,
      pop: f.popularity ?? 0,
    }
  })
}

