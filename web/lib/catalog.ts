import { statusOf } from './festival-fields.ts'
import { todayKst } from './date.ts'
import type { Festival } from './festivals.ts'

/** One catalog for home counts, default list and sitemap: current/upcoming editions,
 * including year-round events; one representative ID after source deduplication. */
export function activeCatalog(items: Festival[], today = todayKst()): Festival[] {
  const seen = new Set<string>()
  return items.filter(f => {
    if (statusOf(f, today) === 'ended' || seen.has(f.externalId)) return false
    seen.add(f.externalId)
    return true
  })
}
