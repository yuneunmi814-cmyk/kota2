import { SITE_URL } from '@/lib/i18n'

export const dynamic = 'force-static'

// llms.txt — AI 검색이 이 사이트를 한 번에 파악하도록 주는 요약(https://llmstxt.org 형식).
// 사람이 읽는 페이지가 아니다. 과장하지 않는다 — 여기 적은 것이 그대로 인용된다.
export function GET() {
  const body = `# KOTA — Korea Festa

> KOTA is a multilingual guide to festivals across South Korea. Find festivals by date, region and purpose, see what is on near you right now, and read each festival's dates, place, fees, programme and official links in Korean, English, Japanese and Thai.

- Coverage: festivals nationwide in South Korea (about 500 current and upcoming at any time). Ended festivals stay online and are clearly marked as ended.
- Freshness: festival lists and dates are re-checked against the Korea Tourism Organization OpenAPI every hour when pages are regenerated. Each festival page states the date it was last checked against open data.
- Corrections: where public sources disagree on dates, KOTA checks the organiser's or local government's official notice and records the source on the page.
- Sources: ⓒKorea Tourism Organization (Tour API, Photo Gallery, Korea Tourism Data Lab), the national standard dataset of cultural festivals (data.go.kr), and local governments' open data.
- Not covered: ticket sales, bookings, real-time crowding, or transport timetables. KOTA links to each organiser's official channel for those.
- For travellers who do not speak Korean: organiser phone lines are usually Korean-only. Korea Travel Helpline 1330 (+82-2-1330 from overseas) answers in English, Japanese and Chinese 24/7.
- Operator: Project Yoon (프로젝트윤), Republic of Korea. Not operated by or affiliated with the Korea Tourism Organization.

## Main pages
- [Home (English)](${SITE_URL}/en/): search, this weekend, festivals near you, browse by purpose and region
- [All festivals (English)](${SITE_URL}/en/festivals/): filter by period, travel dates, region, theme; sort by date, distance, visitor data
- [Festival calendar (English)](${SITE_URL}/en/calendar/): monthly view; pick a day to see what starts and what is ongoing
- [홈 (한국어)](${SITE_URL}/ko/)
- [ホーム (日本語)](${SITE_URL}/ja/)
- [หน้าแรก (ไทย)](${SITE_URL}/th/)

## Themes
- [Food](${SITE_URL}/en/themes/food/) · [Nature & flowers](${SITE_URL}/en/themes/nature/) · [History & tradition](${SITE_URL}/en/themes/heritage/) · [Music & performance](${SITE_URL}/en/themes/music/) · [Family](${SITE_URL}/en/themes/family/) · [Night & lights](${SITE_URL}/en/themes/night/)

## URL pattern
- Festival page: ${SITE_URL}/{lang}/festivals/{id}/ where lang is ko, en, ja or th. The same id works in all four languages.
- Full list of URLs: ${SITE_URL}/sitemap.xml

## Optional
- [Privacy policy](${SITE_URL}/en/privacy/) · [Terms](${SITE_URL}/en/terms/) · [Disclaimer](${SITE_URL}/en/disclaimer/)
`
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
