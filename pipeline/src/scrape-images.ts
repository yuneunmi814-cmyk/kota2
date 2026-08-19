import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { sleep } from './lib/http.js'

// 주최측·지자체 홈페이지에서 포스터/사진 수집.
//
// 공공 API가 커버하지 못하는 391건이 남는다. 그 축제들도 공식 홈페이지에는 포스터가 있다
// (의령 리치리치 → richrichfestival.com, 천안흥타령 → cheonanfestival.com).
// og:image부터 보고, 없거나 로고면 페이지 안에서 큰 이미지를 찾는다.
//
// ⚠ 저작권: 이 이미지들은 공공누리 같은 명시적 라이선스가 없다. 그래서 세 가지를 지킨다.
//   1) 원본을 우리 서버에 복제하지 않는다 — 주최측 URL을 그대로 참조한다(핫링크).
//      주최측이 파일을 내리면 우리 화면에서도 즉시 사라진다.
//   2) 이미지마다 출처 페이지 URL을 저장해 화면에 링크로 표기한다.
//   3) 변형하지 않는다 — 크롭·오버레이 없이 원본 비율로 보여준다.
//
// 로고 걸러내기가 핵심이다. 지자체 사이트의 og:image는 대부분 시청 공용 로고라
// 그대로 쓰면 카드가 전부 같은 로고로 채워진다. 세 겹으로 거른다:
//   ① 파일명·경로 패턴(logo, og-image, common, sns, symbol…)
//   ② 여러 축제에서 같은 URL이 나오면 공용 이미지 — 전부 버린다
//   ③ 실제 픽셀 크기 — 가로세로 500px 미만은 로고·아이콘이다

const DATA = new URL('../data/festivals.json', import.meta.url)
const CACHE = new URL('../data/scraped-images.json', import.meta.url)
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const BAD_PATH = /logo|og[-_]image|\/common\/|\/inc\/|sns|share|default|symbol|\/ci\/|\/bi\/|noimg|no_img|blank|spacer|icon|btn_|bullet|arrow|banner_top/i
const MIN_SIDE = 500

interface Found {
  url: string
  from: string // 어느 페이지에서 찾았나 — 화면에 출처로 표기
  w: number
  h: number
}
type Cache = Record<string, { images: Found[]; checkedAt: string }>

const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {}
const items = (JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }).items

function normUrl(raw: string): string | null {
  let u = raw.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  try {
    const p = new URL(u)
    return p.toString()
  } catch {
    return null
  }
}

async function get(url: string, maxBytes = 900_000): Promise<{ body: Uint8Array; finalUrl: string } | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20_000) })
    if (!res.ok || !res.body) return null
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let n = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      n += value.length
      if (n >= maxBytes) {
        await reader.cancel()
        break
      }
    }
    const body = new Uint8Array(n)
    let o = 0
    for (const c of chunks) {
      body.set(c.subarray(0, Math.min(c.length, n - o)), o)
      o += c.length
      if (o >= n) break
    }
    return { body, finalUrl: res.url || url }
  } catch {
    return null
  }
}

/** PNG/JPEG 헤더에서 크기 — 이미지를 다 받지 않고 앞부분만 본다 */
function dims(b: Uint8Array): [number, number] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50) return [dv.getUint32(16), dv.getUint32(20)]
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1
        continue
      }
      const m = b[i + 1]!
      if (m === 0xc0 || m === 0xc1 || m === 0xc2) return [dv.getUint16(i + 7), dv.getUint16(i + 5)]
      i += 2 + dv.getUint16(i + 2)
    }
  }
  return [0, 0]
}

async function imageInfo(url: string): Promise<[number, number]> {
  const r = await get(url, 200_000)
  return r ? dims(r.body) : [0, 0]
}

