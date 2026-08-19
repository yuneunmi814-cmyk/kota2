import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { allFestivals, distanceKm, feeKind, findByKey, isAlwaysOn, isLongRun, isPublicData, localized, regionRank, statusOf } from '@/lib/festivals'
import { fromSlug, toSlug } from '@/lib/slug'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
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
  const ids = (await allFestivals()).map((f) => toSlug(f.externalId))
  return LANGS.flatMap((lang) => ids.map((id) => ({ lang, id })))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const f = await findByKey(fromSlug(decodeURIComponent(id)))
  if (!f) return {}
  const L = localized(f, l)
  const desc = [L.summary, `${f.startDate} ~ ${f.endDate}`, L.placeName].filter(Boolean).join(' · ').slice(0, 160)
  return {
    title: `${L.name} · KOTA`,
    description: desc,
    alternates: {
      canonical: `${SITE_URL}/${l}/festivals/${toSlug(f.externalId)}/`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/festivals/${toSlug(f.externalId)}/`])),
    },
    openGraph: { title: L.name, description: desc, ...(f.imageUrl ? { images: [f.imageUrl] } : {}), type: 'website' },
  }
}

// 출처 표기 — 문자열에서 주소를 뽑아 쓴다.
//
// imageSource에 주소만 들어오리라 믿고 new URL()에 그대로 넣었더니 빌드가 깨졌다
// (2026-08-19, 국가유산 미디어아트). 손으로 모은 포스터의 출처는 "○○재단 공식 홈페이지
// https://..." 처럼 설명이 붙은 문장으로 들어오기도 한다. 데이터도 정리하지만 화면 쪽도
// 이상한 값에 안 죽게 둔다 — 출처 한 줄 때문에 1,891페이지 빌드가 멈추는 건 균형이 안 맞는다.
const firstUrl = (raw: string) => raw.match(/https?:\/\/[^\s)]+/)?.[0] ?? null
const sourceUrl = (raw: string) => firstUrl(raw) ?? undefined
function sourceHost(raw: string): string {
  const u = firstUrl(raw)
  if (!u) return raw.slice(0, 24)
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return raw.slice(0, 24)
  }
}

const fmt = (d: string) => d.replace(/-/g, '.')
const won = (n: number, l: Lang) => t(l, 'detail.won', { n: n.toLocaleString(l === 'ko' ? 'ko-KR' : 'en-US') })

export default async function FestivalDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const f = await findByKey(fromSlug(decodeURIComponent(id)))
  if (!f) notFound()

  const L = localized(f, l)
  const st = statusOf(f)
  const fee = feeKind(f)
  const always = isAlwaysOn(f)
  const rank = await regionRank(f)
  const [rating, reviews] = await Promise.all([ratingOf(f.externalId), reviewsOf(f.externalId)])

  const hasCoords = f.lat != null && f.lng != null

  const nearby = hasCoords
    ? (await allFestivals())
        .filter((x) => x.externalId !== f.externalId && x.lat != null && x.lng != null && statusOf(x) !== 'ended' && !isAlwaysOn(x))
        .map((x) => ({ x, km: distanceKm({ lat: f.lat as number, lng: f.lng as number }, { lat: x.lat as number, lng: x.lng as number }) }))
        .filter((o) => o.km <= 30)
        .sort((a, b) => a.km - b.km)
        .slice(0, 8)
    : []

  const mapHref = hasCoords ? `https://map.kakao.com/link/to/${encodeURIComponent(f.name)},${f.lat},${f.lng}` : null
  const boothCount = f.booths?.length ?? 0
  const menuCount = f.booths?.reduce((n, b) => n + b.menu.length, 0) ?? 0

  // 목차 — 그 섹션이 실제로 그려질 때만 넣는다
  const anchors = [
    L.summary ? { id: 'about', label: t(l, 'detail.about') } : null,
    (f.photos?.length ?? 0) > 0 ? { id: 'photos', label: t(l, 'detail.photos') } : null,
    f.lineup ? { id: 'lineup', label: t(l, 'detail.lineup') } : null,
    f.program ? { id: 'program', label: t(l, 'detail.program') } : null,
    hasCoords ? { id: 'location', label: t(l, 'detail.location') } : null,
    { id: 'reviews', label: t(l, 'review.title') },
    nearby.length > 0 ? { id: 'nearby', label: t(l, 'detail.nearby') } : null,
  ].filter((x): x is { id: string; label: string } => x !== null)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Festival',
    name: L.name,
    ...(L.summary ? { description: L.summary } : {}),
    startDate: f.startDate,
    endDate: f.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: l,
    location: {
      '@type': 'Place',
      name: L.placeName ?? f.address ?? 'Korea',
      ...(f.address ? { address: f.address } : {}),
      ...(hasCoords ? { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } } : {}),
    },
    ...(f.imageUrl ? { image: [f.imageUrl] } : {}),
    ...(f.organizer ? { organizer: { '@type': 'Organization', name: f.organizer } } : {}),
    // 모르면 아예 말하지 않는다. 요금을 모르는 축제에 isAccessibleForFree: true 를 넣으면
    // 검색엔진에도 "무료"라고 알리는 셈이고, 그건 화면의 거짓말이 검색결과까지 번지는 것이다.
    ...(fee === 'unknown' ? {} : { isAccessibleForFree: fee === 'free' }),
    url: `${SITE_URL}/${l}/festivals/${toSlug(f.externalId)}/`,
  }

  // 히어로에 쓸 사진. 대표 이미지가 없으면 갤러리 첫 장이라도 쓴다.
  // 둘 다 없으면 heroSrc 는 null 이고, 그때는 히어로 자체를 그리지 않는다 —
  // 420건 중 183건(43%)이 포스터가 없는데, 그 화면에서 폭 2/3짜리 회색 상자에
  // 축제명 첫 글자만 크게 뜨는 건 정보가 아니라 빈자리다. 목록 카드에서는 같은
  // 자리채움이 제 몫을 한다(수백 장이 같은 아이콘이면 만들다 만 화면으로 읽힌다).
  // 상세는 한 장뿐이라 사정이 다르다. 접으면 소개와 지도가 그만큼 위로 올라온다.
  const heroSrc = f.imageUrl ?? f.photos?.[0]?.url ?? null

  // 사진 그리드에 뭘 채울지 — 포스터, 유튜브 썸네일, 지도. 없는 칸은 접는다
  const ytId = f.youtube?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null
  // 옆 칸 우선순위: 실제 축제 사진 → 영상 → 지도. 사진이 있으면 그게 가장 정직한 대표 이미지다
  const extraPhoto = f.photos?.[1] ?? null
  // 곁타일 — 사진과 영상. 사진이 둘 이상이면 사진을 먼저 쓴다(축제는 눈으로 파는 것이라).
  //
  // 사진이 모자랄 때 지도로 칸을 메우고 있었는데 뺐다(2026-08-19).
  //  · 아래 '위치'에 같은 지도가 이미 있어 한 페이지에 같은 지도가 두 번 그려졌다(BUG-19).
  //  · 타일을 <a href="#location">으로 감쌌는데 KakaoMap 안에 카카오맵으로 나가는 <a>가 또
  //    있어 앵커가 중첩됐다. 잘못된 HTML이라 하이드레이션이 통째로 깨졌고, 그 페이지의
  //    클라이언트 기능이 전부 죽었다 — 리포트에 없던 건이다.
  // 칸이 비면 그리드가 알아서 좁아진다. 지도를 두 번 그리는 것보다 낫다.
  const photo2 = f.photos?.[2] ?? null
  const sideTiles = [
    extraPhoto ? { kind: 'photo' as const, src: extraPhoto.thumb } : ytId ? { kind: 'yt' as const, id: ytId } : null,
    photo2
      ? { kind: 'photo' as const, src: photo2.thumb }
      : ytId && extraPhoto
        ? { kind: 'yt' as const, id: ytId }
        : null,
  ].filter(Boolean)

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
        {rank && (
          <p className="mb-5 text-[15px] font-bold text-ink" title={t(l, 'rank.note')}>
            {t(l, 'rank.region', { sido: sidoLabel(f.sido!, l), total: rank.total, rank: rank.rank })}
          </p>
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
            <Poster src={heroSrc} name={L.name} letterClass="text-[5em]" />
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
              {sideTiles.map((tile) =>
                tile!.kind === 'photo' ? (
                  <a key="photo" href="#photos" className="group relative block overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tile!.src} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                  </a>
                ) : tile!.kind === 'yt' ? (
                  <a key="yt" href="#video" className="group relative block overflow-hidden bg-ink">
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
                <Gallery
                  photos={f.photos}
                  title={L.name}
                  sourceLabel={t(l, 'detail.photos.src')}
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
                    {t(l, 'detail.booth.n', { n: boothCount })} · {t(l, 'detail.menu.n', { n: menuCount })}
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
                      <Icon name="instagram" size={15} className="text-insta" /> Instagram
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
