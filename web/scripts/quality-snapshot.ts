import { hasOperatingDay } from '../lib/operating-days'
// Read-only snapshot of the public data used by the UI. No reviews or private data.
import { writeFileSync } from 'node:fs'
import { listFestivalSummaries } from '../lib/festivals'
import { isAlwaysOn } from '../lib/festival-fields'
import { todayKst, weekendRange } from '../lib/date'
async function main() {
const all = await listFestivalSummaries()
const today = todayKst()
const active = all.filter(f=>f.endDate >= today)
const [sat,sun] = weekendRange(today)
const weekend = active.filter(f=>!isAlwaysOn(f) && hasOperatingDay(f, sat, sun))
const report = {checkedAt:new Date().toISOString(),total:active.length,missing:active.filter(f=>!f.imageUrl).length,weekend:weekend.length,weekendMissing:weekend.filter(f=>!f.imageUrl).length,duplicates:all.filter(f=>f.duplicateIds?.length).map(f=>({name:f.name,ids:[f.externalId,...f.duplicateIds!]})),items:active}
const target=process.argv[2]
if(target)writeFileSync(target,JSON.stringify(report,null,2))
console.log(JSON.stringify({...report,items:undefined},null,2))

}
main().catch(e=>{console.error(e.message);process.exitCode=1})
