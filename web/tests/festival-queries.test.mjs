import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { bareName, buildAbsorbedIndex, isAbsorbed } from '../lib/absorbed.ts'
import { addDays } from '../lib/date.ts'
import { applyCorrections } from '../../pipeline/src/lib/corrections.ts'

const corrections = JSON.parse(readFileSync(new URL('../../pipeline/data/seed/corrections.json', import.meta.url))).corrections
const source = stripTypeScriptTypes(readFileSync(new URL('../lib/festivals.ts', import.meta.url), 'utf8'))
  .replace(/^import .+\r?\n/gm, '')
  .replace(/^export \{[\s\S]*?\} from [^\n]+\n/gm, '')
  .replace(/\bexport /g, '')

export function fixtureModule({ rows = [], live = [], correctionRows = corrections, failLive = false, build = false, sourceRows = [], sourceError = null } = {}) {
  let now = 0
  const calls = []
  const supabase = { from(table) {
    const call = { table, filters: [] }; calls.push(call)
    const query = {
      select(value) { call.select = value; return query },
      gte() { return query }, order() { return query },
      range(a, b) { call.range = [a, b]; return query },
      eq(k, v) { call.filters.push([k, v]); return query },
      in(k, v) { call.filters.push([k, v]); return query },
      limit() { return query },
      then(resolve) {
        if (table === 'festival_sources' && sourceError) return resolve({ data: null, error: sourceError })
        let data = (table === 'festival_sources' ? sourceRows : rows).filter(r => call.filters.every(([k,v]) => Array.isArray(v) ? v.includes(r[k]) : r[k] === v))
        if (call.range) data = data.slice(call.range[0], call.range[1] + 1)
        resolve({ data, error: null })
      },
    }; return query
  } }
  const dependencies = {
    cache: f => f, supabase,
    fetchLive: async () => { if (failLive) throw Error('injected unavailable source'); return live },
    fetchLiveStdfest: async () => [], fetchLiveKfes: async () => [],
    classifyThemes: () => [], addDays, todayKst: () => '2026-09-05', externalIdsToSlugs: ids => ids,
    bareName, buildAbsorbedIndex, isAbsorbed, applyCorrections,
    correctionData: { corrections: correctionRows },
    process: { env: { KOTA_BUILD_PRELOAD: build ? '1' : undefined } },
    Date: class extends Date { static now() { return now } },
  }
  return { calls, expire() { now += 60001 }, ...new Function(...Object.keys(dependencies), source + ';return {findByKey,listFestivalSummaries,listFestivalSlugs,regionRank,allFestivals};')(...Object.values(dependencies)) }
}

const fresh = { contentId: 'fixture-new', name: '검증용 새 축제', startDate: '2026-09-05', endDate: '2026-09-10', areaCode: '1', lat: 37, lng: 127 }
test('CR-01 cold/warm live-only detail agrees with listing and missing ID remains absent', async () => {
  const m = fixtureModule({ live: [fresh] })
  assert.equal((await m.listFestivalSummaries())[0].externalId, 'tourapi:fixture-new')
  assert.equal((await m.findByKey('tourapi:fixture-new'))?.name, fresh.name)
  await m.allFestivals()
  assert.equal((await m.findByKey('tourapi:fixture-new'))?.name, fresh.name)
  assert.equal(await m.findByKey('tourapi:absent'), undefined)
})

test('old source correction follows representative changes in cold card/detail, warm preload and rank', async () => {
  const rows = [
    { id: 'manual:representative', name: 'Moved event', tourapi_id: 'old', sido: '서울특별시', visitor_lift: 5 },
    { id: 'manual:peer', name: 'Peer', sido: '부산광역시', visitor_lift: 3 },
    { id: 'manual:peer2', name: 'Peer2', sido: '부산광역시', visitor_lift: 1 },
  ].map(r => ({ ...r, start_date: '2026-09-15', end_date: '2026-09-20' }))
  const sourceRows = [
    { external_id: 'tourapi:old', festival_uid: 'uid-a' },
    { external_id: 'manual:representative', festival_uid: 'uid-a' },
  ]
  const correctionRows = [{ externalId: 'tourapi:old', year: 2026, startDate: '2026-09-15', sido: '부산광역시', sigungu: '해운대구', address: '부산광역시 해운대구', lat: null, lng: null }]
  const options = { rows, sourceRows, correctionRows, live: [{ ...fresh, contentId: 'old', name: 'Moved event', startDate: '2026-09-18', endDate: '2026-09-20' }] }
  const m = fixtureModule(options)
  const detail = await m.findByKey('manual:representative')
  const card = (await m.listFestivalSummaries()).find(f => f.externalId === 'manual:representative')
  assert.equal(detail.startDate, '2026-09-15')
  assert.equal(card.startDate, '2026-09-15')
  assert.equal(detail.sido, '부산광역시')
  assert.deepEqual(await m.regionRank({ externalId: 'manual:peer', sido: '부산광역시', visitorLift: 3 }), { rank: 2, total: 3 })
  assert.equal(m.calls.filter(c => c.table === 'festival_sources').length, 2, 'card/detail/rank share the source-link cache')
  const build = fixtureModule({ ...options, build: true })
  assert.equal((await build.findByKey('manual:representative')).startDate, '2026-09-15')
  assert.equal((await build.findByKey('manual:representative')).sido, '부산광역시')
})

