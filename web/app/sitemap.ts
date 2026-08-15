import type { MetadataRoute } from 'next'
import { allFestivals } from '@/lib/festivals'
import { LANGS, SITE_URL } from '@/lib/i18n'
import { THEMES } from '@/lib/themes'

// sitemap — 4개 언어판을 각각 URL로 낸다. 이전 구현은 724개 전부 한국어였다.
// 각 URL에 alternates.languages를 붙여 언어판끼리 묶는다(sitemap 수준 hreflang).
export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const alt = (path: string) => ({
    languages: Object.fromEntries(LANGS.map((l) => [l, `${SITE_URL}/${l}/${path}`])),
  })
  const rows: MetadataRoute.Sitemap = []
  for (const l of LANGS) {
    rows.push({ url: `${SITE_URL}/${l}/`, changeFrequency: 'daily', priority: 1, alternates: alt('') })
    rows.push({ url: `${SITE_URL}/${l}/festivals/`, changeFrequency: 'daily', priority: 0.9, alternates: alt('festivals/') })
    rows.push({ url: `${SITE_URL}/${l}/calendar/`, changeFrequency: 'weekly', priority: 0.7, alternates: alt('calendar/') })
    for (const k of THEMES) {
      rows.push({ url: `${SITE_URL}/${l}/themes/${k}/`, changeFrequency: 'weekly', priority: 0.7, alternates: alt(`themes/${k}/`) })
    }
    for (const f of allFestivals()) {
      const p = `festivals/${f.externalId}/`
      rows.push({ url: `${SITE_URL}/${l}/${p}`, changeFrequency: 'weekly', priority: 0.6, alternates: alt(p) })
    }
  }
  return rows
}
