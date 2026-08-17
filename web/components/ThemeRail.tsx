import Link from 'next/link'
import type { Festival } from '@/lib/festivals'
import { THEMES, themeLabel } from '@/lib/themes'
import type { Lang } from '@/lib/i18n'
import Icon from './Icon'

// 목적으로 고르기 — 트립어드바이저 홈의 '내 관심사에 맞는 즐길거리를 찾아보세요' 자리.
//
// 그쪽은 야외활동·음식·문화·수상활동을 사진 카드로 늘어놓는다. 아이콘 여섯 개를 나열하던
// 이전 방식보다 사진이 나은 이유는 단순하다 — '먹거리'라는 글자보다 전어 굽는 사진이
// 무엇을 보러 가는지 빨리 알려준다.
//
// 사진은 그 테마에서 가장 사람이 몰린 축제의 것을 쓴다. 대표 사진이 없는 테마는
// 아이콘으로 떨어뜨린다(빈 회색 상자보다 낫다).

export default function ThemeRail({
  all,
  lang,
  title,
  subtitle,
}: {
  all: Festival[]
  lang: Lang
  title: string
  subtitle?: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const live = all.filter((f) => f.endDate >= today)

  const cards = THEMES.map((k) => {
    const mine = live.filter((f) => f.themes?.includes(k))
    const face = [...mine].filter((f) => f.imageUrl).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
    return { key: k, count: mine.length, face }
  }).filter((c) => c.count > 0)

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <h2 className="h-display text-[26px] text-ink sm:text-[30px]">{title}</h2>
      {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}

      <div className="no-scrollbar -mx-5 mt-6 flex snap-x gap-4 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
        {cards.map(({ key, count, face }) => (
          <Link
            key={key}
            href={`/${lang}/themes/${key}/`}
            className="lift group w-[168px] shrink-0 snap-start overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface lg:w-auto"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#f2f2f0]">
              {face?.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={face.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                </>
              ) : (
                <span className="flex h-full w-full items-center justify-center text-ink/20">
                  <Icon name={key} size={30} strokeWidth={1.5} />
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-[14px] font-bold text-ink group-hover:text-brand">{themeLabel(key, lang)}</p>
              <p className="text-[12px] text-hint">{count}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
