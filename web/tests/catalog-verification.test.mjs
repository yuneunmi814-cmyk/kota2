import test from 'node:test'
import assert from 'node:assert/strict'
import { activeCatalog } from '../lib/catalog.ts'
import { officialVerification, syncDate } from '../lib/verification.ts'
import { applyCorrections } from '../lib/corrections.ts'
test('catalog shares current/upcoming unique IDs including year-round events', () => {
 const f={externalId:'a',startDate:'2026-09-20',endDate:'2026-09-21'}
 assert.deepEqual(activeCatalog([f,f,{...f,externalId:'b',endDate:'2026-09-20'},{...f,externalId:'c',startDate:'2026-10-01',endDate:'2026-10-02'}],'2026-09-21').map(f=>f.externalId),['a','c'])
})
test('verification rejects invented/invalid/future dates and non-http source, sync is separate', () => {
 assert.deepEqual(officialVerification({syncedAt:'2026-09-21'}),[])
 for(const date of ['2026-02-30','2027-01-01']) assert.deepEqual(officialVerification({verifiedAt:date,verificationSource:'https://example.org'},'2026-09-21'),[])
 assert.deepEqual(officialVerification({verifiedAt:'2026-09-20',verificationSource:'javascript:alert(1)'}),[])
 assert.equal(officialVerification({verifiedAt:'2026-09-20',verificationSource:'https://example.org'},'2026-09-21')[0].date,'2026-09-20')
 assert.equal(syncDate('invalid'),null)
 assert.equal(syncDate('2026-09-20T16:00:00Z'),'2026-09-21')
})
test('schedule evidence follows accepted edition correction, not another year', () => {
 const f={externalId:'a',name:'행사',startDate:'2026-09-20',endDate:'2026-09-20'}
 const c={externalId:'a',year:2026,endDate:'2026-09-21',checkedAt:'2026-09-01',source:'https://example.org'}
 assert.equal(applyCorrections([f],[c])[0].scheduleVerifiedAt,'2026-09-01')
 assert.equal(applyCorrections([{...f,startDate:'2027-09-20',endDate:'2027-09-20'}],[c])[0].scheduleVerifiedAt,undefined)
})
