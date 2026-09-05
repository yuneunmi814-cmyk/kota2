import assert from 'node:assert/strict'
import test from 'node:test'
import { measuredFetch } from '../lib/query-metrics.ts'
test('DB request metrics count success, HTTP failure and rejected transport without leaking URL/keys', async () => {
  const events = []
  for (const mode of ['ok','http-error','throw']) {
    const fetch = measuredFetch(async () => {
      if (mode === 'throw') throw Error('sensitive upstream payload')
      return new Response('', { status: mode === 'ok' ? 200 : 503 })
    }, event => events.push(event))
    try { await fetch('https://fixture.invalid?secret=hidden') } catch { /* expected transport rejection */ }
  }
  assert.equal(events.length, 3)
  assert.deepEqual(events.map(e => e.ok), [true,false,false])
  assert.ok(events.every(e => e.durationMs >= 0))
  assert.equal(JSON.stringify(events).includes('secret'), false)
})
