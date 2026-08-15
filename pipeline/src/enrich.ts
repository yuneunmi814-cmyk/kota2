import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { QuotaError, getJson, serviceKey, sleep } from './lib/http.js'

// 보강 — 좌표·이미지가 없는 축제를 TourAPI 키워드 검색으로 채운다.
//
// 대상은 문체부(mcst)·표준데이터(stdfest)에서만 온 축제다. 이 둘은 이미지가 없고 좌표도
// 절반만 있다. 같은 축제의 **지난 회차**가 TourAPI에 등록돼 있는 경우가 많아, 이름으로
// 검색하면 그때 포스터·좌표를 얻는다.
//
// 오매칭이 최악이다 — 엉뚱한 도시의 '체육공원'에 좌표가 붙으면 거리순이 거짓말을 한다.
// 그래서 검색 결과의 주소가 이 축제의 시군구(없으면 시·도)와 일치할 때만 채택한다.
//
// 쿼터: 하루 한도가 있다. 소진되면 '정상 모양의 빈 응답'이 오므로(이전 실측 1,024회 헛호출)
// 먼저 반드시 있는 키워드로 살아 있는지 확인하고, 중간에 QuotaError가 나면 거기서 멈춘다.
// 멱등이라 다음 실행이 이어서 한다. 결과는 data/enrich-cache.json에 남겨 재호출을 줄인다.

const BASE = 'https://apis.data.go.kr/B551011/KorService2'
const CACHE = new URL('../data/enrich-cache.json', import.meta.url)
const DATA = new URL('../data/festivals.json', import.meta.url)

interface Hit { title: string; addr1?: string; mapx?: string; mapy?: string; firstimage?: string; contenttypeid?: string }
interface Env { response?: { body?: { items?: '' | { item?: Hit | Hit[] } } } }

const core = (v: string) => v.replace(/(특별자치도|특별자치시|특별시|광역시|도|시|군|구)$/, '')

async function search(keyword: string, contentTypeId?: number): Promise<Hit[]> {
  const url =
    `${BASE}/searchKeyword2?serviceKey=${serviceKey()}&MobileOS=ETC&MobileApp=KOTA&_type=json&numOfRows=10&arrange=A` +
    `&keyword=${encodeURIComponent(keyword)}${contentTypeId ? `&contentTypeId=${contentTypeId}` : ''}`
  const j = await getJson<Env>(url)
  const raw = j.response?.body?.items
  if (!raw || typeof raw !== 'object') return []
  return Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []
}

/** 검색어 — 회차·연도 떼고 앞 20자 */
const keywordOf = (name: string) => name.replace(/제?\s*\d+\s*회\s*/, '').replace(/^20\d\d년?\s*/, '').trim().slice(0, 20)

/** 결과 주소가 이 축제의 지역과 맞는가 */
function sameArea(hit: Hit, f: Festival): boolean {
  const addr = hit.addr1 ?? ''
  if (f.sigungu && addr.includes(core(f.sigungu))) return true
  if (!f.sigungu && f.sido && addr.includes(core(f.sido))) return true
  return false
}

const cache: Record<string, { lat?: number; lng?: number; imageUrl?: string; miss?: true }> = existsSync(CACHE)
  ? JSON.parse(readFileSync(CACHE, 'utf-8'))
  : {}
const items = (JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }).items

// 살아 있는지 — 경복궁은 반드시 나온다
if ((await search('경복궁', 12)).length === 0) {
  console.error('✖ TourAPI 쿼터 소진 또는 키 오류 — 보강 건너뜀(캐시만 적용)')
} else {
  let calls = 0
  let geo = 0
  let img = 0
  for (const f of items) {
    const needGeo = f.lat == null || f.lng == null
    const needImg = !f.imageUrl
    if (!needGeo && !needImg) continue
    const key = f.externalId
    if (cache[key]) continue // 이미 시도함(성공이든 miss든)
    try {
      const kw = keywordOf(f.name)
      // ① 축제(15)로 지난 회차 찾기 — 포스터·좌표 둘 다
      let hits = await search(kw, 15)
      calls += 1
      let hit = hits.find((h) => sameArea(h, f))
      // ② 없으면 장소로 — 좌표만
      if (!hit && needGeo && f.address) {
        const place = f.address.replace(f.sido ?? '', '').replace(f.sigungu ?? '', '').replace(/일원|일대|주변/g, '').trim().slice(0, 20)
        if (place) {
          hits = await search(place)
          calls += 1
          hit = hits.find((h) => sameArea(h, f))
        }
      }
      if (!hit) {
        cache[key] = { miss: true }
      } else {
        const lat = parseFloat(hit.mapy ?? '')
        const lng = parseFloat(hit.mapx ?? '')
        const c: (typeof cache)[string] = {}
        if (Number.isFinite(lat) && lat > 30) {
          c.lat = lat
          c.lng = lng
        }
        // 이미지는 축제(15) 결과에서만 — 관광지 사진을 축제 포스터로 쓰면 '엉뚱한 사진'이 된다
        if (hit.contenttypeid === '15' && hit.firstimage) c.imageUrl = hit.firstimage
        cache[key] = Object.keys(c).length ? c : { miss: true }
        if (c.lat && needGeo) geo += 1
        if (c.imageUrl && needImg) img += 1
      }
      await sleep(120)
    } catch (e) {
      if (e instanceof QuotaError) {
        console.error(`✖ 쿼터 소진 — ${calls}회 호출 후 중단, 다음 실행이 이어서 합니다`)
        break
      }
      cache[key] = { miss: true }
    }
  }
  console.log(`▶ 보강 호출 ${calls}회 · 좌표 +${geo} · 이미지 +${img}`)
}

// 캐시 적용
let appliedGeo = 0
let appliedImg = 0
for (const f of items) {
  const c = cache[f.externalId]
  if (!c || c.miss) continue
  if ((f.lat == null || f.lng == null) && c.lat != null) {
    f.lat = c.lat
    f.lng = c.lng ?? null
    appliedGeo += 1
  }
  if (!f.imageUrl && c.imageUrl) {
    f.imageUrl = c.imageUrl
    f.imageFrom = 'past' // 지난 회차 포스터 — 날짜가 박혀 있을 수 있어 화면에 뱃지로 알린다
    appliedImg += 1
  }
}
writeFileSync(CACHE, JSON.stringify(cache))
writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items }))
const n = items.length
console.log(`✔ 적용 좌표 ${appliedGeo} · 이미지 ${appliedImg} → 최종 좌표 ${items.filter((f) => f.lat != null).length}/${n} · 이미지 ${items.filter((f) => f.imageUrl).length}/${n}`)
