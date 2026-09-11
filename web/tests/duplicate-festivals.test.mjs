import test from 'node:test'
import assert from 'node:assert/strict'
import {sameEdition,uniqueFestivals,festivalIndex} from '../lib/duplicate-festivals.ts'
const base={name:'지역축제',externalId:'a',startDate:'2026-09-11',endDate:'2026-09-12',sido:'경기도',sigungu:'광주시'}
test('same edition prefers current imagery, without mutating IDs or deleting routes',()=>{
 const a={...base,imageUrl:null}, b={...base,externalId:'b',imageUrl:'https://example.org/poster.jpg',imageFrom:'own'}
 const out=uniqueFestivals([a,b]);assert.equal(out.length,1);assert.equal(out[0].externalId,'a');assert.equal(out[0].imageUrl,b.imageUrl);assert.deepEqual(out[0].duplicateIds,['b']);assert.equal(a.imageUrl,null)
})
test('same name elsewhere, another season, or unknown locality stay separate',()=>{
 assert.equal(sameEdition(base,{...base,sigungu:'하남시'}),false)
 assert.equal(sameEdition(base,{...base,startDate:'2026-10-11',endDate:'2026-10-12'}),false)
 assert.equal(sameEdition({...base,sido:null,sigungu:null},{...base,sido:null,sigungu:null}),false)
})
test('specific name aliases require matching edition and place',()=>{
 const a={...base,name:'광주시 남한산성문화제'},b={...base,name:'남한산성문화제',externalId:'b'}
 assert.equal(uniqueFestivals([a,b]).length,1)
 assert.equal(uniqueFestivals([a,{...b,sigungu:'다른시'}]).length,2)
})

test('poster changes and input order cannot change identity or verified operating days',()=>{
 const a={...base,operatingWeekdays:[0]},b={...base,externalId:'b',imageUrl:'https://example.org/b.jpg',imageSource:'official B',imageAttribution:'B',imageNotice:'notice'}
 const before=structuredClone([a,b])
 for (const input of [[a,b],[b,a],[{...b,imageUrl:null},a]]) {
  const out=uniqueFestivals(input)[0]
  assert.equal(out.externalId,'a');assert.deepEqual(out.operatingWeekdays,[0])
  assert.equal(festivalIndex([out]).get('b').externalId,'a')
 }
 const out=uniqueFestivals([a,b])[0]
 assert.equal(out.imageSource,'official B');assert.equal(out.imageAttribution,'B');assert.equal(out.imageNotice,'notice')
 assert.deepEqual([a,b],before)
})
test('persisted DB identity wins over a lexically earlier live-only source',()=>{
 const live={...base,externalId:'a'},db={...base,externalId:'z',imageUrl:null}
 assert.equal(uniqueFestivals([live,db],new Set(['z']))[0].externalId,'z')
})
test('conflicting verified weekdays remain separate rather than silently dropping a schedule',()=>{
 assert.equal(uniqueFestivals([{...base,operatingWeekdays:[0]},{...base,externalId:'b',operatingWeekdays:[6]}]).length,2)
})
test('exact IDs outrank a display alias when resolving curated selections',()=>{
 const a={...base,duplicateIds:['b']}, b={...base,externalId:'b'}
 assert.equal(festivalIndex([a,b]).get('b'),b)
})
