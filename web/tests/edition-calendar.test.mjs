import test from 'node:test'
import assert from 'node:assert/strict'
import { nextEditions, editionCalendar } from '../lib/edition-calendar.ts'
const watch = { id: 'old', name: '같은 축제', sido: '서울', after: '2026-09-20' }
const f = { id: '1', externalId: 'new', name: '같은축제', sido: '서울', startDate: '2027-09-18', endDate: '2027-09-20' }
test('next editions: new ID same name/region, reused ID; no old edition or other region', () => {
 assert.deepEqual(nextEditions([f, {...f, sido:'부산'}, {...f, endDate:'2026-09-20',startDate:'2026-09-18'}], watch, '2026-09-21'), [f])
 assert.equal(nextEditions([{...f, externalId:'old',name:'새 이름'}],watch,'2026-09-21').length,1)
})
test('calendar has no invented dates; all-day end exclusive; reminder and UTF8 folding', () => {
 assert.ok(!editionCalendar([], '빈 달력', 'ko').includes('VEVENT'))
 const ics = editionCalendar([f], '가'.repeat(100), 'ja')
 assert.match(ics,/DTEND;VALUE=DATE:20270921/)
 assert.match(ics,/TRIGGER:-P1D/)
 assert.ok(ics.split('\r\n').every(l=>Buffer.byteLength(l)<=75))
 const weekly=editionCalendar([{...f,operatingWeekdays:[0]}], '일요일', 'en')
 assert.equal((weekly.match(/BEGIN:VEVENT/g)||[]).length,1)
 assert.match(weekly,/DTSTART;VALUE=DATE:20270919/)
})
