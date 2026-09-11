/** Shared by the web overlay and ingestion. Keep within web for web-only deployments. */
export interface ReviewedImageSet {
  startDate: string
  endDate: string
  reviewedAt: string
  rightsBasis: string
  attribution?: string
  notice?: string
  images: { url: string; from: string; w: number; h: number }[]
}
export type ReviewedImages = Record<string, ReviewedImageSet>
interface MediaFestival {
  externalId: string
  sourceIds?: string[]
  startDate: string
  endDate: string
  imageUrl?: string | null
  imageFrom?: 'own' | 'past' | 'scraped' | null
  imageSource?: string | null
  photos?: { url: string; thumb: string; name: string }[] | null
}
export function publicImageUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || (u.port && !['80', '443'].includes(u.port))) return null
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password ? u.href : null
  } catch { return null }
}
/** Only committed, fixed-name public assets may use relative URLs. */
export const localReviewedImage = (url: string) => /^\/festival-media\/[a-z0-9-]+\.(?:png|jpg|webp)$/.test(url)
export function reviewedFor(f: MediaFestival, entries: ReviewedImages): ReviewedImageSet | undefined {
  const matches = [...new Set([f.externalId, ...(f.sourceIds ?? [])])]
    .map(id => entries[id]).filter((x): x is ReviewedImageSet => !!x &&
      x.startDate === f.startDate && x.endDate === f.endDate && !!x.rightsBasis?.trim() &&
      Number.isFinite(Date.parse(x.reviewedAt)) && !!x.images?.length &&
      x.images.every(im => (!!publicImageUrl(im.url) || localReviewedImage(im.url)) && !!publicImageUrl(im.from) &&
        Number.isFinite(im.w) && Number.isFinite(im.h) && im.w >= 200 && im.h >= 200))
  // Multiple different source registrations need review; never choose an arbitrary winner.
  const distinct = [...new Map(matches.map(x => [JSON.stringify(x), x])).values()]
  return distinct.length === 1 ? distinct[0] : undefined
}
/** Published registry contains only images whose content, edition and reuse terms were checked.
 * No DB mutation; live overlays cannot overwrite the reviewed display image afterwards. */
export function applyReviewedImages<T extends MediaFestival>(items: T[], entries: ReviewedImages): T[] {
  return items.map(f => {
    const set = reviewedFor(f, entries)
    if (!set) return f
    const image = set.images[0]!
    const photos = [...set.images.slice(1).map(im => ({url:im.url, thumb:im.url, name:'', source:im.from, rightsBasis:set.rightsBasis})), ...(f.photos ?? [])]
      .filter((p,i,all) => p.url !== image.url && all.findIndex(x => x.url === p.url) === i)
    return {...f, imageUrl:image.url, imageSource:image.from, imageFrom:'scraped', imageAttribution:set.attribution, imageNotice:set.notice, photos}
  })
}
