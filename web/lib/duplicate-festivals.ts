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
  if (a.operatingWeekdays && b.operatingWeekdays && [...a.operatingWeekdays].sort().join(',') !== [...b.operatingWeekdays].sort().join(',')) return false
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
// Identity comes from persisted records, never image/content quality. The stable ID
// tie-breaker makes a group's representative independent of API response order.
// This is presentation grouping only; persistent source/route mappings remain in DB.
const imageScore = (f: Festival) => f.imageUrl ? f.imageFrom === 'past' ? 1 : 2 : 0
export function uniqueFestivals(items: Festival[], persistedIds: ReadonlySet<string> = new Set()): Festival[] {
  const ordered = [...items].sort((a,b) => Number(persistedIds.has(b.externalId)) - Number(persistedIds.has(a.externalId)) || a.externalId.localeCompare(b.externalId))
  const groups: Festival[][] = []
  for (const f of ordered) {
    const group = groups.find(g => g.every(x => sameEdition(x, f)))
    if (group) group.push(f)
    else groups.push([f])
  }
  return groups.map(group => {
    const primary = group[0]
    const media = [...group].sort((a,b) => imageScore(b)-imageScore(a))[0]
    const operating = group.find(f => f.operatingWeekdays)
    return {
      ...primary,
      // Copy the image and its provenance together, without replacing identity,
      // official text, coordinates, translations or other unrelated fields.
      ...(media.imageUrl ? {
        imageUrl: media.imageUrl, imageFrom: media.imageFrom, imageSource: media.imageSource,
        imageAttribution: media.imageAttribution, imageNotice: media.imageNotice,
      } : {}),
      ...(operating ? {operatingWeekdays: [...operating.operatingWeekdays!]} : {}),
      duplicateIds: [...new Set(group.flatMap(x => [x.externalId, ...(x.duplicateIds ?? [])]))].filter(id => id !== primary.externalId),
    }
  })
}

/** Curated IDs may refer to a hidden member; real IDs always take precedence. */
export function festivalIndex(items: Festival[]): Map<string, Festival> {
  const index = new Map(items.map(f => [f.externalId, f]))
  for (const f of items) for (const id of f.duplicateIds ?? []) if (!index.has(id)) index.set(id, f)
  return index
}
