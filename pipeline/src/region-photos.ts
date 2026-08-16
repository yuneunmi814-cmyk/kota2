import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { QuotaError, getJson, serviceKey, sleep } from './lib/http.js'

// 지역 사진 폴백 — 한국관광공사 관광사진 API(포토코리아).
//
// 이미지가 없는 356건은 홈페이지도 없는 소규모 지역축제라 포스터를 구할 자동 경로가 없다.
// 대신 '그 지역이 어떤 곳인지'는 보여줄 수 있다 — 구례군 축제에 구례 화엄사 사진처럼.
//
// 이건 포스터가 아니다. 그래서 화면에 반드시 '지역 사진'이라고 밝히고, 카드에서도
// 포스터인 척하지 않는다. 여행자가 "이 축제 포스터가 이렇구나"라고 오해하면 안 된다.
//
// 저작권은 지금까지 중 가장 깨끗하다 — 공공누리 1유형(출처표시만, 상업이용·변경 허용).
// 촬영자 정보가 있으면 함께 표기한다.

const BASE = 'https://apis.data.go.kr/B551011/PhotoGalleryService1/gallerySearchList1'
const CACHE = new URL('../data/region-photos.json', import.meta.url)
const DATA = new URL('../data/festivals.json', import.meta.url)

interface Item {
  galTitle?: string
  galWebImageUrl?: string
  galPhotographyLocation?: string
  galPhotographer?: string
  galSearchKeyword?: string
}
interface Env {
  response?: { body?: { totalCount?: number; items?: '' | { item?: Item | Item[] } } }
}
type Cache = Record<string, { url: string; title: string; photographer: string } | null>

const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {}
const items = (JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }).items

/** '구례군' → '구례' — 포토코리아의 지역 표기는 접미사가 없는 경우가 많다 */
const core = (v: string) => v.replace(/(특별자치도|특별자치시|특별시|광역시|도|시|군|구)$/, '')

async function search(keyword: string): Promise<Item[]> {
  const url = `${BASE}?serviceKey=${serviceKey()}&MobileOS=ETC&MobileApp=KOTA&_type=json&numOfRows=20&pageNo=1&keyword=${encodeURIComponent(keyword)}`
  const j = await getJson<Env>(url)
  const raw = j.response?.body?.items
  const arr = raw && typeof raw === 'object' ? (Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []) : []
  return arr.filter((x) => x.galWebImageUrl)
}

let calls = 0
let found = 0
try {
  for (const f of items) {
    if (f.imageUrl || !f.sigungu) continue
    const key = `${f.sido ?? ''}|${f.sigungu}`
    if (key in cache) continue
    const hits = await search(core(f.sigungu))
    calls += 1
    // 지역이 맞는 것만 — '중구'처럼 흔한 이름이 다른 도의 사진을 물어오면 안 된다
    const sidoCore = f.sido ? core(f.sido) : ''
    const ok = hits.find((h) => {
      const loc = h.galPhotographyLocation ?? ''
      return loc.includes(core(f.sigungu!)) && (!sidoCore || loc.includes(sidoCore.slice(0, 2)) || loc.includes(core(f.sigungu!)))
    })
    cache[key] = ok
      ? { url: ok.galWebImageUrl!, title: (ok.galTitle ?? '').trim(), photographer: (ok.galPhotographer ?? '').trim() }
      : null
    if (ok) found += 1
    if (calls % 20 === 0) writeFileSync(CACHE, JSON.stringify(cache))
    await sleep(150)
  }
} catch (e) {
  if (e instanceof QuotaError) console.error(`✖ 쿼터 소진 — ${calls}회 호출 후 중단`)
  else throw e
}
writeFileSync(CACHE, JSON.stringify(cache))

let applied = 0
for (const f of items) {
  if (f.imageUrl || !f.sigungu) continue
  const c = cache[`${f.sido ?? ''}|${f.sigungu}`]
  if (!c) continue
  f.regionPhoto = c
  applied += 1
}

writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items }))
const still = items.filter((f) => !f.imageUrl && !f.regionPhoto).length
console.log(`▶ 지역 사진 호출 ${calls}회 · 시군구 매칭 ${found}곳 → 적용 ${applied}건 · 여전히 없음 ${still}건`)
