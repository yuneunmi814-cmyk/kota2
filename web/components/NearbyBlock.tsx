'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { distanceKm, isAlwaysOn, localized, statusOf, type Festival } from '@/lib/festivals'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import FestivalCard from './FestivalCard'
import Icon from './Icon'

// '내 주변' — 홈에 들어오자마자 위치를 묻는다(kfes와 같은 방식, 8/15 결정).
//
// 트레이드오프를 알고 쓰는 것: 진입 즉시 요청은 거부율이 높고 거부당하면 복구가 어렵다.
// 대신 이 서비스의 첫 화면 가치가 '지금 여기서 뭐 하지'이므로, 한 번 더 누르게 하면
// 그 가치가 안 보인다. 거부한 사용자를 위해 다시 요청하는 버튼을 남겨 둔다.

const RADIUS_KM = 20

type State =
  | { k: 'asking' }
  | { k: 'ok'; coords: { lat: number; lng: number } }
  | { k: 'denied' }
  | { k: 'unsupported' }

export default function NearbyBlock({ all, lang }: { all: Festival[]; lang: Lang }) {
  const [state, setState] = useState<State>({ k: 'asking' })

  const ask = () => {
    if (!navigator.geolocation) return setState({ k: 'unsupported' })
    setState({ k: 'asking' })
    navigator.geolocation.getCurrentPosition(
      (p) => setState({ k: 'ok', coords: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      () => setState({ k: 'denied' }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
  }

  useEffect(ask, [])

  if (state.k === 'unsupported') return null

  if (state.k === 'denied') {
    return (
      <section className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-muted">{t(lang, 'nearby.denied')}</p>
          <button
            onClick={ask}
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-600"
          >
            {t(lang, 'nearby.retry')}
          </button>
        </div>
      </section>
    )
  }

  if (state.k === 'asking') {
    return (
      <section className="mx-auto max-w-6xl px-5">
        <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-5 text-[15px] text-hint">
          <Icon name="pin" size={17} />
          {t(lang, 'nearby.asking')}
        </div>
      </section>
    )
  }

  const near = all
    .filter((f) => f.lat != null && f.lng != null && statusOf(f) === 'ongoing' && !isAlwaysOn(f))
    .map((f) => ({ f, km: distanceKm(state.coords, { lat: f.lat as number, lng: f.lng as number }) }))
    .filter((x) => x.km <= RADIUS_KM)
    .sort((a, b) => a.km - b.km)

  return (
    <section className="mx-auto max-w-6xl px-5">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="h-display text-[26px] text-ink sm:text-[30px]">{t(lang, 'nearby.title')}</h2>
          <p className="mt-1 text-[14px] text-muted">
            {near.length > 0
              ? t(lang, 'nearby.found', { n: near.length, r: RADIUS_KM })
              : t(lang, 'nearby.none', { r: RADIUS_KM })}
          </p>
        </div>
        <Link
          href={`/${lang}/festivals/?sort=distance`}
          className="hidden shrink-0 items-center gap-1 text-[14px] font-bold text-brand hover:underline sm:flex"
        >
          {t(lang, 'nearby.seeAll')} <Icon name="arrow" size={15} />
        </Link>
      </div>

      {near.length > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {near.slice(0, 4).map(({ f, km }) => (
            <FestivalCard key={f.externalId} f={f} lang={lang} distanceKm={km} />
          ))}
        </div>
      )}

      {near.length === 0 && (
        <Link
          href={`/${lang}/festivals/?sort=distance`}
          className="inline-flex items-center gap-1 text-[15px] font-bold text-brand hover:underline"
        >
          {t(lang, 'nearby.seeAll')} <Icon name="arrow" size={16} />
        </Link>
      )}
    </section>
  )
}

/** 목록 정렬용 — 다른 화면에서도 같은 반경을 쓴다 */
export { RADIUS_KM }
