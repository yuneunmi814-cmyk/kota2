/** Optional verified weekdays: 0=Sunday … 6=Saturday. Missing means source gives only a date span. */
export interface OperatingPeriod { startDate: string; endDate: string; operatingWeekdays?: number[] }
export function hasOperatingDay(f: OperatingPeriod, from: string, to: string): boolean {
  const start = f.startDate > from ? f.startDate : from
  const end = f.endDate < to ? f.endDate : to
  if (start > end) return false
  if (!f.operatingWeekdays) return true
  const a = Date.parse(`${start}T00:00:00Z`), b = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  // Weekdays repeat; at most seven checks even for multi-year ranges.
  for (let at=a, n=0; at<=b && n<7; at+=86_400_000,n++) {
    if (f.operatingWeekdays.includes(new Date(at).getUTCDay())) return true
  }
  return false
}
export function shareOperatingDay(a: OperatingPeriod, b: OperatingPeriod): boolean {
  const days = a.operatingWeekdays && b.operatingWeekdays
    ? a.operatingWeekdays.filter(d=>b.operatingWeekdays!.includes(d))
    : a.operatingWeekdays ?? b.operatingWeekdays
  return hasOperatingDay({...a,operatingWeekdays:days}, b.startDate, b.endDate)
}

export function operatingDaysLabel(days: number[] | undefined, lang: string): string | null {
  if (!days?.length) return null
  const names: Record<string,string[]> = {
    ko:['일','월','화','수','목','금','토'], en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    ja:['日','月','火','水','木','金','土'], th:['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'],
  }
  const labels = [...new Set(days)].sort((a,b)=>(a+6)%7-(b+6)%7).map(d=>(names[lang] ?? names.en)[d]).join('·')
  return lang === 'ko' ? `매주 ${labels}요일` : lang === 'ja' ? `毎週${labels}曜日` : lang === 'th' ? `ทุก${labels}` : `Every ${labels}`
}