test('correction source pagination includes late representatives and refreshes after TTL', async () => {
  const rows = [{ id: 'manual:late', name: 'Late representative', tourapi_id: 'old', start_date: '2026-09-18', end_date: '2026-09-20' }]
  const sourceRows = [{ external_id: 'tourapi:old', festival_uid: 'uid-a' },
    ...Array.from({ length: 1000 }, (_, i) => ({ external_id: `manual:other-${i}`, festival_uid: 'uid-a' })),
    { external_id: 'manual:late', festival_uid: 'uid-a' }]
  const m = fixtureModule({ rows, sourceRows, correctionRows: [{ externalId: 'tourapi:old', year: 2026, startDate: '2026-09-15' }] })
  assert.equal((await m.findByKey('manual:late')).startDate, '2026-09-15')
  assert.equal(m.calls.filter(c => c.table === 'festival_sources').length, 3)
  m.expire()
  assert.equal((await m.findByKey('manual:late')).startDate, '2026-09-15')
  assert.equal(m.calls.filter(c => c.table === 'festival_sources').length, 6)
})

test('missing mapping table preserves baseline direct corrections, while a mapping outage fails closed', async () => {
  const rows = [{ id: 'tourapi:direct', name: 'Direct', tourapi_id: 'direct', start_date: '2026-09-18', end_date: '2026-09-20' }]
  const correctionRows = [{ externalId: 'tourapi:direct', year: 2026, startDate: '2026-09-15' }]
  for (const code of ['42P01', 'PGRST205']) {
    const m = fixtureModule({ rows, correctionRows, sourceError: { code, message: 'table absent' } })
    assert.equal((await m.findByKey('tourapi:direct')).startDate, '2026-09-15')
    assert.equal((await m.listFestivalSummaries())[0].startDate, '2026-09-15')
  }
  const outage = fixtureModule({ rows, correctionRows, sourceError: { code: '08006', message: 'connection failed' } })
  await assert.rejects(outage.findByKey('tourapi:direct'), /정정 출처/)
})
test('CR-02 final official dates survive stale live data in both summary and detail', async () => {
  const rows = [{ id: 'tourapi:fixture', name: '검증 전용', start_date: '2026-09-15', end_date: '2026-09-20', tourapi_id: 'fixture' }]
  const correctionRows = [{ externalId: 'tourapi:fixture', year: 2026, match: '검증 전용', startDate: '2026-09-15' }]
  const m = fixtureModule({ rows, correctionRows, live: [{ ...fresh, contentId: 'fixture', startDate: '2026-09-18', endDate: '2026-09-20' }] })
  assert.equal((await m.listFestivalSummaries())[0].startDate, '2026-09-15')
  assert.equal((await m.findByKey('tourapi:fixture')).startDate, '2026-09-15')
})
test('CR-05 rank uses minimal projection, preserves measured-only denominator', async () => {
  const rows = [{ id: 'a', sido: '서울특별시', visitor_lift: 3 }, { id: 'b', sido: '서울특별시', visitor_lift: 2 }, { id: 'c', sido: '서울특별시', visitor_lift: 1 }, { id: 'missing', sido: '서울특별시', visitor_lift: null }]
    .map(r => ({ ...r, name: r.id, start_date: '2026-09-01', end_date: '2026-09-30', address: null, sigungu: null, lat: null, lng: null }))
  const m = fixtureModule({ rows })
  assert.deepEqual(await m.regionRank({ externalId: 'b', sido: '서울특별시', visitorLift: 2 }), { rank: 2, total: 3 })
  assert.ok(m.calls.every(c => !c.select.includes('*') && !c.select.includes('festival_translations')))
})
test('CR-06 twelve independent runtime details never trigger full detail fetch', async () => {
  const m = fixtureModule()
  for (let i = 0; i < 12; i++) await m.findByKey('fixture:' + i)
  assert.equal(m.calls.filter(c => c.range && c.select.includes('festival_photos')).length, 0)
  assert.equal(m.calls.filter(c => c.filters.some(([k]) => k === 'id')).length, 12)
})
test('one rejected live source does not prevent DB detail or slug generation', async () => {
  const m = fixtureModule({ failLive: true, rows: [{ id: 'manual:a', name: 'Fallback', start_date: '2026-09-05', end_date: '2026-09-10' }] })
  assert.deepEqual(await m.listFestivalSlugs(), ['manual:a'])
  assert.equal((await m.findByKey('manual:a')).name, 'Fallback')
})

