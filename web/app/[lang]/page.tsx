import type { Metadata } from 'next'
import Link from 'next/link'
import { allFestivals, isAlwaysOn, localized, statusOf } from '@/lib/festivals'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { THEMES, themeDesc, themeLabel } from '@/lib/themes'
import Header from '@/components/Header'
import Icon from '@/components/Icon'
import FestivalCard from '@/components/FestivalCard'
import FestivalRow from '@/components/FestivalRow'
import NearbyBlock from '@/components/NearbyBlock'
import Footer from '@/components/Footer'
import SearchBar from '@/components/SearchBar'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const n = allFestivals().length
  return {
    title: `KOTA — ${t(l, 'brand.tagline')}`,
    description: t(l, 'home.sub', { n }),
    alternates: {
      canonical: `${SITE_URL}/${l}/`,
      // 4개 언어판이 서로 번역본임을 알린다 — 이게 있어야 각 언어권 검색에 맞는 판이 뜬다
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/`])),
    },
  }
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const all = allFestivals()

  const ongoing = all.filter((f) => statusOf(f) === 'ongoing' && !isAlwaysOn(f))
  // 인기 — 진행 중 + 30일 안에 시작하는 축제. 진행 중만 보면 비수기엔 소규모가 상위에 뜬다(실측)
  const soon = Date.now() + 30 * 86_400_000
  const upcomingSoon = all.filter((f) => statusOf(f) === 'upcoming' && !isAlwaysOn(f) && new Date(f.startDate).getTime() <= soon)
  const popular = [...ongoing, ...upcomingSoon].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, 8)

  const themeCount = (k: string) => all.filter((f) => f.themes?.includes(k)).length

  // 시간축 두 개 — 여행자가 실제로 묻는 것은 '지금 갈 수 있나', '주말에 뭐 있나'다.
  const now = Date.now()
  const day = 86_400_000
  const endingSoon = ongoing
    .filter((f) => new Date(f.endDate).getTime() - now <= 7 * day)
    .sort((a, b) => a.endDate.localeCompare(b.endDate))

  // 다음 토·일 — 오늘이 주말이면 이번 주말, 아니면 돌아오는 주말
  const today = new Date()
  const dow = today.getUTCDay() // 0=일
  const satOffset = dow === 0 ? 0 : 6 - dow
  const sat = new Date(now + satOffset * day).toISOString().slice(0, 10)
  const sun = new Date(now + (satOffset + (dow === 0 ? 0 : 1)) * day).toISOString().slice(0, 10)
  const weekend = [...ongoing, ...upcomingSoon]
    .filter((f) => f.startDate <= sun && f.endDate >= sat)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))

  // 신뢰축 — 문체부 지정 문화관광축제. 공식 근거라 '왜 이 축제냐'에 답이 된다
  const designated = [...ongoing, ...upcomingSoon]
    .filter((f) => f.category === 'MF')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  return (
    <>
      <Header lang={l} />

      <main className="pb-24">
        {/* 히어로 — 질문으로 연다. 목록을 먼저 보여주면 '또 하나의 축제 포털'이 된다 */}
        <section className="confetti mx-auto max-w-6xl rounded-b-[32px] px-5 pb-12 pt-16 text-center sm:pt-24">
          <h1 className={`h-display mx-auto max-w-3xl text-[40px] text-brand sm:text-[58px] ${l === 'en' ? 'font-[family-name:var(--font-hand)] sm:text-[64px]' : ''}`}>
            {t(l, 'home.headline')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] text-muted sm:text-[17px]">
            {t(l, 'home.sub', { n: all.length })}
          </p>
          <div className="mt-9">
            <SearchBar lang={l} />
          </div>
        </section>

        {/* 내 주변 — 진입 즉시 위치를 묻는다 */}
        <div className="pb-16">
          <NearbyBlock all={all} lang={l} />
        </div>

        {/* 목적 — '뭐 하러 가는지'가 여행 계획의 시작이라는 인터뷰에서 나온 축 */}
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="h-display text-[26px] text-ink sm:text-[30px]">{t(l, 'purpose.title')}</h2>
          <p className="mt-1 text-[14px] text-muted">{t(l, 'purpose.sub')}</p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {THEMES.map((k) => (
              <Link
                key={k}
                href={`/${l}/themes/${k}/`}
                className="lift group flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5 hover:border-brand/40"
              >
                <span className="text-brand transition group-hover:scale-110">
                  <Icon name={k} size={26} strokeWidth={1.6} />
                </span>
                <span className="text-[15px] font-bold text-ink">{themeLabel(k, l)}</span>
                <span className="text-[12px] text-hint">{themeCount(k)}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* 시간축·신뢰축 행 — 트립어드바이저 둘러보기의 '카테고리별 가로 행' 문법 */}
        <FestivalRow
          title={t(l, 'popular.title')}
          items={popular}
          lang={l}
          href={`/${l}/festivals/?sort=popularity`}
          moreLabel={t(l, 'row.more')}
        />
        <FestivalRow
          title={t(l, 'row.ending')}
          subtitle={t(l, 'row.ending.sub')}
          items={endingSoon}
          lang={l}
          href={`/${l}/festivals/?period=ongoing`}
          moreLabel={t(l, 'row.more')}
        />
        <FestivalRow
          title={t(l, 'row.weekend')}
          subtitle={t(l, 'row.weekend.sub')}
          items={weekend}
          lang={l}
          href={`/${l}/festivals/`}
          moreLabel={t(l, 'row.more')}
        />
        <FestivalRow
          title={t(l, 'row.designated')}
          subtitle={t(l, 'row.designated.sub')}
          items={designated}
          lang={l}
          href={`/${l}/festivals/`}
          moreLabel={t(l, 'row.more')}
        />
      </main>

      <Footer lang={l} />
    </>
  )
}
