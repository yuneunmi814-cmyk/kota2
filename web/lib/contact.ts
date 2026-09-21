import type { Festival } from './festivals.ts'

export const HELPLINE_URL = 'https://english.visitkorea.or.kr/svc/contents/infoHtmlView.do?menuSn=454&vcontsId=140632'
export function webContact(raw?: string | null): string | null {
  if (!raw) return null
  try { const u = new URL(raw); return ['https:', 'http:'].includes(u.protocol) ? u.href : null } catch { return null }
}
export function festivalContacts(f: Pick<Festival, 'homepage' | 'instagram' | 'tel'> & { email?: string | null }) {
  // Only contact fields: do not scrape arbitrary programme/advertising text for addresses.
  const email = [f.email, f.homepage?.startsWith('mailto:') ? f.homepage.slice(7).split('?')[0] : null, f.tel]
    .flatMap(v => v?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])[0] ?? null
  const phones = [...new Set(f.tel?.match(/(?:\+82[- .]?|0)(?:\d[- .]?){7,10}\d|1[568]\d{2}[- ]?\d{4}/g) ?? [])]
    .map(label => ({ label, href: `tel:${label.replace(/[^+\d]/g, '')}` }))
  return { homepage: webContact(f.homepage), instagram: webContact(f.instagram), email, phones }
}
