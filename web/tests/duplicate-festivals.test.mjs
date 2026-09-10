import test from 'node:test'
import assert from 'node:assert/strict'
import {sameEdition,uniqueFestivals} from '../lib/duplicate-festivals.ts'
const base={name:'지역축제',externalId:'a',startDate:'2026-09-11',endDate:'2026-09-12',sido:'경기도',sigungu:'광주시'}
test('same edition prefers current imagery, without mutating IDs or deleting routes',()=>{
 const a={...base,imageUrl:null}, b={...base,externalId:'b',imageUrl:'https://example.org/poster.jpg',imageFrom:'own'}
 const out=uniqueFestivals([a,b]);assert.equal(out.length,1);assert.equal(out[0].externalId,'b');assert.deepEqual(out[0].duplicateIds,['a']);assert.equal(a.imageUrl,null)
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
