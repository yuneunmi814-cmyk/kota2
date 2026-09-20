import { operatingDaysLabel } from '@/lib/operating-days'
import { editorialField } from '@/lib/editorial'
import type { Metadata } from 'next'
import Link from 'next/link'
import { todayKst } from '@/lib/date'
import { notFound, permanentRedirect } from 'next/navigation'
import { listFestivalSummaries, feeKind, findByKey, isAlwaysOn, isLongRun, listFestivalSlugs, localized, regionRank, statusOf } from '@/lib/festivals'
import { detailSections, festivalJsonLd, heroMedia, metaDescription, nearbyFestivals, sourceHost, sourceUrl } from '@/lib/detail-view'
import { toSlug } from '@/lib/slug'
import { festivalRoutePath, resolveFestivalRoute, staticFestivalSlugs } from '@/lib/festival-routes'
import { lookupAliasTargets } from '@/lib/route-aliases'
import { LANGS, SITE_URL, isLang, pageMetadata, type Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { localizeAddress } from '@/lib/address-i18n'
import { sidoLabel } from '@/lib/sido'
import { ratingOf, reviewsOf } from '@/lib/reviews'
import Reviews from '@/components/detail/Reviews'
import TrackView from '@/components/TrackView'
import AnchorTabs from '@/components/detail/AnchorTabs'
import ReportError from '@/components/detail/ReportError'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Poster from '@/components/Poster'
import Icon from '@/components/Icon'
import FestivalCard from '@/components/FestivalCard'
import FestivalBody from '@/components/detail/FestivalBody'
import ShareButton from '@/components/detail/ShareButton'

// 1시간마다 다시 굽는다 — 축제 데이터는 주 1회만 바뀌므로 요청마다 DB를 볼 이유가 없다
export const revalidate = 3600

// 축제 상세 — 뼈대는 트립어드바이저, 살은 구석구석.
//
// 트립어드바이저 상세의 문법(실측 2026-08-15):
//   빵부스러기 → 제목 + 우측 [저장][공유] → 신뢰 한 줄(평점·순위) → 사진 그리드(큰 1 + 작은 2)
//   → 2단: 왼쪽 본문 섹션들 / 오른쪽 sticky 정보 카드 → 하단 가로 스크롤 추천 카드
// 구석구석 상세가 가진 정보(실측): 산문 개요(더보기), 기간·주소·요금·주최·전화·인스타 아이콘 리스트,
//   먹거리 부스별 메뉴·가격, 영상, 길찾기 지도, 출처·최종 업데이트.
// 우리 것: 신뢰 줄에 '문화관광축제 지정'과 '방문객 N배'(관광빅데이터)를 놓는다 — 트립어드바이저의
//   평점 자리에 공공 데이터로 만든 근거가 들어간다.

export async function generateStaticParams() {
  // Next writes raw params into prerender filenames; Windows rejects < > : etc.
  // Unlisted IDs remain eligible for on-demand rendering (dynamicParams defaults to true).
  // Linux/Vercel keeps the full static set; Windows runtime cache writes need separate verification.
  const ids = staticFestivalSlugs(await listFestivalSlugs())
  return LANGS.flatMap((lang) => ids.map((id) => ({ lang, id })))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const route = await resolveFestivalRoute(decodeURIComponent(id), findByKey, lookupAliasTargets)
  if (!route) return {}
  const f = route.festival
  const L = localized(f, l)
  const desc = metaDescription(L, f)
  return pageMetadata({
    lang: l, path: `festivals/${encodeURIComponent(route.canonicalSlug)}`,
    title: L.name, description: desc, image: f.imageUrl,
  })
}

const fmt = (d: string) => d.replace(/-/g, '.')

export default async function FestivalDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const route = await resolveFestivalRoute(decodeURIComponent(id), findByKey, lookupAliasTargets)
  if (!route) notFound()
  if (route.isAlias) permanentRedirect(festivalRoutePath(l, route.canonicalSlug))
  const f = route.festival

  const L = localized(f, l)
  const st = statusOf(f)
  const ended = st === 'ended' && !isAlwaysOn(f)
  const fee = feeKind(f)
  const quickFee = fee === 'unknown' ? t(l, 'detail.feeUnknown') : L.fee ?? t(l, 'detail.feeUnknown')
  const longFee = quickFee.length > 55
  const quickHours = editorialField(f, l, 'hours')
  const quickDays = f.operatingWeekdays?.length ? operatingDaysLabel(f.operatingWeekdays, l) : null
  const hoursOriginal = l !== 'ko' && /[가-힣]/.test(quickHours ?? '')
  const always = isAlwaysOn(f)
  const rank = await regionRank(f)
  const [rating, reviews] = await Promise.all([ratingOf(f.externalId), reviewsOf(f.externalId)])

  const hasCoords = f.lat != null && f.lng != null

  const nearby = nearbyFestivals(f, hasCoords ? await listFestivalSummaries() : [])

  const mapHref = hasCoords ? `https://map.kakao.com/link/to/${encodeURIComponent(f.name)},${f.lat},${f.lng}` : null

  // 목차 — 어떤 칸이 있는지는 detail-view가 정하고, 사람이 읽는 이름표만 여기서 붙인다
  const SECTION_LABEL = {
    about: 'detail.about',
    program: 'detail.program',
    schedule: 'detail.schedule',
    admission: 'detail.admission',
    notes: 'detail.notes',
    location: 'detail.location',
    contact: 'detail.contact',
    reviews: 'review.title',
    nearby: 'detail.nearby',
  } as const
  const anchors = detailSections(f, { hasSummary: Boolean(L.summary), nearbyCount: nearby.length }).map((id) => ({
    id,
    label: t(l, SECTION_LABEL[id]),
  }))

  const jsonLd = festivalJsonLd({
    f,
    L,
    lang: l,
    fee,
    url: `${SITE_URL}/${l}/festivals/${toSlug(f.externalId)}/`,
  })

  const { heroSrc, ytId, sideTiles } = heroMedia(f)

  const sido = f.sido ? sidoLabel(f.sido, l) : null

  return (
    <>
      <Header lang={l} path={`festivals/${toSlug(f.externalId)}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <TrackView festivalId={f.externalId} lang={l} />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-5">
        {/* 빵부스러기 — 트립어드바이저: 유럽 › 영국 › 런던 › 즐길거리 › 이름 */}
        <nav aria-label="breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-[12px] text-hint">
          <Link href={`/${l}/`} className="hover:text-brand">{t(l, 'crumb.home')}</Link>
          <span>›</span>
          <Link href={`/${l}/festivals/`} className="hover:text-brand">{t(l, 'nav.festivals')}</Link>
          {sido && (
            <>
              <span>›</span>
              <span>{sido}</span>
            </>
          )}
          {l === 'ko' && f.sigungu && (
            <>
              <span>›</span>
              <span>{f.sigungu}</span>
            </>
          )}
          <span>›</span>
          <span className="text-muted">{L.name}</span>
        </nav>

        {/* 제목 줄 — 왼쪽 H1, 오른쪽 공유 */}
        <div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <h1 className="h-display text-[28px] leading-[1.15] text-brand sm:text-[36px]">{L.name}</h1>
            {l !== 'ko' && L.name !== f.name && (
              <div className="mt-1.5">
                {/* 축제의 고유 이름은 번역하지 않고 한국어 그대로 둔다 — 지도 앱·택시·현장 간판이 모두 이 이름이다 */}
                <p lang="ko" className="select-all text-[16px] font-semibold text-muted">{f.name}</p>
                <p className="text-[12px] leading-snug text-hint">{t(l, 'detail.koName')}</p>
              </div>
            )}
          </div>
          <ShareButton
            lang={l}
            title={L.name}
            label={t(l, 'detail.share')}
            copied={t(l, 'detail.copied')}
            festivalId={f.externalId}
            image={f.imageUrl}
            description={L.summary}
            labels={{ copy: t(l, 'share.copy'), kakao: t(l, 'share.kakao'), more: t(l, 'share.more') }}
          />
        </div>

        {/* 신뢰 줄 — 트립어드바이저의 '5.0 ●●●●● (10건) 327위' 자리. 우리는 공공 데이터 근거 */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
          {/* 평점 — 리뷰가 쌓이기 전에는 이 자리가 비고, 대신 아래 방문객 순위가 근거를 맡는다 */}
          {rating && (
            <span className="inline-flex items-center gap-1.5 text-[15px] font-bold text-ink">
              <span className="text-brand">★</span>
              {rating.average.toFixed(1)}
              <span className="text-[13px] font-semibold text-hint">
                {t(l, 'review.count', { n: rating.count })}
              </span>
            </span>
          )}
          {st === 'ongoing' && !always && (
            <span className="rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-white">{t(l, isLongRun(f) ? 'status.inPeriod' : 'status.ongoing')}</span>
          )}
          {always && <span className="rounded-full bg-surface px-3 py-1 text-[12px] font-bold text-muted">{t(l, 'status.always')}</span>}
          {/* 끝난 축제 — 검색으로 들어온 사람이 날짜를 읽기 전에 알아야 한다. 헛걸음이 제일 비싼 실수다.
              '올해는'은 종료일이 올해일 때만 쓴다. 지난해 기록에 붙으면 거짓말이 된다. */}
          {ended && (
            <span className="rounded-full bg-ink px-3 py-1 text-[12px] font-bold text-white">
              {f.endDate.slice(0, 4) === todayKst().slice(0, 4) ? t(l, 'status.ended') : t(l, 'status.endedYear', { y: f.endDate.slice(0, 4) })}
            </span>
          )}
          {/* 기간이 두 달을 넘으면 매일 열리는 게 아니다 — 여기서 못 짚어주면 헛걸음이 된다 */}
          {!always && isLongRun(f) && (
            <span className="rounded-full bg-surface px-3 py-1 text-[12px] font-bold text-muted">{t(l, 'status.selectDates')}</span>
          )}
          {f.category === 'MF' && (
            <span className="rounded-full border-2 border-brand px-3 py-1 text-[12px] font-black text-brand">{t(l, 'grade.mf')}</span>
          )}
          {f.visitorLift != null && f.visitorLift >= 1.5 && (
            <span className="rounded-full bg-brand-50 px-3 py-1 text-[12px] font-bold text-brand" title={t(l, 'lift.note')}>
              {t(l, 'lift.label', { x: f.visitorLift.toFixed(1) })}
            </span>
          )}
          {L.placeName && (
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={14} /> {L.placeName}
            </span>
          )}
        </div>

        {ended && (
          <div className="mb-5 rounded-[var(--radius-card)] bg-surface p-4 text-[14px] leading-relaxed text-ink/85">
            <p>{t(l, 'detail.endedNote')}</p>
            <Link href={`/${l}/festivals/`} className="mt-2 inline-block font-bold text-brand underline underline-offset-4">
              {t(l, 'detail.endedCta')}
            </Link>
          </div>
        )}

        {/* 바로 판단할 사실을 사진보다 앞에 둔다. 상세 본문은 이 값들의 맥락과 주의를 설명한다. */}
        <dl aria-label={t(l, 'detail.info')} className="mb-5 grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-line bg-paper text-sm sm:grid-cols-4">
          <QuickFact label={t(l, 'detail.period')} value={<span className="tabular-nums">{fmt(f.startDate)} – {fmt(f.endDate)}</span>} />
          <QuickFact label={t(l, 'detail.place')} value={(l !== 'ko' && f.address ? localizeAddress(f.address, l) : f.address) ?? L.placeName ?? t(l, 'detail.noLocation')} sub={l !== 'ko' && f.address ? <span lang="ko" className="select-all">{f.address}</span> : undefined} />
          <QuickFact label={t(l, 'detail.hours')} value={quickHours ?? t(l, 'detail.noHours')} sub={quickDays || hoursOriginal ? <>{quickDays}{hoursOriginal && <span className="block">{t(l, 'detail.original')}</span>}</> : undefined} />
          <QuickFact label={t(l, 'detail.fee')} value={longFee ? <><span className="line-clamp-2">{quickFee}</span><a href="#admission" className="mt-1 inline-block text-[12px] text-brand underline underline-offset-2">{t(l, 'detail.seeFee')}</a></> : quickFee} sub={L.feeIsOriginal ? t(l, 'detail.original') : undefined} />
        </dl>

        {/* 방문자 순위는 맥락과 산정 기준을 함께 보여주되 방문 결정에 필요한 사실 뒤에 둔다. */}
        {rank && (
          <div className="mb-5">
            <p className="text-[15px] font-bold text-ink">
              {t(l, 'rank.region', { sido: sidoLabel(f.sido!, l), total: rank.total, rank: rank.rank })}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-hint">{t(l, 'rank.note')}</p>
          </div>
        )}

        {/* 사진 그리드 — 큰 1 + 작은 2. 트립어드바이저 상세 상단. 옆 칸은 유튜브 썸네일·지도로 채운다 */}
        {/* 모바일은 히어로 한 장만(트립어드바이저와 같다). 390px에서 3열이면 옆 칸이 127px이라 아무것도 안 보인다.
            영상·지도는 아래 각자의 섹션에 그대로 있으므로 정보 손실이 없다. */}
        {f.imageNotice === 'registration-closed' && <p className="mb-3 rounded-lg bg-brand-50 p-3 text-sm font-semibold text-brand">{t(l, 'poster.registrationClosed')}</p>}
        {f.imageAttribution && <p className="mb-3 text-xs text-muted">{f.imageAttribution}</p>}
        {heroSrc && (
        <div
          data-hero
          className={`mb-8 grid gap-2 overflow-hidden rounded-[var(--radius-card)] grid-cols-1 transition-[height] duration-300 ${sideTiles.length ? 'sm:grid-cols-3' : ''}`}
          // 기본 높이. 세로형 포스터면 Poster가 로드 뒤 실제 비율로 이 높이를 키운다(components/Poster.tsx의 fitHero).
          style={{ height: 'clamp(250px, 48vw, 430px)' }}
        >
          <div className={`relative h-full overflow-hidden ${sideTiles.length ? 'sm:col-span-2' : ''}`}>
            <Poster src={heroSrc} name={L.name} letterClass="text-[5em]" whole eager />
            <a href={heroSrc.startsWith('http://') ? `/img/?u=${encodeURIComponent(heroSrc)}` : heroSrc} target="_blank" rel="noopener noreferrer" className="absolute right-3 top-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink shadow-sm">
              {{ko:'이미지 크게 보기',en:'View full image',ja:'画像を拡大',th:'ดูภาพขนาดเต็ม'}[l]}
            </a>
            {f.imageFrom === 'past' && (
              <span className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">{t(l, 'poster.past')}</span>
            )}
            {f.imageFrom === 'scraped' && f.imageSource && (
              <a
                href={sourceUrl(f.imageSource)}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="absolute bottom-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm hover:bg-ink/85"
              >
                {t(l, 'img.src')}: {sourceHost(f.imageSource)}
              </a>
            )}
          </div>
          {sideTiles.length > 0 && (
            <div className={`hidden h-full gap-2 sm:grid ${sideTiles.length === 2 ? 'grid-rows-2' : 'grid-rows-1'}`}>
              {/* key는 타일마다 달라야 한다 — 사진이 둘이면 둘 다 key="photo"라 리액트가 경고했다(2026-09-04) */}
              {sideTiles.map((tile, i) =>
                tile!.kind === 'photo' ? (
                  <a key={`photo-${i}`} href="#about" className="group relative block overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tile!.src} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                  </a>
                ) : tile!.kind === 'yt' ? (
                  <a key={`yt-${i}`} href="#video" className="group relative block overflow-hidden bg-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://i.ytimg.com/vi/${tile!.id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
                    <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-r text-white shadow">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </a>
                                ) : null,
              )}
            </div>
          )}
        </div>
        )}

        <AnchorTabs anchors={anchors} lang={l} />

        <FestivalBody f={f} L={L} lang={l} ytId={ytId} mapHref={mapHref} ended={ended} />
        {/* 리뷰 — 트립어드바이저에서 본문의 8할을 차지하는 자리 */}
        <section className="mx-auto max-w-3xl pb-16">
          <Reviews festivalId={f.externalId} lang={l} initial={reviews} />
          <ReportError festivalId={f.externalId} lang={l} />
        </section>

        {/* 근처 — 트립어드바이저 하단 가로 스크롤 추천 */}
        {nearby.length > 0 && (
          <section id="nearby" className="mt-16 scroll-mt-24">
            <h2 className="h-display mb-5 text-[22px] text-ink">{t(l, 'detail.nearby')}</h2>
            <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 no-scrollbar">
              {nearby.map(({ x, km }) => (
                <div key={x.externalId} className="w-[216px] shrink-0 snap-start sm:w-[260px]">
                  <FestivalCard f={x} lang={l} distanceKm={km} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer lang={l} />
    </>
  )
}

function QuickFact({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-r-[1px] border-line px-3 py-3 last:border-r-0 sm:border-b-0 sm:px-4">
      <dt className="mb-1 text-[12px] font-bold text-muted">{label}</dt>
      <dd className="break-words text-[14px] font-bold leading-snug text-ink">{value}</dd>
      {sub && <dd className="mt-1 text-[12px] leading-snug text-muted">{sub}</dd>}
    </div>
  )
}
