'use client'
import { useState } from 'react'
import { requestPosition } from '@/lib/geo'
import Link from 'next/link'
import { distanceKm, isAlwaysOn, localized, statusOf, type Festival } from '@/lib/festivals'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import FestivalCard from './FestivalCard'
import Icon from './Icon'

// '내 주변' — 사용자가 필요를 드러낸 뒤에만 위치를 묻는다.
// 진입 직후 권한 팝업은 거부율이 높으므로, 먼저 어떤 정보를 받는지 설명하고 선택권을 둔다.

const RADIUS_KM = 20

type State =
  | { k: 'idle' }
  | { k: 'asking' }
  | { k: 'ok'; coords: { lat: number; lng: number } }
  /** 브라우저가 막았다 — 다시 눌러도 창이 안 뜬다 */
  | { k: 'blocked' }
  /** 위치를 못 잡았다 — 다시 눌러볼 만하다 */
  | { k: 'unavailable' }
  | { k: 'timeout' }
  | { k: 'unsupported' }

export default function NearbyBlock({ all, lang }: { all: Festival[]; lang: Lang }) {
  const [state, setState] = useState<State>({ k: 'idle' })

  const ask = async () => {
    setState({ k: 'asking' })
    const r = await requestPosition()
    setState(r.k === 'ok' ? { k: 'ok', coords: r.coords } : { k: r.k })
  }

  if (state.k === 'unsupported') return null

  if (state.k === 'idle') {
    return (
      <section className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="h-display text-[22px] text-ink sm:text-[24px]">{t(lang, 'nearby.title')}</h2>
            <p className="mt-1 text-[14px] text-muted">{t(lang, 'nearby.startNote')}</p>
          </div>
          <button
            onClick={ask}
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-600"
          >
            {t(lang, 'nearby.start')}
          </button>
        </div>
      </section>
    )
  }

  // 브라우저가 막아둔 상태. 여기서 '다시 시도' 버튼을 주면 안 된다 —
  // 눌러도 허용창이 뜨지 않아 같은 화면으로 돌아올 뿐이고, 그게 '아무 반응 없음'으로 보인다.
  // 버튼 대신 푸는 방법을 적는다.
  if (state.k === 'blocked') {
    return (
      <section className="mx-auto max-w-6xl px-5">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-6 py-5">
          <p className="text-[15px] font-bold text-ink">{t(lang, 'nearby.blocked')}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{t(lang, 'nearby.blockedHow')}</p>
        </div>
      </section>
    )
  }

  // 위치를 못 잡았거나 시간이 초과된 경우 — 이건 다시 눌러볼 만하다
  if (state.k === 'unavailable' || state.k === 'timeout') {
    return (
      <section className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-muted">
            {t(lang, state.k === 'unavailable' ? 'nearby.unavailable' : 'nearby.timeout')}
          </p>
          <button
            onClick={ask}
            className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-600"
          >
            {t(lang, 'nearby.tryAgain')}
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
          href={`/${lang}/festivals/?sort=distance&period=ongoing`}
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

      {/* 좁은 화면용 — 위 제목 옆 링크가 sm 미만에서 숨으므로 여기 하나를 둔다.
          둘 다 보이면 같은 링크가 두 번 나온다(반경 안에 축제가 없을 때 실제로 그랬다).
          반대로 예전에는 축제가 있는 모바일 화면에 링크가 하나도 없었다 — 아래를
          near.length === 0 일 때만 그렸기 때문이다. 화면 폭으로만 가른다. */}
      <Link
        href={`/${lang}/festivals/?sort=distance&period=ongoing`}
        className={`inline-flex items-center gap-1 text-[15px] font-bold text-brand hover:underline sm:hidden ${
          near.length > 0 ? 'mt-4' : ''
        }`}
      >
        {t(lang, 'nearby.seeAll')} <Icon name="arrow" size={16} />
      </Link>
    </section>
  )
}

/** 목록 정렬용 — 다른 화면에서도 같은 반경을 쓴다 */
export { RADIUS_KM }
