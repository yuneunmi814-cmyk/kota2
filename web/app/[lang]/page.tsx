import type { Metadata } from 'next'
import Link from 'next/link'
import { allFestivals, isAlwaysOn, localized, statusOf } from '@/lib/festivals'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { THEMES, themeDesc, themeLabel } from '@/lib/themes'
import Header from '@/components/Header'
import Icon from '@/components/Icon'
import FestivalCard from '@/components/FestivalCard'
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

        {/* 인기 — kfes의 랭킹에 해당. 관광공사 방문자 데이터 기반 */}
        {popular.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 pb-16">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className="h-display text-[26px] text-ink sm:text-[30px]">{t(l, 'popular.title')}</h2>
              <Link
                href={`/${l}/festivals/?sort=popularity`}
                className="flex shrink-0 items-center gap-1 text-[14px] font-bold text-brand hover:underline"
              >
                <Icon name="arrow" size={15} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {popular.slice(0, 4).map((f) => (
                <FestivalCard key={f.externalId} f={f} lang={l} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer lang={l} />
    </>
  )
}
