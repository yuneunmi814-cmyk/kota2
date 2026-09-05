import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { feeKind, findByKey, isAlwaysOn, isLongRun, isPublicData, listFestivalSlugs, localized, statusOf } from '@/lib/festivals'
import { detailSections, festivalJsonLd, heroMedia, sourceHost, sourceUrl } from '@/lib/detail-view'
import { loadDetailExtras } from '@/lib/detail-loader'
import { detailMetadata } from '@/lib/detail-metadata'
import { toSlug } from '@/lib/slug'
import { festivalRoutePath, resolveFestivalRoute } from '@/lib/festival-routes'
import { lookupAliasTargets } from '@/lib/route-aliases'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { sidoLabel } from '@/lib/sido'
import Reviews from '@/components/detail/Reviews'
import TrackView from '@/components/TrackView'
import AnchorTabs from '@/components/detail/AnchorTabs'
import ReportError from '@/components/detail/ReportError'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Poster from '@/components/Poster'
import Icon from '@/components/Icon'
import FestivalCard from '@/components/FestivalCard'
import KakaoMap from '@/components/KakaoMap'
import ReadMore from '@/components/detail/ReadMore'
import ShareButton from '@/components/detail/ShareButton'
import YouTube from '@/components/detail/YouTube'
import Gallery from '@/components/detail/Gallery'

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
  const ids = await listFestivalSlugs()
  return LANGS.flatMap((lang) => ids.map((id) => ({ lang, id })))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const route = await resolveFestivalRoute(decodeURIComponent(id), findByKey, lookupAliasTargets)
  if (!route) return {}
  return detailMetadata(route.festival, l)
}

const fmt = (d: string) => d.replace(/-/g, '.')
const won = (n: number, l: Lang) => t(l, 'detail.won', { n: n.toLocaleString(l === 'ko' ? 'ko-KR' : 'en-US') })

