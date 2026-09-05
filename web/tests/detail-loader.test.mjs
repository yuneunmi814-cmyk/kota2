import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'

test('detail ancillary reads start together instead of waiting for rank round-trip', async () => {
  const started = []
  let release
  const rankResult = new Promise(resolve => { release = resolve })
  const dependencies = {
    cache: f => f, regionRank: () => { started.push('rank'); return rankResult },
    ratingOf: async () => { started.push('rating'); return null },
    reviewsOf: async () => { started.push('reviews'); return [] },
    listFestivalSummaries: async () => { started.push('nearby'); return [] },
    nearbyFestivals: () => [],
  }
  const file = new URL('../lib/detail-loader.ts', import.meta.url)
  const source = readFileSync(file, 'utf8').replace(/^import .+\r?\n/gm, '')
  const load = new Function(...Object.keys(dependencies), stripTypeScriptTypes(source).replace(/\bexport /g, '') + ';return loadDetailExtras;')(...Object.values(dependencies))
  const result = load({ externalId: 'fixture', lat: 37, lng: 127 })
  await new Promise(resolve => setImmediate(resolve))
  try { assert.deepEqual([...started], ['rank','rating','reviews','nearby']) }
  finally { release(null); await result }
})
