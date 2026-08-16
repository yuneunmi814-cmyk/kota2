import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { QuotaError, getJson, serviceKey, sleep } from './lib/http.js'
import { normalizeName } from './lib/match.js'

// 축제 사진 갤러리 — TourAPI detailImage2.
//
// 커버 이미지가 있는 축제(220건)의 82%가 추가 사진을 갖고 있다(평균 5장, 최대 14장).
// 커버리지(391건 공백)는 1건도 줄지 않지만 상세 페이지 품질이 달라진다 — 지금은 사진 한 장뿐이라
// 트립어드바이저식 사진 그리드를 유튜브 썸네일과 지도로 메우고 있었다.
//
// 신규 키·신규 라이선스 없음. 쿼터는 개발계정 1,000회/일이고 전수 1회가 약 300회다.
// 캐시(data/gallery-cache.json)에 externalId로 저장해 매주 새 축제만 부른다.
//
// ⚠ 저작권: 이 사진들은 전부 공공누리 3유형(출처표시 + **변경금지**)이다(실측 1,095장 100%).
// 크롭·리사이즈·텍스트 오버레이는 2차적저작물 작성으로 볼 소지가 있어, 화면에서는 원본 비율을
// 유지하고(object-contain) CSS로만 표시 영역을 제어한다. 출처 표기도 화면에 붙인다.

const BASE = 'https://apis.data.go.kr/B551011/KorService2/detailImage2'
const CACHE = new URL('../data/gallery-cache.json', import.meta.url)
const DATA = new URL('../data/festivals.json', import.meta.url)
const MAX = 8 // 상세에서 보여줄 최대 장수 — 더 받아도 화면에 안 쓴다

interface Img { originimgurl?: string; smallimageurl?: string; imgname?: string; cpyrhtDivCd?: string }
interface Env {
  response?: { body?: { totalCount?: number; items?: '' | { item?: Img | Img[] } } }
}
type Cache = Record<string, { photos: { url: string; thumb: string; name: string }[] }>

async function fetchGallery(contentId: string) {
  const url = `${BASE}?serviceKey=${serviceKey()}&MobileOS=ETC&MobileApp=KOTA&_type=json&contentId=${contentId}&imageYN=Y&numOfRows=30`
  const j = await getJson<Env>(url)
  const raw = j.response?.body?.items
  const items = raw && typeof raw === 'object' ? (Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []) : []
  return items
    // 3유형이 아닌 게 섞여 나오면 쓰지 않는다 — 조건을 모르는 이미지는 안 싣는 게 맞다
    .filter((x) => x.originimgurl && (x.cpyrhtDivCd ?? 'Type3') === 'Type3')
    .slice(0, MAX)
    .map((x) => ({ url: x.originimgurl!, thumb: x.smallimageurl || x.originimgurl!, name: (x.imgname ?? '').trim() }))
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
  for (const f of items) {
    if (!f.imageUrl) continue // 커버가 없으면 갤러리도 없다
    if (cache[f.externalId]) continue
    const cid = contentIdOf(f)
    if (!cid) continue
    const photos = await fetchGallery(cid)
    calls += 1
    cache[f.externalId] = { photos }
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
  f.photos = c.photos
  applied += 1
  total += c.photos.length
}
writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items }))
console.log(`▶ 갤러리 호출 ${calls}회 · 사진 있는 축제 ${got}건 → 적용 ${applied}건 · 총 ${total}장`)