export default async function FestivalDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const route = await resolveFestivalRoute(decodeURIComponent(id), findByKey, lookupAliasTargets)
  if (!route) notFound()
  if (route.isAlias) permanentRedirect(festivalRoutePath(l, route.canonicalSlug))
  const f = route.festival

  const L = localized(f, l)
  const st = statusOf(f)
  const fee = feeKind(f)
  const always = isAlwaysOn(f)
  const { rank, rating, reviews, hasCoords, nearby } = await loadDetailExtras(f)

  const mapHref = hasCoords ? `https://map.kakao.com/link/to/${encodeURIComponent(f.name)},${f.lat},${f.lng}` : null
  const boothCount = f.booths?.length ?? 0
  const menuCount = f.booths?.reduce((n, b) => n + b.menu.length, 0) ?? 0

  // 목차 — 어떤 칸이 있는지는 detail-view가 정하고, 사람이 읽는 이름표만 여기서 붙인다
  const SECTION_LABEL = {
    about: 'detail.about',
    photos: 'detail.photos',
    lineup: 'detail.lineup',
    program: 'detail.program',
    location: 'detail.location',
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
            {l !== 'ko' && L.name !== f.name && <p className="mt-1 text-[14px] text-hint">{f.name}</p>}
          </div>
          <ShareButton
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
            <span className="rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-white">{t(l, 'status.ongoing')}</span>
          )}
          {always && <span className="rounded-full bg-surface px-3 py-1 text-[12px] font-bold text-muted">{t(l, 'status.always')}</span>}
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

        {/* 지역 내 순위 — 트립어드바이저가 '서울의 즐길거리 1,619개 중에서 5위'를 놓는 자리.
            그쪽 근거는 리뷰 평점이고 우리 근거는 통신사 방문자 실측이다. 뱃지가 아니라 문장으로
            두는 이유: 이게 이 페이지에서 가장 무거운 한 줄이라 뱃지 무리에 섞이면 묻힌다. */}
        {/* 산정 기준을 화면에 적는다.
            전에는 title 속성에만 있었다 — 마우스를 올려야 보이니 모바일에서는 볼 방법이 아예
            없었고, 데스크톱에서도 '올려보면 나온다'는 것을 알 도리가 없다(BUG-09, 2026-08-23).
            근거를 숨긴 순위는 근거가 없는 것과 같다. title은 남겨 둔다 — 지우면 손해는 없지만
            이득도 없다. */}
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
        {heroSrc && (
        <div
          className={`mb-8 grid gap-2 overflow-hidden rounded-[var(--radius-card)] grid-cols-1 ${sideTiles.length ? 'sm:grid-cols-3' : ''}`}
          style={{ height: 'clamp(210px, 52vw, 440px)' }}
        >
          <div className={`relative h-full overflow-hidden ${sideTiles.length ? 'sm:col-span-2' : ''}`}>
            <Poster src={heroSrc} name={L.name} letterClass="text-[5em]" whole eager />
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
                  <a key={`photo-${i}`} href="#photos" className="group relative block overflow-hidden">
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

        {/* 2단 — 왼쪽 본문 / 오른쪽 sticky 정보 카드 */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            {/* 소개 */}
            {(L.summary || f.summary) && (
              <section id="about" className="mb-10 scroll-mt-24">
                <h2 className="mb-3 text-[20px] font-black text-ink">{t(l, 'detail.about')}</h2>
                <ReadMore text={L.summary ?? f.summary ?? ''} more={t(l, 'detail.more')} less={t(l, 'detail.less')} />
              </section>
            )}

            {/* 사진 — TourAPI 갤러리. 263건이 평균 5장을 갖고 있다 */}
            {f.photos && f.photos.length > 0 && (
              <section id="photos" className="mb-10 scroll-mt-24">
                <h2 className="mb-3 text-[20px] font-black text-ink">{t(l, 'detail.photos')}</h2>
                {/* 사진 출처는 사진에 맞춰 고른다.
                    전에는 어떤 사진이든 '한국관광공사(공공누리 제3유형)'를 붙였다. 그런데 주최측
                    누리집에서 긁어온 사진도 섞여 있다 — cdn.imweb.me 같은 곳이다. 남의 사진에 공사
                    출처를 달아 둔 셈이고, 공공누리 3유형이 아닌 것을 3유형이라 표시한 것이라
                    저작권과 채점 양쪽으로 위험했다(2026-08-23 영어 화면 점검).
                    공사 사진은 전부 visitkorea.or.kr에서 온다 — 그것으로 가른다. */}
                <Gallery
                  photos={f.photos}
                  title={L.name}
                  sourceLabel={t(
                    l,
                    f.photos.every((p) => /(^|\.)visitkorea\.or\.kr\//.test(p.url))
                      ? 'detail.photos.src'
                      : 'detail.photos.srcOrganizer',
                  )}
                  prevLabel={t(l, 'gallery.prev')}
                  nextLabel={t(l, 'gallery.next')}
                  closeLabel={t(l, 'gallery.close')}
                />
              </section>
            )}

            {/* 먹거리 — 구석구석의 부스·메뉴·가격. 외국인에게 '얼마인지'가 정보다 */}
            {boothCount > 0 && (
              <section className="mb-10">
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 className="text-[20px] font-black text-ink">
                    <Icon name="utensils" size={18} className="-mt-1 mr-1 inline text-brand" />
                    {t(l, 'detail.food')}
                  </h2>
                  <span className="text-[13px] text-hint">
                    {t(l, boothCount === 1 ? 'detail.booth.n1' : 'detail.booth.n', { n: boothCount })} · {t(l, menuCount === 1 ? 'detail.menu.n1' : 'detail.menu.n', { n: menuCount })}
                  </span>
                </div>
                {f.boothsFromPastEdition && (
                  <p className="mb-3 rounded-lg bg-brand-50 px-3 py-2 text-[13px] text-brand-600">{t(l, 'detail.booth.past')}</p>
                )}
                <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
                  {f.booths!.slice(0, 12).map((b) => (
                    <details key={b.name} className="group px-4 py-3" open={boothCount <= 3}>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                        <span className="truncate">{b.name}</span>
                        <span className="shrink-0 text-[12px] font-semibold text-hint">{t(l, 'detail.menu.n', { n: b.menu.length })}</span>
                      </summary>
                      {b.menu.length > 0 && (
                        <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2">
                          {b.menu.slice(0, 20).map((m, i) => (
                            <li key={`${m.name}-${i}`} className="flex items-baseline justify-between gap-3 border-b border-dotted border-line/80 pb-1">
                              <span className="truncate text-ink/85">{m.name}</span>
                              {m.price != null && <span className="shrink-0 tabular-nums font-bold text-brand">{won(m.price, l)}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* 프로그램 */}
            {/* 출연 라인업 — 공공 API에 없는 정보다(TourAPI·문화포털 모두).
                그런데 음악 페스티벌에서 사람들이 가장 먼저 찾는 게 '누가 나오는가'다.
                프로그램에 섞으면 묻히므로 위에 따로, 목차에도 따로 둔다. */}
            {f.lineup && (
              <section id="lineup" className="mb-10 scroll-mt-24">
                <h2 className="mb-3 text-[20px] font-black text-ink">{t(l, 'detail.lineup')}</h2>
                <p className="whitespace-pre-line rounded-[var(--radius-card)] border border-line p-5 text-[15px] leading-relaxed text-ink/85">
                  {f.lineup}
                </p>
              </section>
            )}

            {f.program && (
              <section id="program" className="mb-10 scroll-mt-24">
                <h2 className="mb-3 text-[20px] font-black text-ink">{t(l, 'detail.program')}</h2>
                <p className="whitespace-pre-line rounded-[var(--radius-card)] bg-surface p-5 text-[15px] leading-relaxed text-ink/85">{f.program}</p>
              </section>
            )}

            {/* 영상 */}
            {f.youtube && ytId && (
              <section id="video" className="mb-10 scroll-mt-24">
                <h2 className="mb-3 text-[20px] font-black text-ink">{t(l, 'detail.video')}</h2>
                <YouTube url={f.youtube} title={L.name} />
              </section>
            )}

            {/* 위치 */}
            {hasCoords && (
              <section id="location" className="mb-10 scroll-mt-24">
                <h2 className="mb-3 text-[20px] font-black text-ink">{t(l, 'detail.location')}</h2>
                <KakaoMap
                  lat={f.lat as number}
                  lng={f.lng as number}
                  label={f.address ?? L.placeName ?? L.name}
                  festivalId={f.externalId}
                  linkLabel={t(l, 'map.open')}
                  loadingLabel={t(l, 'map.loading')}
                />
                {f.address && <p className="mt-2 text-[14px] text-muted">{f.address}</p>}
              </section>
            )}

            {/* 공식 홈페이지 — 우리 데이터는 공공 API 스냅샷이라 일정 변경·예매는 주최측이 정확하다.
                여행자가 마지막에 확인해야 할 곳이므로 본문 끝에 크게 놓는다. */}
            {(f.homepage || f.instagram || f.tel) && (
              <section className="mb-10 rounded-[var(--radius-card)] border-2 border-brand/25 bg-brand-50/60 p-5">
                <h2 className="mb-1 text-[17px] font-black text-brand">{t(l, 'official.title')}</h2>
                <p className="mb-4 text-[13px] leading-relaxed text-muted">{t(l, 'official.sub')}</p>
                <div className="flex flex-wrap gap-2">
                  {f.homepage && (
                    <a
                      href={f.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-600"
                    >
                      <Icon name="link" size={15} /> {t(l, 'official.visit')}
                    </a>
                  )}
                  {f.instagram && (
                    <a
                      href={f.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-bold text-ink transition hover:border-insta/50 hover:text-insta"
                    >
                      <Icon name="instagram" size={15} className="text-insta" /> {t(l, 'official.insta')}
                    </a>
                  )}
                  {f.tel && (
                    <a
                      href={`tel:${f.tel}`}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-[14px] font-bold text-ink transition hover:border-brand/40 hover:text-brand"
                    >
                      <Icon name="phone" size={15} /> {f.tel}
                    </a>
                  )}
                </div>
                {f.homepage && (
                  <p className="mt-3 truncate text-[12px] text-hint">{f.homepage.replace(/^https?:\/\//, '')}</p>
                )}
              </section>
            )}

            <p className="text-[12px] leading-relaxed text-hint">
            {t(l, isPublicData(f) ? 'detail.source' : 'detail.source.manual')}
          </p>
          </div>

          {/* 오른쪽 — sticky 정보 카드. 트립어드바이저의 '시간' 카드 자리 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[0_8px_28px_-16px_rgba(79,50,22,.25)]">
              <h2 className="mb-4 text-[15px] font-black text-ink">{t(l, 'detail.info')}</h2>
              <dl className="space-y-3.5 text-[14px]">
                <Row icon="calendar" label={t(l, 'detail.period')}>
                  <span className="tabular-nums font-semibold">{fmt(f.startDate)} – {fmt(f.endDate)}</span>
                </Row>
                {f.hours && <Row icon="clock" label={t(l, 'detail.hours')}>{f.hours}</Row>}
                {/* 요금은 셋이다 — 무료 / 유료 / 모름. 모르는 것을 「무료」라고 하지 않는다.
                    공공 API가 요금을 안 준 축제가 425건 중 300건이고, 그건 공짜라는 뜻이
                    아니다. 유료 축제를 싣기 시작하면 이 단정이 실제 피해가 된다. */}
                <Row icon="ticket" label={t(l, 'detail.fee')}>
                  {fee === 'unknown' ? (
                    <span className="text-hint">{t(l, 'detail.feeUnknown')}</span>
                  ) : (
                    <span className={fee === 'free' ? 'font-bold text-brand' : ''}>{f.fee}</span>
                  )}
                </Row>
                {(f.address || L.placeName) && (
                  <Row icon="pin" label={t(l, 'detail.place')}>
                    <span className="break-keep">{f.address ?? L.placeName}</span>
                  </Row>
                )}
                {f.ageInfo && <Row icon="user" label={t(l, 'detail.age')}>{f.ageInfo}</Row>}
                {f.organizer && <Row icon="user" label={t(l, 'detail.organizer')}>{f.organizer}</Row>}
                {f.tel && (
                  <Row icon="phone" label={t(l, 'detail.tel')}>
                    <a href={`tel:${f.tel}`} className="font-semibold text-brand hover:underline">{f.tel}</a>
                  </Row>
                )}
              </dl>

              <div className="mt-5 flex flex-col gap-2">
                {/* 길찾기는 카카오맵으로 나간다 — 그러니 카카오 노랑을 입는다.
                    우리 초록으로 두면 사이트 안에서 뭔가 열리는 버튼처럼 보인다. */}
                {mapHref && (
                  <a href={mapHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-kakao px-5 py-3 text-[15px] font-bold text-kakao-ink transition hover:brightness-95">
                    <Icon name="pin" size={17} /> {t(l, 'detail.directions')}
                  </a>
                )}
                <div className="flex gap-2">
                  {f.homepage && (
                    <a href={f.homepage} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-[13px] font-bold text-ink transition hover:border-brand/40 hover:text-brand">
                      <Icon name="link" size={15} /> {t(l, 'detail.homepage')}
                    </a>
                  )}
                  {f.instagram && (
                    <a href={f.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-[13px] font-bold text-ink transition hover:border-insta/50 hover:text-insta">
                      <Icon name="instagram" size={15} className="text-insta" /> {t(l, 'official.insta')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* 리뷰 — 트립어드바이저에서 본문의 8할을 차지하는 자리 */}
        <section className="mx-auto max-w-6xl px-5 pb-16">
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

function Row({ icon, label, children }: { icon: Parameters<typeof Icon>[0]['name']; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="flex items-center gap-1.5 text-muted sm:w-24 sm:shrink-0">
        <Icon name={icon} size={15} className="text-brand" />
        <span className="font-semibold">{label}</span>
      </dt>
      <dd className="min-w-0 flex-1 pl-[22px] text-ink sm:pl-0">{children}</dd>
    </div>
  )
}
