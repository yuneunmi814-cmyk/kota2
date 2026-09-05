import type { Metadata } from 'next'
import { localized } from './festival-fields.ts'
import type { Festival } from './festivals'
import { metaDescription } from './detail-view.ts'
import { LANGS, SITE_URL, type Lang } from './i18n.ts'
import { toSlug } from './slug.ts'

/** Pure metadata assembly: no database access and no page/UI dependency. */
export function detailMetadata(f: Festival, lang: Lang): Metadata {
  const L = localized(f, lang)
  const description = metaDescription(L, f)
  return {
    title: `${L.name} · KOTA`, description,
    alternates: {
      canonical: `${SITE_URL}/${lang}/festivals/${toSlug(f.externalId)}/`,
      languages: Object.fromEntries(LANGS.map(l => [l, `${SITE_URL}/${l}/festivals/${toSlug(f.externalId)}/`])),
    },
    openGraph: { title: L.name, description, ...(f.imageUrl ? { images: [f.imageUrl] } : {}), type: 'website' },
  }
}
