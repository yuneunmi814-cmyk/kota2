import { listFestivalSummaries, regionRank, type Festival } from './festivals'
import { ratingOf, reviewsOf } from './reviews'
import { nearbyFestivals } from './detail-view'

/** Data coordination belongs here; page.tsx retains routing/redirect and presentation. */
export async function loadDetailExtras(f: Festival) {
  const hasCoords = f.lat != null && f.lng != null
  const [rank, rating, reviews, candidates] = await Promise.all([
    regionRank(f), ratingOf(f.externalId), reviewsOf(f.externalId),
    hasCoords ? listFestivalSummaries() : Promise.resolve([]),
  ])
  return { rank, rating, reviews, hasCoords, nearby: nearbyFestivals(f, candidates) }
}
