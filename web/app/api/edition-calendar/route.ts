import { listFestivalSummaries } from '@/lib/festivals'
import { editionCalendar, nextEditions } from '@/lib/edition-calendar'
import { isLang } from '@/lib/i18n'
import { validTravelDate } from '@/lib/list-rules'

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams
  const id = p.get('id') ?? '', name = p.get('name') ?? '', sido = p.get('sido') ?? '', after = p.get('after') ?? ''
  const lang = p.get('lang') ?? 'ko'
  if (!id || id.length > 300 || !name || name.length > 300 || sido.length > 60 || !validTravelDate(after) || !isLang(lang)) {
    return new Response('Invalid subscription', { status: 400 })
  }
  try {
    const editions = nextEditions(await listFestivalSummaries(), { id, name, sido, after })
    return new Response(editionCalendar(editions, name, lang), { headers: {
      'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': 'inline; filename="kota-next-edition.ics"',
    } })
  } catch {
    // A failed fetch must not look like a cancelled/empty subscribed calendar.
    return new Response('Calendar temporarily unavailable', { status: 503, headers: { 'Retry-After': '300' } })
  }
}