test('runtime expiry stays single-row; explicitly enabled build shares its preload', async () => {
  const rows = [{ id: 'manual:a', name: 'A', start_date: '2026-09-01', end_date: '2026-09-20' }]
  const runtime = fixtureModule({ rows })
  await runtime.findByKey('manual:a'); runtime.expire(); await runtime.findByKey('manual:a')
  assert.equal(runtime.calls.filter(c => c.select.includes('festival_photos') && c.range).length, 0)
  const build = fixtureModule({ rows, build: true })
  await build.findByKey('manual:a'); await build.findByKey('manual:a')
  assert.equal(build.calls.filter(c => c.select.includes('festival_photos') && c.range).length, 1)
})

test('an uncorrected festival still receives live dates and a live-only alias works for four languages', async () => {
  const { resolveFestivalRoute, festivalRoutePath } = await import('../lib/festival-routes.ts')
  const m = fixtureModule({ live: [fresh], rows: [{ id: 'tourapi:fixture-new', name: fresh.name, start_date: '2026-09-01', end_date: '2026-09-02', tourapi_id: 'fixture-new' }] })
  assert.equal((await m.findByKey('tourapi:fixture-new')).startDate, '2026-09-05')
  for (const lang of ['ko', 'en', 'ja', 'th']) {
    const live = fixtureModule({ live: [fresh] })
    const route = await resolveFestivalRoute('manual-old', live.findByKey, async () => ['tourapi:fixture-new'])
    assert.equal(route.isAlias, true)
    assert.equal(festivalRoutePath(lang, route.canonicalSlug), `/${lang}/festivals/tourapi-fixture-new/`)
  }
})

test('legacy ambiguous name correction gives identical card and detail dates', async () => {
  const rows = ['a','b'].map(id => ({ id: `manual:${id}`, name: 'Same name', start_date: '2026-09-01', end_date: '2026-09-30' }))
  const m = fixtureModule({ rows, correctionRows: [{ match: 'Same name', year: 2026, startDate: '2026-09-15' }] })
  const list = await m.listFestivalSummaries()
  assert.equal(list[0].startDate, '2026-09-01')
  assert.equal((await m.findByKey('manual:a')).startDate, list[0].startDate)
})

test('rank cohort follows corrected regions; live-only and missing measurements stay excluded', async () => {
  const rows = [
    { id: 'a', sido: '서울특별시', visitor_lift: 5 },
    { id: 'b', sido: '부산광역시', visitor_lift: 3 },
    { id: 'c', sido: '부산광역시', visitor_lift: 1 },
    { id: 'unknown', sido: '부산광역시', visitor_lift: null },
  ].map(r => ({ ...r, name: r.id, start_date: '2026-09-01', end_date: '2026-09-30' }))
  const correctionRows = [{ externalId: 'a', year: 2026, sido: '부산광역시', address: '부산광역시 해운대구', sigungu: '해운대구', lat: null, lng: null }]
  const m = fixtureModule({ rows, correctionRows, live: [fresh] })
  assert.deepEqual(await m.regionRank({ externalId: 'b', sido: '부산광역시', visitorLift: 3 }), { rank: 2, total: 3 })
  const measured = (await m.allFestivals()).filter(f => f.sido === '부산광역시' && f.visitorLift != null)
  assert.deepEqual(measured.map(f => f.externalId).sort(), ['a','b','c'])
})
