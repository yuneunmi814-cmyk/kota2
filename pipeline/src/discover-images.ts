import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { httpUrl, imageDimensions, mediaPriority, retryDue, runLimit } from './lib/media.js'
import { boundedPublicFetch, extractImageCandidates } from './lib/image-candidates.js'
import { sleep } from './lib/http.js'

// Review queue only. No festivals.json changes, no publication, no license inference.
// Redirecting homepages must be corrected to their actual official URL before discovery.
const DATA = new URL('../data/festivals.json', import.meta.url)
const QUEUE = new URL('../data/image-candidates.json', import.meta.url)
type Entry = { externalId: string; name: string; startDate: string; endDate: string; source: string; checkedAt: string; status: 'needs-review' | 'none' | 'unreachable'; candidates: { url: string; w: number; h: number }[] }
const queue: Record<string, Entry> = existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, 'utf-8')) : {}
const items: Festival[] = JSON.parse(readFileSync(DATA, 'utf-8')).items
const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
let checked = 0
for (const f of mediaPriority(items.filter(f => !f.imageUrl && f.homepage && f.endDate >= today))) {
  if (checked >= runLimit(process.env.DISCOVER_MAX_ITEMS, 10)) break
  const page = httpUrl(f.homepage!.match(/^https?:/) ? f.homepage! : `https://${f.homepage}`)
  if (!page) continue
  const old = queue[f.externalId]
  if (old && old.source === page && old.startDate === f.startDate && old.endDate === f.endDate && !retryDue(old.checkedAt, f, old.candidates.length > 0)) continue
  const body = await boundedPublicFetch(page, 600_000)
  const candidates: Entry['candidates'] = []
  if (body) {
    const html = new TextDecoder().decode(body)
    for (const url of extractImageCandidates(html, page).slice(0, 6)) {
      const bytes = await boundedPublicFetch(url, 256_000)
      if (bytes) {
        const [w, h] = imageDimensions(bytes)
        if (w >= 200 && h >= 200) candidates.push({url, w, h})
      }
      await sleep(400)
    }
  }
  queue[f.externalId] = { externalId:f.externalId, name:f.name, startDate:f.startDate, endDate:f.endDate, source:page, checkedAt:new Date().toISOString(), status:!body ? 'unreachable' : candidates.length ? 'needs-review' : 'none', candidates }
  checked++
  writeFileSync(QUEUE, JSON.stringify(queue, null, 2))
  await sleep(400)
}
console.log(`▶ 공식 홈페이지 ${checked}건 탐색 · 검수 대기 ${Object.values(queue).filter(x => x.status === 'needs-review').length}건 · 축제 데이터 적용 없음`)
