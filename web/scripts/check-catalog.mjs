import assert from 'node:assert/strict'

// Read-only deployment regression: compare actual public responses, not source patterns.
const origin = new URL(process.argv[2] ?? 'https://ko-ta.co.kr')
const read = async path => {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(60000) })
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`)
  return response.text()
}
const [home, list, sitemap] = await Promise.all(['/ko/', '/ko/festivals/', '/sitemap.xml'].map(read))
const number = (html, pattern) => {
  const hit = html.replace(/<!--.*?-->/gs, '').match(pattern)
  assert.ok(hit, 'Festival count missing in response')
  return Number(hit[1].replaceAll(',', ''))
}
const counts = {
  home: number(home, /전국 ([\d,]+)개 축제/),
  list: number(list, /축제 ([\d,]+)곳/),
  sitemap: [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(m=>new URL(m[1].replaceAll('&amp;', '&')).pathname)
    .filter(path=>/^\/ko\/festivals\/[^/]+\/$/.test(path)).length,
}
assert.ok(counts.home > 0, 'Empty catalog is not a valid successful deployment')
assert.equal(counts.home, counts.list, 'Home and default list disagree')
assert.equal(counts.home, counts.sitemap, 'Home and sitemap disagree')
console.log(JSON.stringify({ origin: origin.origin, counts, checkedAt: new Date().toISOString() }))