async function scrape(page: string): Promise<Found[]> {
  const r = await get(page)
  if (!r) return []
  const html = new TextDecoder('utf-8', { fatal: false }).decode(r.body)
  const base = r.finalUrl
  const cands: string[] = []

  // og:image 먼저 — 주최측이 대표로 지정한 이미지다
  const og =
    html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]*content=["']([^"']+)/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i)
  if (og?.[1]) cands.push(og[1])

  for (const m of html.matchAll(/<img[^>]+(?:data-src|data-original|src)=["']([^"']+)/gi)) cands.push(m[1]!)
  for (const m of html.matchAll(/background-image:\s*url\(["']?([^)"']+)/gi)) cands.push(m[1]!)

  const seen = new Set<string>()
  const out: Found[] = []
  for (const raw of cands) {
    if (out.length >= 4) break
    let abs: string
    try {
      abs = new URL(raw.replace(/&amp;/g, '&'), base).toString()
    } catch {
      continue
    }
    if (seen.has(abs)) continue
    seen.add(abs)
    if (!/\.(jpe?g|png|webp)(\?|$)/i.test(abs)) continue
    if (BAD_PATH.test(abs)) continue
    if (abs.startsWith('http://')) abs = abs.replace(/^http:/, 'https:') // 가능하면 https로
    const [w, h] = await imageInfo(abs)
    if (w >= MIN_SIDE && h >= MIN_SIDE) out.push({ url: abs, from: base, w, h })
  }
  return out
}

// ── 수집 ──────────────────────────────────────────────
const targets = items.filter((f) => !f.imageUrl && f.homepage && !cache[f.externalId])
console.log(`▶ 홈페이지 수집 대상 ${targets.length}건 (캐시 ${Object.keys(cache).length}건)`)

let done = 0
for (const f of targets) {
  const page = normUrl(f.homepage!)
  if (!page) {
    cache[f.externalId] = { images: [], checkedAt: new Date().toISOString() }
    continue
  }
  cache[f.externalId] = { images: await scrape(page), checkedAt: new Date().toISOString() }
  done += 1
  if (done % 10 === 0) {
    writeFileSync(CACHE, JSON.stringify(cache))
    process.stdout.write(`   ${done}/${targets.length}\n`)
  }
  await sleep(400) // 지자체 서버에 부담 주지 않는다
}
writeFileSync(CACHE, JSON.stringify(cache))

// ── 핫링크 검증 ────────────────────────────────────────
// 지자체 서버 상당수가 외부 Referer를 막는다(실측: 의령·거창·공주). 그래서 실제로
// 받아지는 것만 남긴다 — 우리 화면에서 못 받을 이미지를 넣어 두면 카드가 깨진다.
//
// 검사할 때의 Referer를 실제 요청과 맞춘다. 예전에는 우리 도메인을 보냈는데(그마저
// 옛 GitHub Pages 주소로 굳어 있었다), 지금은 포스터를 app/img 중계가 가져오고 그 중계는
// 원본 도메인을 Referer로 보낸다. 검사와 실제가 다르면 받아지는 이미지를 버리게 된다 —
// 실측으로 11장이 그렇게 버려지고 있었다(2026-08-19).
const SITE = 'https://ko-ta.co.kr/'
async function hotlinkOk(url: string): Promise<boolean> {
  // http:// 도 받는다.
  //
  // 예전에는 버렸다. HTTPS 페이지에서 mixed content로 차단되니 써도 안 보였기 때문이다
  // (실측: 춘천연극제·정조효문화제). 그런데 그 판단 때문에 https를 지원하지 않는 지자체·
  // 재단 사이트의 포스터가 통째로 버려지고 있었다 — 노을동요제는 A4 300dpi 원본이
  // 버젓이 올라와 있는데도 화면에는 자리채움만 나왔다.
  //
  // 이제 Poster가 http 주소를 Next 이미지 최적화기로 우회한다(components/Poster.tsx).
  // 서버가 가져와 우리 도메인에서 https로 내보내므로 브라우저가 차단할 이유가 없다.
  if (!/^https?:\/\//.test(url)) return false
  try {
    const res = await fetch(url, {
      // 중계(app/img/route.ts)와 같은 헤더 — 검사와 실제가 어긋나면 안 된다
      headers: { 'User-Agent': UA, Referer: new URL(url).origin + '/' },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return false
    const ct = res.headers.get('content-type') ?? ''
    if (!/^image\//i.test(ct)) return false
    const buf = new Uint8Array(await res.arrayBuffer())
    // 1KB 미만이면 차단 안내 이미지일 가능성이 높다
    // 크기는 수집할 때 이미 걸렀다(위 MIN_SIDE 검사). 여기서 또 dims를 돌리면 파서가
    // 못 읽는 형식에서 멀쩡한 포스터가 떨어진다 — 실측으로 여덟 장이 그렇게 버려지고
    // 있었다. 여기서 볼 것은 '지금도 받아지는가'뿐이다.
    return buf.length > 1024
  } catch {
    return false
  }
}

// ── 공용 이미지 제거: 여러 축제에서 같은 URL이 나오면 로고다 ────
const useCount = new Map<string, number>()
for (const v of Object.values(cache)) for (const im of v.images) useCount.set(im.url, (useCount.get(im.url) ?? 0) + 1)
const shared = new Set([...useCount].filter(([, n]) => n > 1).map(([u]) => u))

let applied = 0
let blocked = 0
for (const f of items) {
  const c = cache[f.externalId]
  if (!c) continue
  const candidates = c.images.filter((im) => !shared.has(im.url))
  if (!candidates.length || f.imageUrl) continue
  const good: Found[] = []
  for (const im of candidates) {
    if (await hotlinkOk(im.url)) good.push(im)
    else blocked += 1
  }
  if (!good.length) continue
  f.imageUrl = good[0]!.url
  f.imageFrom = 'scraped'
  f.imageSource = good[0]!.from
  if (good.length > 1) {
    f.photos = [...(f.photos ?? []), ...good.slice(1).map((im) => ({ url: im.url, thumb: im.url, name: '' }))]
  }
  applied += 1
}

writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items }))
console.log(`✔ 공용 이미지 ${shared.size}종 제외 · 핫링크 차단 ${blocked}장 제외 · 커버 이미지 적용 ${applied}건`)
console.log(`   최종 이미지 ${items.filter((f) => f.imageUrl).length}/${items.length}`)
