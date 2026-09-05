// Read-only regression probes: run from any directory with Node >= 22.13.
// node docs/reviews/2026-09-05_consulting-repro.mjs
// Loads current repository source; all database/API dependencies are in-memory mocks.
// No network, environment secrets, production writes, or product-source edits.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'

const source = stripTypeScriptTypes(readFileSync(new URL('../../web/lib/festivals.ts', import.meta.url), 'utf8'))
  .replace(/^import .+\r?\n/gm, '')
  .replace(/^export \{[\s\S]*?\} from [^\n]+\n/gm, '')
  .replace(/\bexport /g, '')

// Pure fixture dependencies intentionally exclude deduplication: there is only one live row.
// React cache is an identity wrapper, representing separate render/request cache scopes.
const calls = []
const supabase = {
  from(table) {
    const call = { table }
    calls.push(call)
    const query = {
      select(value) { call.select = value; return query },
      gte() { return query },
      order() { return query },
      range(from, to) { call.range = [from, to]; return query },
      eq(key, value) { call.eq = [key, value]; return query },
      limit() { return query },
      then(resolve) { resolve({ data: [], error: null }) },
    }
    return query
  },
}
const live = [{
  contentId: 'fixture-new', name: '검증용 새 축제',
  startDate: '2026-09-05', endDate: '2026-09-10',
  areaCode: '1', lat: 37, lng: 127,
}]
const build = new Function(
  'cache', 'supabase', 'fetchLive', 'fetchLiveStdfest', 'fetchLiveKfes',
  'classifyThemes', 'addDays', 'todayKst', 'externalIdsToSlugs',
  'bareName', 'buildAbsorbedIndex', 'isAbsorbed',
  source + ';return {findByKey,listFestivalSummaries,regionRank};',
)
function loadFreshModule() {
  return build(
    (fn) => fn, supabase, async () => live, async () => [], async () => [],
    () => [], (date) => date, () => '2026-09-05', (ids) => ids,
    (name) => name, () => new Map(), () => false,
  )
}

let mod = loadFreshModule()
const list = await mod.listFestivalSummaries()
const detail = await mod.findByKey('tourapi:fixture-new')
assert.ok(list.some((row) => row.externalId === 'tourapi:fixture-new'))
assert.equal(detail, undefined)
console.log(JSON.stringify({
  scenario: 'DB미등록 신규 축제: 목록 존재 / cold 상세 없음',
  listIDs: list.map((row) => row.externalId), detail: detail ?? null,
}))

calls.length = 0
mod = loadFreshModule()
await mod.regionRank({ externalId: 'fixture', sido: '서울특별시', visitorLift: 2 })
assert.ok(calls.some((call) => call.select.includes('festival_photos(*)') && call.range))
console.log(JSON.stringify({ scenario: '상세 순위 조회도 전체 사진·번역 조회', calls }))

calls.length = 0
mod = loadFreshModule()
for (let i = 0; i < 9; i++) await mod.findByKey('fixture-' + i)
const singleQueries = calls.filter((call) => call.eq).length
const fullQueries = calls.filter((call) => call.range).length
assert.equal(singleQueries, 8)
assert.equal(fullQueries, 1)
console.log(JSON.stringify({
  scenario: '빌드 조건 없이 프로세스 누적 9회째 전량 조회',
  singleQueries, fullQueries, last: calls.at(-1),
}))

console.log('3 existing-behavior probes reproduced. Assertions describe the current defects, not desired acceptance behavior.')
