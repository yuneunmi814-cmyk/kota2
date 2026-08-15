import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { allFestivals, distanceKm, findByKey, isAlwaysOn, localized, statusOf } from '@/lib/festivals'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Poster from '@/components/Poster'
import Icon from '@/components/Icon'
import FestivalCard from '@/components/FestivalCard'
import StaticMap from '@/components/StaticMap'

// 축제 상세 — 715건 × 4언어 = 2,860장을 빌드 시 전부 찍는다.
//
// 이게 재구현의 핵심 산출물이다. 이전엔 <noscript>에 본문을 밀어 넣는 우회였고
// 언어는 URL에 없었다. 여기서는 일본어 상세가 /ja/festivals/{id}/ 라는 자기 URL을 갖고,
// <html lang="ja">, 일본어 <title>, hreflang 4개, Event JSON-LD를 실제 HTML로 가진다.

export function generateStaticParams() {
  const ids = allFestivals().map((f) => f.externalId)
  return LANGS.flatMap((lang) => ids.map((id) => ({ lang, id })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}): Promise<Metadata> {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const f = findByKey(decodeURIComponent(id))
  if (!f) return {}
  const L = localized(f, l)
  const desc = [L.summary, `${f.startDate} ~ ${f.endDate}`, L.placeName].filter(Boolean).join(' · ').slice(0, 160)
  return {
    title: `${L.name} · KOTA`,
    description: desc,
    alternates: {
      canonical: `${SITE_URL}/${l}/festivals/${f.externalId}/`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/festivals/${f.externalId}/`])),
    },
    openGraph: {
      title: L.name,
      description: desc,
      ...(f.imageUrl ? { images: [f.imageUrl] } : {}),
      type: 'website',
    },
  }
}

const fmt = (d: string) => d.replace(/-/g, '.')

export default async function FestivalDetailPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const f = findByKey(decodeURIComponent(id))
  if (!f) notFound()

  const L = localized(f, l)
  const st = statusOf(f)
  const always = isAlwaysOn(f)

  // 이 근처 다른 축제 — 좌표가 있으면 30km 안, 진행중·예정만
  const nearby =
    f.lat != null && f.lng != null
      ? allFestivals()
          .filter((x) => x.externalId !== f.externalId && x.lat != null && x.lng != null && statusOf(x) !== 'ended' && !isAlwaysOn(x))
          .map((x) => ({ x, km: distanceKm({ lat: f.lat as number, lng: f.lng as number }, { lat: x.lat as number, lng: x.lng as number }) }))
          .filter((o) => o.km <= 30)
          .sort((a, b) => a.km - b.km)
          .slice(0, 4)
      : []

  const mapHref =
    f.lat != null && f.lng != null
      ? `https://map.kakao.com/link/to/${encodeURIComponent(f.name)},${f.lat},${f.lng}`
      : null

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
      ...(f.lat != null && f.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } } : {}),
    },
    ...(f.imageUrl ? { image: [f.imageUrl] } : {}),
    isAccessibleForFree: true,
    url: `${SITE_URL}/${l}/festivals/${f.externalId}/`,
  }

  return (
    <>
      <Header lang={l} path={`festivals/${f.externalId}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <Link href={`/${l}/festivals/`} className="mb-6 inline-flex items-center gap-1 text-[14px] font-bold text-muted hover:text-brand">
          <Icon name="arrow" size={15} className="rotate-180" /> {t(l, 'detail.back')}
        </Link>

        <div className="relative mb-7 aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] bg-surface">
          <Poster src={f.imageUrl} name={L.name} letterClass="text-[4.5em]" />
          {f.imageFrom === 'past' && (
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {t(l, 'poster.past')}
            </span>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-muted">
          {st === 'ongoing' && !always && (
            <span className="sticker rounded-full bg-y px-3 py-1 text-[12px] font-black text-on-y">{t(l, 'status.ongoing')}</span>
          )}
          {always && <span className="rounded-full bg-surface px-3 py-1 text-[12px] font-bold text-muted">{t(l, 'status.always')}</span>}
          {f.category === 'MF' && (
            <span className="rounded-full border-2 border-brand px-3 py-1 text-[12px] font-black text-brand">{t(l, 'grade.mf')}</span>
          )}
          {f.visitorLift != null && f.visitorLift >= 1.5 && (
            <span className="rounded-full bg-tint-r px-3 py-1 text-[12px] font-black text-on-r" title={t(l, 'lift.note')}>
              {t(l, 'lift.label', { x: f.visitorLift.toFixed(1) })}
            </span>
          )}
          {L.placeName && <span>{L.placeName}</span>}
        </div>

        <h1 className="h-display mb-2 text-[30px] text-brand sm:text-[38px]">{L.name}</h1>
        {l !== 'ko' && L.name !== f.name && <p className="mb-5 text-[15px] text-hint">{f.name}</p>}

        {L.summary && <p className="mb-8 text-[16px] leading-relaxed text-ink/85">{L.summary}</p>}

        <dl className="mb-8 grid grid-cols-[92px_1fr] gap-x-4 gap-y-3 border-t border-line pt-6 text-[15px]">
          <dt className="font-bold text-muted">{t(l, 'detail.period')}</dt>
          <dd className="tabular-nums">{fmt(f.startDate)} – {fmt(f.endDate)}</dd>
          {f.address && (
            <>
              <dt className="font-bold text-muted">{t(l, 'detail.place')}</dt>
              <dd>{f.address}</dd>
            </>
          )}
          {f.fee && (
            <>
              <dt className="font-bold text-muted">{l === 'ko' ? '요금' : l === 'ja' ? '料金' : l === 'th' ? 'ค่าเข้า' : 'Admission'}</dt>
              <dd>{f.fee}</dd>
            </>
          )}
          {f.tel && (
            <>
              <dt className="font-bold text-muted">{t(l, 'detail.tel')}</dt>
              <dd><a href={`tel:${f.tel}`} className="hover:underline">{f.tel}</a></dd>
            </>
          )}
          {f.homepage && (
            <>
              <dt className="font-bold text-muted">{t(l, 'detail.homepage')}</dt>
              <dd className="break-all">
                <a href={f.homepage} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                  {f.homepage.replace(/^https?:\/\//, '').slice(0, 60)}
                </a>
              </dd>
            </>
          )}
          {f.instagram && (
            <>
              <dt className="font-bold text-muted">Instagram</dt>
              <dd className="break-all">
                <a href={f.instagram} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                  @{f.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')}
                </a>
              </dd>
            </>
          )}
        </dl>

        {f.program && (
          <section className="mb-8 rounded-[var(--radius-card)] bg-surface p-5">
            <h2 className="mb-2 text-[14px] font-black text-muted">{l === 'ko' ? '프로그램' : l === 'ja' ? 'プログラム' : l === 'th' ? 'โปรแกรม' : 'Program'}</h2>
            <p className="text-[15px] leading-relaxed text-ink/85">{f.program}</p>
          </section>
        )}

        {f.lat != null && f.lng != null && (
          <section className="mb-8">
            <StaticMap lat={f.lat} lng={f.lng} label={f.address ?? L.placeName ?? L.name} />
            {mapHref && (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:bg-brand-600"
              >
                <Icon name="pin" size={17} /> {t(l, 'detail.directions')}
              </a>
            )}
          </section>
        )}

        {nearby.length > 0 && (
          <section className="mt-16">
            <h2 className="h-display mb-5 text-[22px] text-ink">{t(l, 'detail.nearby')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {nearby.map(({ x, km }) => (
                <FestivalCard key={x.externalId} f={x} lang={l} distanceKm={km} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer lang={l} />
    </>
  )
}
