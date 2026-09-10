import { reviewedFor, type ReviewedImages } from '../../../web/lib/reviewed-images.ts'
export { publicImageUrl as httpUrl, reviewedFor, type ReviewedImages, type ReviewedImageSet } from '../../../web/lib/reviewed-images.ts'
import type { Festival } from './types.js'
const DAY = 86_400_000
/** Missing legacy timestamps expire immediately. Upcoming failures retry in 3 days. */
export function retryDue(checkedAt: string | undefined, f: Pick<Festival, 'startDate' | 'endDate'>, success: boolean, now = Date.now()) {
  const checked = Date.parse(checkedAt ?? '')
  if (!Number.isFinite(checked)) return true
  const start = Date.parse(f.startDate)
  const end = Date.parse(f.endDate)
  const imminent = end >= now - DAY && start <= now + 30 * DAY
  return now - checked >= (success ? 30 : imminent ? 3 : 14) * DAY
}
export function mediaPriority<T extends Pick<Festival, 'startDate' | 'endDate'>>(items: T[], now = Date.now()): T[] {
  const score = (f: T) => Date.parse(f.endDate) < now - DAY ? Infinity : Math.max(0, Date.parse(f.startDate) - now)
  return [...items].sort((a, b) => score(a) - score(b))
}
export function runLimit(value: string | undefined, fallback = 40) {
  const n = Number(value)
  return value && Number.isInteger(n) && n >= 0 ? Math.min(n, 200) : fallback
}
/** Bounded, signature-based parser: works for extensionless URLs, rejects truncated headers. */
export function imageDimensions(b: Uint8Array): [number, number] {
  const d = new DataView(b.buffer, b.byteOffset, b.byteLength)
  const ascii = (at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n))
  if (b.length >= 24 && ascii(1, 3) === 'PNG' && b[0] === 137 && ascii(12, 4) === 'IHDR') return [d.getUint32(16), d.getUint32(20)]
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const kind = ascii(12, 4)
    if (kind === 'VP8X') return [1 + b[24]! + (b[25]! << 8) + (b[26]! << 16), 1 + b[27]! + (b[28]! << 8) + (b[29]! << 16)]
    if (kind === 'VP8 ' && b[23] === 157 && b[24] === 1 && b[25] === 42) return [d.getUint16(26, true) & 16383, d.getUint16(28, true) & 16383]
  }
  if (b.length >= 25 && ascii(0, 4) === 'RIFF' && ascii(8, 8) === 'WEBPVP8L' && b[20] === 47) {
    const bits = d.getUint32(21, true); return [(bits & 16383) + 1, ((bits >>> 14) & 16383) + 1]
  }
  if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    let i = 2
    while (i + 3 < b.length) {
      if (b[i] !== 255) { i++; continue }
      const marker = b[i + 1]!
      if (marker === 255 || marker === 0) { i++; continue }
      if (marker === 217 || marker === 218) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) { i += 2; continue }
      const size = d.getUint16(i + 2)
      if (size < 2 || i + 2 + size > b.length) break
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && size >= 8) return [d.getUint16(i + 7), d.getUint16(i + 5)]
      i += 2 + size
    }
  }
  return [0, 0]
}
export function applyReviewed(f: Festival, entries: ReviewedImages) {
  const c = reviewedFor(f, entries)
  if (!c) return false
  f.imageUrl = c.images[0]!.url; f.imageSource = c.images[0]!.from; f.imageFrom = 'scraped'
  const photos = [...c.images.slice(1).map(im => ({ url: im.url, thumb: im.url, name: '', source: im.from, rightsBasis: c.rightsBasis })), ...(f.photos ?? [])]
  f.photos = photos.filter((p, i) => p.url !== f.imageUrl && photos.findIndex(x => x.url === p.url) === i)
  return true
}

/** Explicit commercial-compatible codes accepted by this gallery; unknown/missing stay out. */
export const reusableGalleryType = (code: string | undefined) => code === 'Type1' || code === 'Type3'
