import Link from 'next/link'
import FestivalCard from './FestivalCard'
import Icon from './Icon'
import type { Festival } from '@/lib/festivals'
import type { Lang } from '@/lib/i18n'

// 가로 스크롤 축제 행 — 트립어드바이저 둘러보기 페이지의 문법.
//
// 그 페이지는 카테고리마다 '제목 + 모두 보기 + 카드 4장 가로 행'을 반복한다(실측 2026-08-16).
// 한 화면에 여러 축을 보여주면서도 각 축이 4장으로 끝나 스크롤 피로가 없다.
// 우리 홈은 히어로+타일+4장뿐이라 얇았다 — 시간축(곧 끝나요/이번 주말)과 신뢰축(문화관광축제)을 행으로 채운다.

export default function FestivalRow({
  title,
  subtitle,
  items,
  lang,
  href,
  moreLabel,
}: {
  title: string
  subtitle?: string
  items: Festival[]
  lang: Lang
  href?: string
  moreLabel?: string
}) {
  if (items.length === 0) return null
  return (
    <section className="mx-auto max-w-6xl px-5 pb-14">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="h-display text-[24px] text-ink sm:text-[28px]">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-brand-deep hover:underline">
            {moreLabel}
            <Icon name="arrow" size={14} />
          </Link>
        )}
      </div>
      {/* 모바일은 가로 스크롤, lg부터 4장 그리드 — 좁은 화면에서 2열 그리드는 카드가 너무 작다 */}
      <div className="no-scrollbar -mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {items.slice(0, 4).map((f) => (
          <div key={f.externalId} className="w-[216px] shrink-0 snap-start sm:w-[248px] lg:w-auto">
            <FestivalCard f={f} lang={lang} />
          </div>
        ))}
      </div>
    </section>
  )
}
