import type { MetadataRoute } from 'next'
import { listFestivalSlugs } from '@/lib/festivals'
import { LANGS, SITE_URL } from '@/lib/i18n'
import { THEMES } from '@/lib/themes'

// sitemap — 4개 언어판을 각각 URL로 낸다. 이전 구현은 724개 전부 한국어였다.
// 각 URL에 alternates.languages를 붙여 언어판끼리 묶는다(sitemap 수준 hreflang).
export const dynamic = 'force-static'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const alt = (path: string) => ({
    languages: Object.fromEntries(LANGS.map((l) => [l, `${SITE_URL}/${l}/${path}`])),
  })
  const rows: MetadataRoute.Sitemap = []
  const slugs = await listFestivalSlugs()
  for (const l of LANGS) {
    rows.push({ url: `${SITE_URL}/${l}/`, changeFrequency: 'daily', priority: 1, alternates: alt('') })
    rows.push({ url: `${SITE_URL}/${l}/festivals/`, changeFrequency: 'daily', priority: 0.9, alternates: alt('festivals/') })
    rows.push({ url: `${SITE_URL}/${l}/calendar/`, changeFrequency: 'weekly', priority: 0.7, alternates: alt('calendar/') })
    for (const k of THEMES) {
      rows.push({ url: `${SITE_URL}/${l}/themes/${k}/`, changeFrequency: 'weekly', priority: 0.7, alternates: alt(`themes/${k}/`) })
    }
    for (const slug of slugs) {
      // 주소는 퍼센트 인코딩해서 낸다. 표준데이터 축제는 이름이 곧 주소라 「<가자갯벌도시>」·「포도&한우축제」처럼
      // <, >, &가 들어 있는데, 그대로 내면 XML 문법이 깨져 검색엔진이 사이트맵 전체를 못 읽는다
      // (2026-09-20 서치콘솔 'Couldn't fetch'로 발견 — 724번째 줄에서 파싱 중단). 상세 페이지의
      // canonical도 같은 방식으로 인코딩하므로 두 주소가 글자 그대로 일치한다.
      const p = `festivals/${encodeURIComponent(slug)}/`
      rows.push({ url: `${SITE_URL}/${l}/${p}`, changeFrequency: 'weekly', priority: 0.6, alternates: alt(p) })
    }
  }
  return rows
}
