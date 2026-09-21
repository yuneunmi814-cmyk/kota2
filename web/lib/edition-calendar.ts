import { addDays, todayKst } from './date.ts'
import { localized } from './festival-fields.ts'
import { toSlug } from './slug.ts'
import { SITE_URL, type Lang } from './i18n.ts'
import type { Festival } from './festivals.ts'

export interface EditionWatch { id: string; name: string; sido: string; after: string }
export function nextEditions(items: Festival[], watch: EditionWatch, today = todayKst()): Festival[] {
  const bare = (s: string) => s.replace(/\s+/g, '')
  return items.filter(f => f.startDate > watch.after && f.endDate >= today &&
    (f.externalId === watch.id || f.sourceIds?.includes(watch.id) || f.duplicateIds?.includes(watch.id) ||
      (Boolean(watch.sido) && f.sido === watch.sido && bare(f.name) === bare(watch.name))))
}
const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
// RFC 5545: fold at 75 UTF-8 octets, never in the middle of a character.
function fold(line: string): string {
  let out = '', size = 0
  for (const char of line) {
    const n = new TextEncoder().encode(char).length
    if (size + n > 75) { out += '\r\n '; size = 1 }
    out += char; size += n
  }
  return out
}
export function editionCalendar(items: Festival[], name: string, lang: Lang, now = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KOTA//Festival editions//EN', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escape(name)}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H']
  for (const f of items) {
    const L = localized(f, lang)
    // For weekly events, put only announced operating days on the calendar.
    const spans: [string, string][] = []
    if (f.operatingWeekdays?.length) {
      for (let d = f.startDate, n = 0; d <= f.endDate && n < 730; d = addDays(d, 1), n++) {
        if (f.operatingWeekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay())) spans.push([d, d])
      }
    } else spans.push([f.startDate, f.endDate])
    for (const [start, end] of spans) lines.push('BEGIN:VEVENT',
      `UID:${encodeURIComponent(f.externalId)}-${start}@ko-ta.co.kr`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART;VALUE=DATE:${start.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(end, 1).replace(/-/g, '')}`,
      `SUMMARY:${escape(L.name)}`, `URL:${SITE_URL}/${lang}/festivals/${encodeURIComponent(toSlug(f.externalId))}/`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-P1D', `DESCRIPTION:${escape(L.name)}`, 'END:VALARM', 'END:VEVENT')
  }
  return [...lines, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n'
}
export function editionFeedUrl(f: Festival, lang: Lang): string {
  const params = new URLSearchParams({ id: f.externalId, name: f.name, sido: f.sido ?? '', after: f.endDate, lang })
  return `${SITE_URL}/api/edition-calendar/?${params}`
}
