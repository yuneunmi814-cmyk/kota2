import type { Lang } from './i18n.ts'
import { REGIONS } from './sido.ts'
import { THEMES } from './themes.ts'

const LANG_PATH = /^\/(?:ko|en|ja|th)(?=\/|$)/
const SORTS = ['date', 'distance', 'popularity']
const SIDO = new Set(REGIONS.flatMap((r) => r.sidos))

function listQuery(search: string): string {
  const source = new URLSearchParams(search)
  const result = new URLSearchParams()
  const period = source.get('period')
  if (period === 'ongoing' || period === 'upcoming' || period === 'weekend' ||
      (period != null && /^(?:[1-9]|1[0-2])$/.test(period))) result.set('period', period)

  const region = source.get('region')
  if (region && REGIONS.some((r) => r.key === region)) result.set('region', region)
  const sido = source.get('sido')
  if (sido && SIDO.has(sido) && (!region || REGIONS.some((r) => r.key === region && r.sidos.includes(sido)))) {
    result.set('sido', sido)
  }
  const theme = source.get('theme')
  if (theme && (THEMES as readonly string[]).includes(theme)) result.set('theme', theme)
  if (source.get('graded') === '1') result.set('graded', '1')
  const sort = source.get('sort')
  if (sort && sort !== 'date' && SORTS.includes(sort)) result.set('sort', sort)
  const q = source.get('q')?.trim()
  if (q) result.set('q', q)
  const page = source.get('page')
  if (page && /^[1-9]\d*$/.test(page) && Number.isSafeInteger(Number(page)) && Number(page) > 1) result.set('page', page)
  return result.toString()
}

/** Change only the locale segment; list-state query keys are validated before carrying across. */
export function languageHref(lang: Lang, pathname: string, search = ''): string {
  if (!LANG_PATH.test(pathname)) return `/${lang}/`
  const path = pathname.replace(LANG_PATH, `/${lang}`)
  const [rawSearch, hash = ''] = search.split('#', 2)
  const safeSearch = path === `/${lang}/festivals/` || path === `/${lang}/festivals`
    ? listQuery(rawSearch)
    : rawSearch.replace(/^\?/, '')
  return `${path}${safeSearch ? `?${safeSearch}` : ''}${hash ? `#${hash}` : ''}`
}
