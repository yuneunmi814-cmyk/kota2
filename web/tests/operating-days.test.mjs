import test from 'node:test'
import assert from 'node:assert/strict'
import {hasOperatingDay,shareOperatingDay} from '../lib/operating-days.ts'
const f={startDate:'2026-04-01',endDate:'2026-12-09',operatingWeekdays:[3]}
test('Wednesday programme is absent on weekends but present on Wednesday',()=>{
 assert.equal(hasOperatingDay(f,'2026-09-12','2026-09-13'),false)
 assert.equal(hasOperatingDay(f,'2026-09-16','2026-09-16'),true)
 assert.equal(hasOperatingDay(f,'2026-09-10','2026-09-20'),true)
})
test('date bounds and Sunday zero are honored, unknown weekdays preserve overlap',()=>{
 assert.equal(hasOperatingDay(f,'2027-01-01','2027-02-01'),false)
 assert.equal(hasOperatingDay({...f,operatingWeekdays:[0]},'2026-09-13','2026-09-13'),true)
 assert.equal(hasOperatingDay({...f,operatingWeekdays:undefined},'2026-09-12','2026-09-12'),true)
 assert.equal(hasOperatingDay({...f,operatingWeekdays:[]},'2026-09-12','2026-09-20'),false)
})
test('nearby recommendation requires a shared operating day if both weekdays known',()=>{
 assert.equal(shareOperatingDay(f,{...f,operatingWeekdays:[0]}),false)
 assert.equal(shareOperatingDay(f,{...f,operatingWeekdays:[3,6]}),true)
})

test('only valid reviewed weekday values can change a record', async()=>{
 const {applyCorrections}=await import('../lib/corrections.ts')
 const row={externalId:'test',name:'test',startDate:'2026-04-01',endDate:'2026-12-09'}
 const corrected=applyCorrections([row],[{externalId:'test',year:2026,operatingWeekdays:[3]}])[0]
 assert.deepEqual(corrected.operatingWeekdays,[3])
 assert.equal(row.operatingWeekdays,undefined)
 assert.equal(applyCorrections([row],[{externalId:'test',year:2026,operatingWeekdays:[8]}],()=>{})[0].operatingWeekdays,undefined)
 assert.equal(applyCorrections([{...row,startDate:'2027-04-01',endDate:'2027-12-09'}],[{externalId:'test',year:2026,operatingWeekdays:[3]}])[0].operatingWeekdays,undefined)
})
