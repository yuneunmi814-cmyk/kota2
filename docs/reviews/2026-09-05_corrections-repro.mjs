// Read-only audit: executes source fragments with in-memory fixtures only.
// These assertions document CURRENT defects, not desired regression behavior.
// Run: node docs/reviews/2026-09-05_corrections-repro.mjs
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { bareName, buildAbsorbedIndex, isAbsorbed } from '../../web/lib/absorbed.ts'

const webSource = readFileSync(new URL('../../web/lib/festivals.ts', import.meta.url), 'utf8')
const start = webSource.indexOf('async function overlayLive(')
const end = webSource.indexOf("const SELECT =", start)
assert.ok(start >= 0 && end > start, 'Source extraction boundary changed; update audit')
const fixture = { externalId: 'tourapi:fixture', name: '검증 전용', startDate: '2026-09-15', endDate: '2026-09-20', sources: ['tourapi'] }
const live = { contentId: 'fixture', name: fixture.name, startDate: '2026-09-18', endDate: '2026-09-20' }
const context = vm.createContext({
  fetchLive: async () => [live], fetchLiveStdfest: async () => [], fetchLiveKfes: async () => [],
  todayKst: () => '2026-09-05', bareName, buildAbsorbedIndex, isAbsorbed,
})
vm.runInContext(stripTypeScriptTypes(webSource.slice(start, end)), context)
const output = await context.overlayLive([structuredClone(fixture)], [{ tourapi_id: 'fixture' }], false)
assert.equal(output[0].startDate, '2026-09-18')
console.log('OVERLAY: corrected DB start 2026-09-15 becomes raw start', output[0].startDate)

const merge = readFileSync(new URL('../../pipeline/src/merge.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n')
const correctionStart = merge.indexOf('{\n  const cf =')
const revivalStart = merge.indexOf('// ── 지난 산출물 되살리기')
const saveStart = merge.indexOf('// ── 저장 + 리포트', revivalStart)
assert.ok(correctionStart >= 0 && revivalStart > correctionStart && saveStart > revivalStart, 'Source extraction boundary changed; update audit')
const prev = { externalId: 'manual:fixture', name: '검증 전용', startDate: '2026-09-01', endDate: '2026-09-30' }
const logs = []
const mergeContext = vm.createContext({
  URL, merged: [], today: '2026-09-05', existsSync: () => true,
  readFileSync: (url) => JSON.stringify(String(url).endsWith('corrections.json')
    ? { corrections: [{ match: '검증 전용', startDate: '2026-09-15' }] }
    : { items: [prev] }),
  normalizeName: (name) => name,
  periodsOverlap: (s, e, s2, e2) => !(e < s2 || e2 < s),
  console: { log: (...args) => logs.push(args.join(' ')) },
})
const fragment = merge.slice(correctionStart, saveStart).replaceAll('import.meta.url', "'file:///audit/src/merge.ts'")
vm.runInContext(stripTypeScriptTypes(fragment), mergeContext)
assert.equal(mergeContext.merged[0].startDate, '2026-09-01')
console.log('REVIVAL: correction requested 2026-09-15, revived output remains', mergeContext.merged[0].startDate)
console.log(logs.join('\n'))
