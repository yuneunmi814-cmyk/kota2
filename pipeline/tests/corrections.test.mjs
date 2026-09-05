import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { applyCorrections } from '../src/lib/corrections.ts'

const source = readFileSync(new URL('../src/merge.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n')
const fragment = source.slice(source.indexOf('// ── 정정표'), source.indexOf('// ── 저장 + 리포트'))
function mergeFixture(merged, previous, corrections) {
  const context = vm.createContext({ URL, merged: structuredClone(merged), today: '2026-09-05', existsSync: () => true,
    readFileSync: url => JSON.stringify(String(url).endsWith('corrections.json') ? { corrections } : { items: previous }),
    normalizeName: n => n, periodsOverlap: (s,e,s2,e2) => !(e < s2 || e2 < s), applyCorrections, console: { log() {}, warn() {} },
  })
  vm.runInContext(stripTypeScriptTypes(fragment.replaceAll('import.meta.url', "'file:///fixture/src/merge.ts'")), context)
  return Array.from(context.merged)
}
const row = { externalId: 'manual:fixture', name: '검증 전용', startDate: '2026-09-01', endDate: '2026-09-30' }
test('CR-04 restored row receives official correction', () => {
  assert.equal(mergeFixture([], [row], [{ match: row.name, year: 2026, startDate: '2026-09-15' }])[0].startDate, '2026-09-15')
})
test('corrected end determines restoration eligibility in both directions', () => {
  assert.equal(mergeFixture([], [{ ...row, endDate: '2026-09-01' }], [{ match: row.name, endDate: '2026-09-30' }]).length, 1)
  assert.equal(mergeFixture([], [row], [{ match: row.name, endDate: '2026-09-02' }]).length, 0)
})
test('ambiguous name and different-year corrections cannot modify an arbitrary festival', () => {
  const out = mergeFixture([row, { ...row, externalId: 'manual:other' }], [], [{ match: row.name, startDate: '2026-09-15' }])
  assert.ok(out.every(f => f.startDate === '2026-09-01'))
  assert.equal(mergeFixture([{ ...row, startDate: '2027-09-01', endDate: '2027-09-30' }], [], [{ match: row.name, year: 2026, startDate: '2026-09-15' }])[0].startDate, '2027-09-01')
})
test('location correction updates region and clears obsolete coordinates; inconsistent location is rejected', () => {
  const base = { ...row, sido: '서울특별시', sigungu: '중구', address: '서울특별시 중구', lat: 37, lng: 127 }
  const c = { externalId: row.externalId, year: 2026, match: row.name, address: '부산광역시 해운대구', sido: '부산광역시', sigungu: '해운대구', lat: null, lng: null }
  const fixed = mergeFixture([base], [], [c])[0]
  assert.equal(fixed.address, '부산광역시 해운대구'); assert.equal(fixed.lat, null)
  assert.equal(mergeFixture([base], [], [{ ...c, sido: '서울특별시' }])[0].address, base.address)
})

test('conflicting duplicates, invalid dates and incomplete coordinates do not overwrite valid rows', () => {
  const corrections = [{ match: row.name, startDate: '2026-09-15' }, { match: row.name, startDate: '2026-09-16' }]
  assert.equal(mergeFixture([row], [], corrections)[0].startDate, row.startDate)
  assert.equal(mergeFixture([row], [], [{ match: row.name, startDate: '2026-02-30' }])[0].startDate, row.startDate)
  const located = { ...row, lat: 37, lng: 127 }
  assert.equal(mergeFixture([located], [], [{ match: row.name, lat: 35 }])[0].lat, 37)
})
