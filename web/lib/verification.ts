import type { Festival } from './festivals.ts'
import { todayKst } from './date.ts'
import { validTravelDate } from './list-rules.ts'

export function officialVerification(f: Festival, today = todayKst()) {
  const entries = [
    { date: f.verifiedAt, source: f.verificationSource, scope: 'programme' },
    { date: f.scheduleVerifiedAt, source: f.scheduleVerificationSource, scope: 'schedule' },
  ]
  return entries.filter((e): e is {date: string; source: string; scope: string} => {
    if (!e.date || !validTravelDate(e.date) || e.date > today || !e.source) return false
    try { return ['http:', 'https:'].includes(new URL(e.source).protocol) } catch { return false }
  }).sort((a,b) => b.date.localeCompare(a.date))
}
export function syncDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? todayKst(date) : null
}
