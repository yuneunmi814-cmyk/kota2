import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { applyCorrections } from '../src/lib/corrections.ts'

const { corrections } = JSON.parse(readFileSync(new URL('../data/seed/corrections.json', import.meta.url)))
const expected = [
  ['stdfest:포항흥해국가유산야행-2026-06-12', '2026-09-11', '2026-09-12'],
  ['stdfest:대한민국국향대전-2026-10-01', '2026-10-23', '2026-11-08'],
  ['stdfest:2026년제8회운정호수공원불꽃축제-2026-10-31', '2026-10-31', '2026-10-31'],
  ['manual:금강자연미술비엔날레-2026', '2026-09-12', '2026-11-08'],
  ['manual:manus3-서울-어텀-페스타-2026-09-19', '2026-09-18', '2026-11-29'],
]
for (const path of ['../data/festivals.json', '../../web/data/festivals.json']) {
  test(`approved 2026 official corrections apply to actual ${path} without changing external IDs`, () => {
    const { items } = JSON.parse(readFileSync(new URL(path, import.meta.url)))
    const original = JSON.stringify(items)
    const corrected = applyCorrections(items, corrections)
    for (const [id, start, end] of expected) {
      const row = corrected.find(f => f.externalId === id)
      assert.ok(row, id)
      assert.deepEqual([row.startDate, row.endDate], [start,end])
    }
    assert.equal(corrected.length, items.length)
    assert.equal(JSON.stringify(items), original, 'input export is not mutated')
  })
}
