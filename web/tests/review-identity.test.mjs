import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { reviewSourceIds, saveReview } from '../lib/review-identity.ts'
process.env.NEXT_PUBLIC_STABLE_REVIEW_IDS = '1'

const original = [
  { id: 1, festival_id: 'source:A', user_id: 'u1', rating: 5, body: 'A retained review', status: 'published', created_at: '2026-09-01', helpful: 0, profiles: { display_name: 'One', avatar_url: null } },
  { id: 2, festival_id: 'source:A', user_id: 'u2', rating: 3, body: 'Another retained review', status: 'published', created_at: '2026-09-02', helpful: 0, profiles: { display_name: 'Two', avatar_url: null } },
]
function load() {
  const reviews = structuredClone(original)
  const calls = []
  const tables = { reviews, festival_sources: [{ external_id: 'source:A', festival_uid: 'uid-1' }, { external_id: 'source:B', festival_uid: 'uid-1' }], festival_rating: [{ festival_id: 'source:A', rating: 4, review_count: 2 }], festival_rating_uid: [{ festival_uid: 'uid-1', rating: 4, review_count: 2 }] }
  const sb = { from(table) {
    calls.push(table)
    let filters = [], single = false, payload, mode
    const q = { select() { return q }, eq(k,v) { filters.push(r => r[k] === v); return q }, in(k,v) { filters.push(r => v.includes(r[k])); return q },
      order() { return q }, limit() { return q }, range() { return q }, maybeSingle() { single = true; return q },
      update(p) { payload = p; mode = 'update'; return q }, upsert(p) { payload = p; mode = 'upsert'; return q },
      then(resolve) {
        const data = tables[table].filter(r => filters.every(f => f(r)))
        if (mode === 'update') data.forEach(r => Object.assign(r, payload))
        if (mode === 'upsert') { const old = reviews.find(r => r.festival_id === payload.festival_id && r.user_id === payload.user_id); if (old) Object.assign(old,payload); else reviews.push({ id: 3, ...payload }) }
        resolve({ data: single ? data[0] ?? null : data, error: null })
      },
    }; return q
  } }
  const strip = url => stripTypeScriptTypes(readFileSync(url,'utf8')).replace(/^import .+\r?\n/gm, '').replace(/\bexport /g, '')
  const code = strip(new URL('../lib/reviews.ts', import.meta.url))
  const mod = new Function('cache','supabase','reviewSourceIds',code + ';return {reviewsOf,ratingOf};')(f=>f,sb,reviewSourceIds)
  return { ...mod, saveReview, sb, reviews, calls }
}
test('CR-03 A→B representative switch retains reviews and rating through source mapping', async () => {
  const m = load()
  assert.deepEqual((await m.reviewsOf('source:B')).map(r => r.id), [1,2])
  assert.deepEqual(await m.ratingOf('source:B'), { average: 4, count: 2 })
})

test('rating uses one legacy aggregate when disabled, exact UID aggregate when enabled', async () => {
  delete process.env.NEXT_PUBLIC_STABLE_REVIEW_IDS
  try {
    const legacy = load()
    assert.deepEqual(await legacy.ratingOf('source:A'), { average: 4, count: 2 })
    assert.deepEqual(legacy.calls, ['festival_rating'])
  } finally { process.env.NEXT_PUBLIC_STABLE_REVIEW_IDS = '1' }
  const stable = load()
  assert.deepEqual(await stable.ratingOf('source:B'), { average: 4, count: 2 })
  assert.deepEqual(stable.calls, ['festival_sources','festival_rating_uid'])
})
test('editing on B reuses user review on A instead of creating another source-scoped review', async () => {
  const m = load()
  await m.saveReview(m.sb, 'source:B', 'u1', 4, 'Updated existing review')
  assert.equal(m.reviews.length, 2)
  assert.equal(m.reviews[0].rating, 4)
  assert.equal(m.reviews[0].festival_id, 'source:A')
})

test('default staged rollout needs no mapping table; enabled mapping failure cannot create a duplicate', async () => {
  delete process.env.NEXT_PUBLIC_STABLE_REVIEW_IDS
  try {
    assert.deepEqual(await reviewSourceIds({ from() { throw Error('mapping table absent') } }, 'source:A'), ['source:A'])
  } finally { process.env.NEXT_PUBLIC_STABLE_REVIEW_IDS = '1' }
  let writes = 0
  const result = await saveReview({ from() { writes++; throw Error('connection unavailable') } }, 'source:B', 'u1', 4, 'Valid review body')
  assert.ok(result.error)
  assert.equal(writes, 1, 'only mapping lookup attempted; no fallback write')
})
