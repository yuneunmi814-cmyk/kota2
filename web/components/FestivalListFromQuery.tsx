'use client'
import { useSearchParams } from 'next/navigation'
import type { ListItem } from '@/lib/listData'
import type { Lang } from '@/lib/i18n'
import { isTheme } from '@/lib/themes'
import FestivalList from './FestivalList'

// URL 쿼리를 읽어 목록 초기값으로 넘긴다.
// 홈의 '거리순 보기'·'인기 더보기'·테마 타일이 여기로 들어온다.
export default function FestivalListFromQuery({
  items,
  lang,
  sidos,
}: {
  items: ListItem[]
  lang: Lang
  sidos: { sido: string; count: number }[]
}) {
  const sp = useSearchParams()
  const sort = sp.get('sort')
  const theme = sp.get('theme')
  return (
    <FestivalList
      items={items}
      lang={lang}
      sidos={sidos}
      initialSort={sort === 'distance' || sort === 'popularity' ? sort : 'date'}
      initialTheme={theme && isTheme(theme) ? theme : null}
      initialQuery={sp.get('q') ?? ''}
    />
  )
}
