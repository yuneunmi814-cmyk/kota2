import type { Festival } from './festivals.ts'
import { distanceKm } from './festival-fields.ts'

// Conservative presentation grouping: no DB IDs, reviews or routes are deleted.
// Only an exact edition and a matching locality can merge. Generic substring matches
// would collapse separate concerts and recurring editions, so use explicit aliases.
const aliases: Record<string, string> = {
  '차없는잠수교뚜벅뚜벅축제하반기': '차없는잠수교뚜벅뚜벅축제',
  '달성대구현대미술제동動흐르다머물다흐르다': '달성대구현대미술제',
  '달성대구현대미술제movementflowringerflux': '달성대구현대미술제',
  '계룡軍문화축제': '계룡군문화축제',
  '천안흥타령축제': '천안흥타령춤축제',
  '경북영주풍기인삼축제': '영주풍기인삼축제',
  '광주시남한산성문화제': '남한산성문화제',
}
function nameKey(name: string) {
  const n = name.replace(/제?\s*\d+\s*회/g, '').replace(/20\d{2}년?/g, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
  return aliases[n] ?? n
}
export function sameEdition(a: Festival, b: Festival): boolean {
  if (a.startDate !== b.startDate || a.endDate !== b.endDate || nameKey(a.name) !== nameKey(b.name)) return false
  if (a.sido && b.sido && a.sido !== b.sido) return false
  if (a.sigungu && b.sigungu && a.sigungu !== b.sigungu) return false
  if (a.sido && b.sido && a.sigungu && b.sigungu) return true
  const ids = [a.externalId,b.externalId]
  if (ids.includes('tourapi:3113583') && ids.includes('manual:manus3-차없는-잠수교-뚜벅뚜벅축제-하반기-2026-09-06') && a.sido === b.sido) return true
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    return distanceKm({lat:a.lat,lng:a.lng}, {lat:b.lat,lng:b.lng}) <= 3
  }
  return false // Missing place is not evidence of a shared event.
}
const score = (f: Festival) => (f.imageUrl ? f.imageFrom === 'past' ? 2 : 8 : 0) + (f.homepage ? 1 : 0) + (f.summary ? 1 : 0)
export function uniqueFestivals(items: Festival[]): Festival[] {
  const groups: Festival[][] = []
  for (const f of items) {
    const group = groups.find(g => g.every(x => sameEdition(x, f)))
    if (group) group.push(f)
    else groups.push([f])
  }
  return groups.map(group => {
    const sorted = [...group].sort((a,b) => score(b)-score(a) || a.externalId.localeCompare(b.externalId))
    const primary = sorted[0]
    return { ...primary, duplicateIds: group.flatMap(x => [x.externalId, ...(x.duplicateIds ?? [])]).filter(id => id !== primary.externalId) }
  })
}
