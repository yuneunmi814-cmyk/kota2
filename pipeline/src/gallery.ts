import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { QuotaError, getJson, serviceKey, sleep } from './lib/http.js'
import { mediaPriority, retryDue, runLimit, reusableGalleryType } from './lib/media.js'
import { normalizeName } from './lib/match.js'

// TourAPI detailImage2 gallery. Covers are not required when a CMS ID exists.
// Retry empty results, keep bounded request batches and retain per-photo rights metadata.
// Only an explicitly returned Type1 or Type3 license is accepted; missing codes are not permission.

const BASE = 'https://apis.data.go.kr/B551011/KorService2/detailImage2'
const CACHE = new URL('../data/gallery-cache.json', import.meta.url)
const DATA = new URL('../data/festivals.json', import.meta.url)
const MAX = 8 // 상세에서 보여줄 최대 장수 — 더 받아도 화면에 안 쓴다

interface Img { originimgurl?: string; smallimageurl?: string; imgname?: string; cpyrhtDivCd?: string }
interface Env {
  response?: { body?: { totalCount?: number; items?: '' | { item?: Img | Img[] } } }
}
type Cache = Record<string, { photos: NonNullable<Festival['photos']>; checkedAt?: string; contentId?: string }>

async function fetchGallery(contentId: string) {
  const url = `${BASE}?serviceKey=${serviceKey()}&MobileOS=ETC&MobileApp=KOTA&_type=json&contentId=${contentId}&imageYN=Y&numOfRows=30`
  const j = await getJson<Env>(url)
  const raw = j.response?.body?.items
  const items = raw && typeof raw === 'object' ? (Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []) : []
  return items
    // 명시적인 Type1/Type3만. 미표기와 비영리 제한 유형은 자동 적용하지 않는다.
    .filter((x) => x.originimgurl && reusableGalleryType(x.cpyrhtDivCd))
    .slice(0, MAX)
    .map((x) => ({ url: x.originimgurl!, thumb: x.smallimageurl || x.originimgurl!, name: (x.imgname ?? '').trim(), copyrightType: x.cpyrhtDivCd!, source: 'TourAPI detailImage2' }))
}

const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {}
const items = (JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }).items

// kfes 아카이브로 붙인 이미지(imageFrom='past')도 contentId를 되찾을 수 있으면 갤러리를 받는다.
// kfes.cmsCntntsId == tourapi.contentid라 이름 정규화로 역추적된다.
const kfesRows: { name: string; tourapiId?: string | null }[] = existsSync(new URL('../data/raw/kfes.json', import.meta.url))
  ? (JSON.parse(readFileSync(new URL('../data/raw/kfes.json', import.meta.url), 'utf-8')) as { rows: typeof kfesRows }).rows
  : []
const kfesId = new Map<string, string>()
for (const r of kfesRows) if (r.tourapiId) kfesId.set(normalizeName(r.name), r.tourapiId)

const contentIdOf = (f: Festival) => f.tourapiId ?? kfesId.get(normalizeName(f.name)) ?? null

let calls = 0
let got = 0
try {
  // Empty sentinel responses can mean exhausted quota; never overwrite caches in that case.
  const sentinel = await getJson<Env>(`https://apis.data.go.kr/B551011/KorService2/searchKeyword2?serviceKey=${serviceKey()}&MobileOS=ETC&MobileApp=KOTA&_type=json&contentTypeId=12&keyword=${encodeURIComponent('경복궁')}&numOfRows=1`)
  const sentinelItems = sentinel.response?.body?.items
  if (!sentinelItems || typeof sentinelItems !== 'object' || !sentinelItems.item || (Array.isArray(sentinelItems.item) && !sentinelItems.item.length)) throw new QuotaError('센티넬 응답 없음 — 캐시 유지')
  for (const f of mediaPriority(items)) {
    if (calls >= runLimit(process.env.GALLERY_MAX_CALLS, 40)) break
    const cid = contentIdOf(f)
    if (!cid) continue
    const old = cache[f.externalId]
    if (old && old.contentId === cid && !retryDue(old.checkedAt, f, !!old.photos.length)) continue
    const photos = await fetchGallery(cid)
    calls += 1
    cache[f.externalId] = { photos, checkedAt: new Date().toISOString(), contentId: cid }
    if (photos.length) got += 1
    if (calls % 20 === 0) writeFileSync(CACHE, JSON.stringify(cache))
    await sleep(120)
  }
} catch (e) {
  if (e instanceof QuotaError) console.error(`✖ 쿼터 소진 — ${calls}회 호출 후 중단, 다음 실행이 이어서 합니다`)
  else throw e
}
writeFileSync(CACHE, JSON.stringify(cache))

// 적용
let applied = 0
let total = 0
for (const f of items) {
  const c = cache[f.externalId]
  if (!c?.photos.length) continue
  const licensed = c.photos.filter(p => reusableGalleryType(p.copyrightType))
  if (!licensed.length) continue
  const photos = [...(f.photos ?? []), ...licensed]
  f.photos = photos.filter((p, i) => photos.findIndex(x => x.url === p.url) === i)
  // Only a directly linked CMS ID can supply this edition's cover. Name archive lookups stay gallery-only.
  if (!f.imageUrl && f.tourapiId && c.contentId === f.tourapiId) {
    f.imageUrl = licensed[0]!.url
    f.imageFrom = 'own'
  }
  applied += 1
  total += c.photos.length
}
writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items }))
console.log(`▶ 갤러리 호출 ${calls}회 · 사진 있는 축제 ${got}건 → 적용 ${applied}건 · 총 ${total}장`)
