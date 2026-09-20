import { httpUrl } from './media.js'
/** These are review candidates, never an assertion of event relevance or permission. */
export function extractImageCandidates(html: string, page: string): string[] {
  const candidates: string[] = []
  const decode = (v: string) => v.replace(/&amp;/g, '&').replace(/&#38;/g, '&')
  for (const match of html.matchAll(/<(meta|img|a)\b([^>]+)>/gi)) {
    const attrs: Record<string, string> = {}
    for (const attr of match[2]!.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[attr[1]!.toLowerCase()] = attr[2] ?? attr[3] ?? attr[4] ?? ''
    const tag = match[1]!.toLowerCase()
    let raw = tag === 'meta' && /^(og:image|twitter:image)$/.test(attrs.property ?? attrs.name ?? '') ? attrs.content : tag === 'img' ? attrs['data-src'] ?? attrs['data-original'] ?? attrs.src : tag === 'a' && /\.(?:jpe?g|png|webp)(?:[?#]|$)|download|attach|fileDown/i.test(attrs.href ?? '') ? attrs.href : undefined
    if (!raw) continue
    try { const url = httpUrl(new URL(decode(raw), page).href); if (url && !/logo|noimg|no_img|spacer|icon|blank/i.test(new URL(url).pathname)) candidates.push(url) } catch { /* malformed candidate */ }
  }
  return [...new Set(candidates)]
}
/** Public DNS names from trusted source data; redirects rejected rather than following unreviewed destinations. */
export async function boundedPublicFetch(raw: string, limit: number): Promise<Uint8Array | null> {
  const url = httpUrl(raw)
  if (!url) return null
  try {
    const response = await fetch(url, { redirect: 'error', headers: { 'User-Agent': 'KOTA/1.0 (+https://ko-ta.co.kr)' }, signal: AbortSignal.timeout(12_000) })
    if (!response.ok || !response.body) { await response.body?.cancel(); return null }
    const reader = response.body.getReader()
    const out = new Uint8Array(limit)
    let length = 0
    try {
      while (length < limit) {
        const { value, done } = await reader.read()
        if (done) break
        const part = value.subarray(0, limit - length)
        out.set(part, length); length += part.length
      }
    } finally { await reader.cancel() }
    return out.subarray(0, length)
  } catch { return null }
}
