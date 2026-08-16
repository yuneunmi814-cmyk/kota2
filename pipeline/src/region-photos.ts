import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { QuotaError, getJson, serviceKey, sleep } from './lib/http.js'

// ⛔ 파이프라인에서 뺐다(2026-08-17) — 화면에서 더 이상 쓰지 않는다.
//
// 지역 사진 폴백 — 한국관광공사 관광사진 API(포토코리아). 포스터가 없는 축제 카드를
// 그 지역 풍경 사진으로 메웠다(구례군 축제에 구례 화엄사 사진). 저작권은 가장 깨끗했고
// (공공누리 1유형) '지역 사진' 라벨도 달았지만, 폐기한 이유는 저작권이 아니라 정보다.
//
// 그 사진은 축제와 아무 상관이 없다. 415건 중 115건(27%)에 붙어 있었으니 카드 넉 장 중
// 한 장이 엉뚱한 사진이었고, 라벨을 달아도 대부분은 축제 사진으로 읽는다. 화면을 채우려고
// 오해를 만든 셈이다. 지금은 '포스터 준비 중'이라고 그대로 말한다.
//
// 되살리려면 package.json의 all에 region-photos를 되돌리고 Poster.tsx에 렌더를 복구한다.

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
      ? {
          // 포토코리아가 http URL을 주는 경우가 있다 — HTTPS 페이지에서 mixed content로 차단되므로
          // https로 바꿔 쓴다(같은 호스트가 https도 서비스한다, 실측)
          url: ok.galWebImageUrl!.replace(/^http:/, 'https:'),
          title: (ok.galTitle ?? '').trim(),
          photographer: (ok.galPhotographer ?? '').trim(),
        }
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
