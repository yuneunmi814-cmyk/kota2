import test from 'node:test'
import assert from 'node:assert/strict'
import { applyReviewed, httpUrl, imageDimensions, mediaPriority, retryDue, runLimit, reusableGalleryType, type ReviewedImages } from './media.js'
import type { Festival } from './types.js'
const now = Date.parse('2026-09-11T00:00:00Z')
const upcoming = { startDate: '2026-09-15', endDate: '2026-09-17' }
test('legacy misses and upcoming misses retry, recent attempts stay cached', () => {
  assert.equal(retryDue(undefined, upcoming, false, now), true)
  assert.equal(retryDue('2026-09-07', upcoming, false, now), true)
  assert.equal(retryDue('2026-09-10', upcoming, false, now), false)
  assert.equal(retryDue('2026-09-07', { startDate:'2026-12-01',endDate:'2026-12-03' }, false, now), false)
  assert.equal(retryDue('2026-09-07', upcoming, true, now), false)
})
test('ongoing and upcoming events precede distant and ended events, bounds enforced', () => {
  const dates = [{startDate:'2026-08-01',endDate:'2026-08-02'}, {startDate:'2026-12-01',endDate:'2026-12-02'}, upcoming, {startDate:'2026-09-01',endDate:'2026-09-20'}]
  assert.deepEqual(mediaPriority(dates, now).map(f => f.startDate), ['2026-09-01','2026-09-15','2026-12-01','2026-08-01'])
  assert.equal(runLimit('0'), 0); assert.equal(runLimit('-1'), 40); assert.equal(runLimit('10000'), 200)
})
test('WebP VP8X and VP8L sizes, PNG, truncated and corrupt JPEG headers', () => {
  const b = Buffer.alloc(30); b.write('RIFF',0); b.write('WEBPVP8X',8); b[24]=255;b[25]=1;b[27]=255;b[28]=3
  assert.deepEqual(imageDimensions(b),[512,1024])
  b.write('VP8L',12);b[20]=47;b.writeUInt32LE(499 | (799 << 14),21)
  assert.deepEqual(imageDimensions(b),[500,800])
  const png=Buffer.alloc(24);png[0]=137;png.write('PNG',1);png.write('IHDR',12);png.writeUInt32BE(600,16);png.writeUInt32BE(900,20)
  assert.deepEqual(imageDimensions(png),[600,900])
  for (let i=0;i<24;i++) assert.deepEqual(imageDimensions(png.subarray(0,i)),[0,0])
  assert.deepEqual(imageDimensions(Buffer.from([255,216,255,192,0,0,0,0,0,0,0])),[0,0])
})
test('URLs retain working HTTP and extensionless query URLs', () => {
  assert.equal(httpUrl('http://example.org/image?id=7'),'http://example.org/image?id=7')
  assert.equal(httpUrl('javascript:alert(1)'),null)
  for (const url of ['http://127.0.0.1/img','http://localhost/img','http://[::1]/img','http://example.local/img']) assert.equal(httpUrl(url),null)
})
test('reviewed media survives source representative changes, only same edition and rights', () => {
  const f = {externalId:'kfes:1',sourceIds:['tourapi:1'],...upcoming,imageFrom:'past',imageUrl:'old'} as Festival
  const reviewed: ReviewedImages = {'tourapi:1': {...upcoming,reviewedAt:'2026-09-11',rightsBasis:'Permission record 123',images:[{url:'http://example.org/image?id=1',from:'https://example.org/event/1',w:500,h:700}]}}
  assert.equal(applyReviewed(f,reviewed),true);assert.equal(f.imageFrom,'scraped')
  assert.equal(applyReviewed({...f,startDate:'2027-09-15'},reviewed),false)
  reviewed['tourapi:1']!.rightsBasis=''; assert.equal(applyReviewed(f,reviewed),false)
})

test('gallery rights never default absent metadata to permission', () => {
  assert.equal(reusableGalleryType('Type1'),true); assert.equal(reusableGalleryType('Type3'),true)
  for (const code of [undefined,'','Type2','Type4','unknown']) assert.equal(reusableGalleryType(code),false)
})
