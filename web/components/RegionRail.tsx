import Link from 'next/link'
import type { Festival } from '@/lib/festivals'
import { REGIONS } from '@/lib/sido'
import type { Lang } from '@/lib/i18n'
import Icon from './Icon'
import { todayKst } from '@/lib/date'

// 지역으로 고르기 — 트립어드바이저 홈의 '놓칠 수 없는 명소'(로마·파리·런던…) 자리.
//
// 그쪽은 도시 사진을 쓰지만 우리는 그 권역에서 가장 사람이 몰린 축제의 사진을 쓴다.
// 지역 풍경 사진을 따로 구해 붙였다가 뺀 적이 있는데(그 축제와 무관한 사진이라),
// 여기서는 오히려 맞다 — '경상에 뭐가 있나'라는 물음에 그 지역 대표 축제 사진으로 답하는 것이다.
// 사진 위에 축제 이름을 밝혀서 지역 풍경 사진으로 오해할 여지도 남기지 않는다.
//
// 여행자가 실제로 묻는 순서에서 지역은 시기 다음이다. 그래서 홈에서는 '언제' 축 아래,
// 목록 페이지에서는 필터 두 번째 줄에 둔다.

export default function RegionRail({
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
  const today = todayKst()
  const live = all.filter((f) => f.endDate >= today)

  const cards = REGIONS.map((r) => {
    const mine = live.filter((f) => f.sido && r.sidos.includes(f.sido))
    // 대표 사진 — 사진이 있는 것 중 가장 인기 있는 축제. 사진 없는 권역은 글자만으로 둔다.
    const face = [...mine].filter((f) => f.imageUrl).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
    return { region: r, count: mine.length, face }
  }).filter((c) => c.count > 0)

  if (cards.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <h2 className="h-display text-[26px] text-ink sm:text-[30px]">{title}</h2>
      {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}

      <div className="no-scrollbar -mx-5 mt-6 flex snap-x gap-4 overflow-x-auto px-5 pb-1 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0">
        {cards.map(({ region, count, face }) => (
          <Link
            key={region.key}
            href={`/${lang}/festivals/?region=${region.key}`}
            className="lift group w-[132px] shrink-0 snap-start lg:w-auto"
          >
            <div className="relative aspect-square overflow-hidden rounded-full bg-[#f2f2f0]">
              {face?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={face.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[28px] font-black text-ink/15">
                  {region.label[lang].slice(0, 1)}
                </span>
              )}
            </div>
            <p className="mt-2.5 text-center text-[14px] font-bold text-ink group-hover:text-brand">
              {region.label[lang]}
            </p>
            <p className="text-center text-[12px] text-hint">{count}</p>
          </Link>
        ))}
      </div>

      <div className="mt-5 text-center lg:hidden">
        <Link href={`/${lang}/festivals/`} className="inline-flex items-center gap-1 text-[13px] font-bold text-brand hover:underline">
          {title}
          <Icon name="arrow" size={14} />
        </Link>
      </div>
    </section>
  )
}
