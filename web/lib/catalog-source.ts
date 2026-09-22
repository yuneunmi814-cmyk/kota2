import 'server-only'
import { unstable_cache } from 'next/cache'
import { connection } from 'next/server'
import { listFestivalSummaries } from './festivals'
import { activeCatalog } from './catalog'
import { todayKst } from './date'

// Keep one merged source snapshot in Next's cross-request Data Cache. A process-local
// cache alone lets separate page workers publish different counts from live API calls.
// Include the Korean date so yesterday's ended events cannot survive a date rollover.
const sharedCatalog = unstable_cache(
  async (day: string) => ({ day, items: await listFestivalSummaries() }),
  ['kota-active-catalog-v1'],
  { revalidate: 3600, tags: ['kota-catalog'] },
)

export async function currentCatalog() {
  // Do not freeze another copy into separately expiring home/list/sitemap HTML caches.
  // Only these catalog surfaces render per request; source queries stay cached above.
  // `connection` preserves explicit Data Cache entries, unlike force-no-store.
  await connection()
  const snapshot = await sharedCatalog(todayKst())
  return activeCatalog(snapshot.items, snapshot.day)
}
