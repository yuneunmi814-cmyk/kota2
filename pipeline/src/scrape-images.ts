import { localReviewedImage } from '../../web/lib/reviewed-images.ts'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { applyReviewed, imageDimensions, mediaPriority, reviewedFor, retryDue, runLimit, type ReviewedImages } from './lib/media.js'
import { sleep } from './lib/http.js'

// Only edition-specific, manually reviewed URLs with documented reuse permission are published.
// A homepage image, source link or successful hotlink alone is not permission or event relevance.
// reviewed-images.json: { externalId: { startDate, endDate, reviewedAt, rightsBasis,
//   images: [{ url, from, w, h }] } }. No file means no newly approved external media.
const DATA = new URL('../data/festivals.json', import.meta.url)
const CACHE = new URL('../data/scraped-images.json', import.meta.url)
const REVIEWED = new URL('../../web/data/reviewed-images.json', import.meta.url)
const entries: ReviewedImages = existsSync(REVIEWED) ? JSON.parse(readFileSync(REVIEWED, 'utf-8')) : {}
const cache: Record<string, { checkedAt: string; approvedRevision?: string; valid?: boolean; images: unknown[] }> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {}
const data = JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }

async function validImage(url: string): Promise<boolean> {
  try {
    if (localReviewedImage(url)) {
      const bytes = readFileSync(new URL(`../../web/public${url}`, import.meta.url))
      const [w,h] = imageDimensions(bytes)
      return w >= 200 && h >= 200
    }
    const response = await fetch(url, { headers: { 'User-Agent': 'KOTA/1.0' }, redirect: 'error', signal: AbortSignal.timeout(15_000) })
    if (!response.ok || !response.body) { await response.body?.cancel(); return false }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let length = 0
    try {
      while (length < 256_000) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = value.subarray(0, 256_000 - length)
        chunks.push(chunk); length += chunk.length
      }
    } finally { await reader.cancel() }
    const bytes = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
    const [w, h] = imageDimensions(bytes)
    return w >= 200 && h >= 200
  } catch { return false }
}
let checked = 0
let applied = 0
for (const f of mediaPriority(data.items)) {
  const approved = reviewedFor(f, entries)
  if (!approved) continue
  const revision = JSON.stringify(approved)
  let cached = cache[f.externalId]
  if (!cached || cached.approvedRevision !== revision || retryDue(cached.checkedAt, f, !!cached.valid)) {
    if (checked >= runLimit(process.env.SCRAPE_MAX_ITEMS, 20)) continue
    let valid = true
    for (const image of approved.images) {
      if (!await validImage(image.url)) { valid = false; break }
      await sleep(400)
    }
    cached = { checkedAt: new Date().toISOString(), approvedRevision: revision, valid, images: approved.images }
    cache[f.externalId] = cached
    checked++
  }
  // Transient fetch failures don't erase a previously published/reviewed poster.
  if (cached.valid && applyReviewed(f, entries)) applied++
}
writeFileSync(CACHE, JSON.stringify(cache))
writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items: data.items }))
console.log(`▶ 검수 이미지 확인 ${checked}건 · 적용 ${applied}건 · 미검수 외부 이미지 자동 적용 안 함`)
