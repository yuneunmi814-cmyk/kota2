const kstFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** KOTA가 사용하는 하나의 '오늘': 실행 장소와 무관한 한국 날짜 */
export function todayKst(now = new Date()): string {
  return kstFormatter.format(now)
}

/** YYYY-MM-DD 형태의 달력 날짜에 날짜 수를 더한다. */
export function addDays(date: string, days: number): string {
  const at = Date.parse(`${date}T00:00:00Z`)
  return new Date(at + days * 86_400_000).toISOString().slice(0, 10)
}

/** 두 달력 날짜 사이의 일수. 시간대가 아니라 날짜끼리 비교한다. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** 오늘이 일요일이면 오늘만, 토요일이면 토·일, 평일이면 돌아오는 토·일 */
export function weekendRange(today = todayKst()): [string, string] {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay()
  const saturdayOffset = dow === 0 ? 0 : 6 - dow
  const saturday = addDays(today, saturdayOffset)
  const sunday = addDays(saturday, dow === 0 ? 0 : 1)
  return [saturday, sunday]
}

export type FestivalStatus = 'ongoing' | 'upcoming' | 'ended'

export function festivalStatus(startDate: string, endDate: string, today = todayKst()): FestivalStatus {
  if (today < startDate) return 'upcoming'
  if (today > endDate) return 'ended'
  return 'ongoing'
}
