import { hasOperatingDay } from '@/lib/operating-days'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { Festival } from '@/lib/festivals'
import { listFestivalSummaries, isAlwaysOn, localized, statusOf } from '@/lib/festivals'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import Header from '@/components/Header'
import FestivalRow from '@/components/FestivalRow'
import NearbyBlock from '@/components/NearbyBlock'
import Footer from '@/components/Footer'
import SearchBar from '@/components/SearchBar'
import RotatingPromo from '@/components/RotatingPromo'
import { curatedPromos } from '@/lib/reviews'
import RegionRail from '@/components/RegionRail'
import ThemeRail from '@/components/ThemeRail'
import { addDays, todayKst, weekendRange } from '@/lib/date'


// 1시간마다 다시 굽는다 — 축제 데이터는 주 1회만 바뀌므로 요청마다 DB를 볼 이유가 없다
export const revalidate = 3600

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  // 화면에서 실제로 볼 수 있는 수만 센다.
  // 전체 길이를 쓰면 끝난 축제까지 세어 홈은 519곳을 약속하는데 목록에는 495곳뿐이었다.
  // 숫자가 어긋나면 데이터 신뢰도로 바로 이어진다(2026-08-23 점검).
  const n = (await listFestivalSummaries()).filter((f) => statusOf(f) !== 'ended').length
  return {
    title: { absolute: `KOTA — ${t(l, 'brand.tagline')}` },
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
  // 홈은 카드에 쓰는 값만 있으면 된다 — 소개·프로그램·부스·사진 원문은 상세에서만 쓴다.
  // 전량 조회를 쓰면 홈 한 장을 굽는 데 1.3MB를 끌어왔다.
  const all = await listFestivalSummaries()

  const today = todayKst()
  const ongoing = all.filter((f) => statusOf(f, today) === 'ongoing' && !isAlwaysOn(f))
  // 인기 — 진행 중 + 30일 안에 시작하는 축제. 진행 중만 보면 비수기엔 소규모가 상위에 뜬다(실측)
  const upcomingCutoff = addDays(today, 30)
  const upcomingSoon = all.filter((f) => statusOf(f, today) === 'upcoming' && !isAlwaysOn(f) && f.startDate <= upcomingCutoff)
  // 홈 행의 동점 가르기 — 홈은 진열창이라 사진 없는 카드가 앞에 오면 안 된다.
  // '곧 끝나요'는 오늘 끝나는 것만 35건이라 종료일만으로는 변별이 안 된다(실측).
  const showcase = (a: Festival, b: Festival) =>
    (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0) || (b.popularity ?? 0) - (a.popularity ?? 0)

  const popular = [...ongoing, ...upcomingSoon].filter(f => (f.visitorLift ?? 0) >= 1.5).sort((a, b) => (b.visitorLift ?? 0) - (a.visitorLift ?? 0) || showcase(a, b))



  // 시간축 두 개 — 여행자가 실제로 묻는 것은 '지금 갈 수 있나', '주말에 뭐 있나'다.
  const endingSoon = ongoing
    .filter((f) => f.endDate <= addDays(today, 7))
    .sort((a, b) => a.endDate.localeCompare(b.endDate) || showcase(a, b))

  // 다음 토·일 — 오늘이 주말이면 이번 주말, 아니면 돌아오는 주말
  const [sat, sun] = weekendRange(today)
  const weekend = [...ongoing, ...upcomingSoon]
    .filter((f) => hasOperatingDay(f, sat, sun))
    .sort(showcase)

  // 회전 배너 = 이번 주말. 여행자가 가장 먼저 묻는 것이므로 가장 눈에 띄는 자리에 둔다.
  // 사진이 없으면 배너에 못 올린다(빈 상자가 도는 것보다 넉 장이 낫다).
  // 관리자가 고른 게 있으면 그것으로, 없으면 이번 주말 축제로 자동으로 채운다
  const curated = await curatedPromos()
  const byId = new Map(all.map((f) => [f.externalId, f]))
  const picked = curated.map((c) => byId.get(c.festivalId)).filter((f): f is Festival => !!f && !!f.imageUrl && hasOperatingDay(f, sat, sun))
  const promoSlides = (picked.length > 0 ? picked : weekend.filter((f) => f.imageUrl))
    .slice(0, 4)
    .map((f) => ({
      id: f.externalId,
      name: localized(f, l).name,
      image: f.imageUrl!,
      place: localized(f, l).placeName ?? '',
      lift: f.visitorLift ?? null,
    }))

  // 행끼리 겹치면 4개 행이 사실상 한 행이 된다 — 상위 축제는 모든 축에서 1등이라 그렇다(실측:
  // 통영한산대첩·둔내고랭지토마토가 네 행에 전부 등장). 먼저 나온 행이 가져가고 뒤는 다음 것을 쓴다.
  const used = new Set<string>(promoSlides.map(s => s.id))
  const take = (list: Festival[], n = 4) => {
    const out: Festival[] = []
    for (const f of list) {
      if (used.has(f.externalId)) continue
      used.add(f.externalId)
      out.push(f)
      if (out.length === n) break
    }
    return out
  }

  return (
    <>
      <Header lang={l} />

      <main className="pb-24">
        {/* 히어로 — 질문으로 연다. 목록을 먼저 보여주면 '또 하나의 축제 포털'이 된다 */}
        <section className="mx-auto max-w-6xl px-5 pb-8 pt-10 text-center sm:pt-16">
          <h1 className="h-display mx-auto max-w-3xl text-[40px] text-ink sm:text-[58px]">
            {t(l, 'home.headline')}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] text-muted sm:text-[17px]">
            {t(l, 'home.sub', { n: all.filter((f) => statusOf(f) !== 'ended').length })}
          </p>
          <div className="mt-7">
            <SearchBar lang={l} />
          </div>
          <nav className="mt-4 flex flex-wrap justify-center gap-2 text-sm font-semibold" aria-label={t(l, 'nav.festivals')}>
            <Link className="rounded-full border border-line px-4 py-2 hover:border-brand" href={`/${l}/festivals/?period=weekend`}>{t(l, 'row.weekend')}</Link>
            <Link className="rounded-full border border-line px-4 py-2 hover:border-brand" href={`/${l}/calendar/`}>{{ ko: '축제 달력', en: 'Calendar', ja: '祭りカレンダー', th: 'ปฏิทิน' }[l]}</Link>
            <a className="rounded-full border border-line px-4 py-2 hover:border-brand" href="#nearby">{t(l, 'nearby.title')}</a>
          </nav>
        </section>

        {/* 회전 배너 — 트립어드바이저 히어로 바로 아래의 형광 초록 자리 */}
        <RotatingPromo slides={promoSlides} total={weekend.length} curated={picked.length > 0} lang={l} />

        {/* 내 주변 — 배너 바로 아래.
            최하단에 있었다. 위치를 켜 주면 가장 쓸모 있는 자리인데, 거기까지 내려온 사람만
            봤다(8/18 회의). 히어로 위로 올리자는 안은 첫 화면이 지저분해져 기각됐고,
            KOTA's Pick 바로 아래로 정해졌다. */}
        <div id="nearby" className="scroll-mt-24 pb-4">
          <NearbyBlock all={all} lang={l} />
        </div>

        {/* 무엇을 — 트립어드바이저 '내 관심사에 맞는 즐길거리' 자리 */}
        <ThemeRail all={all} lang={l} title={t(l, 'purpose.title')} subtitle={t(l, 'purpose.sub')} />


        {/* 어디로 — 트립어드바이저 '놓칠 수 없는 명소' 자리 */}
        <RegionRail all={all} lang={l} title={t(l, 'region.title')} subtitle={t(l, 'region.sub')} />


        {/* 시간축·신뢰축 행 — 트립어드바이저 둘러보기의 '카테고리별 가로 행' 문법.
            순서는 여행자가 묻는 순서다: 지금 갈 수 있나 → 주말에 뭐 있나 → 뭘 많이 가나 → 검증된 건 뭔가 */}
        <FestivalRow
          title={t(l, 'row.ending')}
          subtitle={t(l, 'row.ending.sub')}
          items={take(endingSoon)}
          lang={l}
          href={`/${l}/festivals/?period=ongoing`}
          moreLabel={t(l, 'row.more')}
        />
        <div className="pb-16">
          <FestivalRow
            title={t(l, 'popular.title')}
            items={take(popular)}
            lang={l}
            href={`/${l}/festivals/?sort=popularity`}
            moreLabel={t(l, 'row.more')}
          />
        </div>
        {/* 다음 달 행 — 2026-08-17 숨김. 홈이 길어져 잠시 내렸다.
            되살리려면 아래 주석만 풀면 된다.
        // <FestivalRow
        // title={t(l, 'row.next')}
        // subtitle={t(l, 'row.next.sub')}
        // items={take(nextMonth)}
        // lang={l}
        // href={`/${l}/festivals/`}
        // moreLabel={t(l, 'row.more')}
        // />
        */}

      </main>

      <Footer lang={l} />
    </>
  )
}
