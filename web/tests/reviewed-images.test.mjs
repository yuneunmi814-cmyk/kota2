import test from 'node:test'
import assert from 'node:assert/strict'
import {applyReviewedImages, reviewedFor} from '../lib/reviewed-images.ts'
const f = {externalId:'stdfest:test',startDate:'2026-09-12',endDate:'2026-09-13',imageUrl:null}
const set = {startDate:f.startDate,endDate:f.endDate,reviewedAt:'2026-09-11',rightsBasis:'Explicit public reuse notice',images:[{url:'https://example.org/poster',from:'https://example.org/event',w:600,h:900}]}
test('reviewed poster fills the web result without changing source data or ID',()=>{
 const result=applyReviewedImages([f],{[f.externalId]:set})[0]
 assert.equal(result.imageUrl,set.images[0].url)
 assert.equal(result.imageSource,set.images[0].from)
 assert.equal(result.externalId,f.externalId)
 assert.equal(f.imageUrl,null)
})
test('wrong edition, missing rights, invalid dimensions and conflicting source records stay out',()=>{
 assert.equal(reviewedFor({...f,endDate:'2026-09-14'},{[f.externalId]:set}),undefined)
 for(const bad of [{...set,rightsBasis:''},{...set,images:[{...set.images[0],w:0}]}]) assert.equal(reviewedFor(f,{[f.externalId]:bad}),undefined)
 assert.equal(reviewedFor({...f,sourceIds:['other']},{[f.externalId]:set,other:{...set,images:[{...set.images[0],url:'https://example.org/other'}]}}),undefined)
})

test('committed media paths are accepted while arbitrary paths and traversal are rejected',()=>{
 for(const url of ['/festival-media/wanggeon-2026-front.png']) assert.ok(reviewedFor(f,{[f.externalId]:{...set,images:[{...set.images[0],url}]}}))
 for(const url of ['/etc/passwd','/festival-media/../secret.png','//example.org/image.png','/festival-media/a.svg']) assert.equal(reviewedFor(f,{[f.externalId]:{...set,images:[{...set.images[0],url}]}}),undefined)
})

test('every published registry entry targets its stated edition and local assets exist',async()=>{
 const {readFileSync,existsSync}=await import('node:fs')
 const registry=JSON.parse(readFileSync(new URL('../data/reviewed-images.json',import.meta.url)))
 for(const [externalId,entry] of Object.entries(registry)) {
  assert.ok(reviewedFor({externalId,startDate:entry.startDate,endDate:entry.endDate},registry),externalId)
  for(const im of entry.images) if(im.url.startsWith('/')) assert.ok(existsSync(new URL('../public'+im.url,import.meta.url)),im.url)
 }
})
