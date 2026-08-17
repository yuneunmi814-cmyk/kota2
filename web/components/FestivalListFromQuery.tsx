'use client'
import { useSearchParams } from 'next/navigation'
import type { ListItem } from '@/lib/listData'
import type { Lang } from '@/lib/i18n'
import { isTheme } from '@/lib/themes'
import { REGIONS } from '@/lib/sido'
import FestivalList from './FestivalList'

// URL 쿼리를 읽어 목록 초기값으로 넘긴다.
// 홈의 '거리순 보기'·'인기 더보기'·테마 타일·지역 캐러셀이 여기로 들어온다.
export default function FestivalListFromQuery({
  items,
  lang,
}: {
  items: ListItem[]
  lang: Lang
}) {
  const sp = useSearchParams()
  const sort = sp.get('sort')
  const theme = sp.get('theme')
  const region = sp.get('region')
  return (
    <FestivalList
      items={items}
      lang={lang}
      initialSort={sort === 'distance' || sort === 'popularity' ? sort : 'date'}
      initialTheme={theme && isTheme(theme) ? theme : null}
      initialQuery={sp.get('q') ?? ''}
      initialRegion={REGIONS.some((r) => r.key === region) ? region : null}
      initialGraded={sp.get('graded') === '1'}
    />
  )
}
