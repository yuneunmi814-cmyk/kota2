import assert from 'node:assert/strict'
import test from 'node:test'

const clock = await import('../lib/poster-period.ts').catch(() => ({}))

test('poster art changes at each Korean six-hour boundary, independent of visitor timezone', () => {
  assert.equal(typeof clock.posterPeriod, 'function')
  for (const [instant, expected] of [
    ['2026-09-19T20:59:59.999Z', 'night'],
    ['2026-09-19T21:00:00.000Z', 'morning'],
    ['2026-09-20T02:59:59.999Z', 'morning'],
    ['2026-09-20T03:00:00.000Z', 'day'],
    ['2026-09-20T08:59:59.999Z', 'day'],
    ['2026-09-20T09:00:00.000Z', 'evening'],
    ['2026-09-20T14:59:59.999Z', 'evening'],
    ['2026-09-20T15:00:00.000Z', 'night'],
    ['2026-09-20T17:00:00-04:00', 'morning'],
  ]) assert.equal(clock.posterPeriod(Date.parse(instant)), expected, instant)
})

test('a mounted fallback schedules the next boundary, including Korean midnight', () => {
  assert.equal(typeof clock.untilNextPosterPeriod, 'function')
  assert.equal(clock.untilNextPosterPeriod(Date.parse('2026-09-20T02:59:59.999Z')), 1)
  assert.equal(clock.untilNextPosterPeriod(Date.parse('2026-09-20T03:00:00Z')), 21600000)
  assert.equal(clock.untilNextPosterPeriod(Date.parse('2026-09-20T14:30:00Z')), 1800000)
})
