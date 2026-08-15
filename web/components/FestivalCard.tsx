import Link from 'next/link'
import { localized, statusOf, isAlwaysOn, type Festival } from '@/lib/festivals'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import Poster from './Poster'

// 축제 카드 — 포스터가 주인공이고 UI는 물러난다.
// 상태 뱃지는 '진행중'일 때만 색을 쓴다. 모든 카드에 색 뱃지가 붙으면 아무것도 강조되지 않는다.

const fmt = (d: string) => d.slice(5).replace('-', '.')

export default function FestivalCard({
  f,
  lang,
  distanceKm,
}: {
  f: Festival
  lang: Lang
  distanceKm?: number | null
}) {
  const L = localized(f, lang)
  const st = statusOf(f)
  const always = isAlwaysOn(f)

  return (
    <Link
      href={`/${lang}/festivals/${f.externalId}/`}
      className="lift group block overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface hover:border-brand/40 hover:shadow-[0_10px_28px_-14px_rgba(79,50,22,.35)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <Poster
          src={f.imageUrl}
          name={L.name}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {st === 'ongoing' && !always && (
          <span className="absolute left-3 top-3 sticker rounded-full bg-y px-2.5 py-1 text-[11px] font-black text-on-y">
            {t(lang, 'status.ongoing')}
          </span>
        )}
        {f.category === 'MF' && (
          <span className="absolute right-3 top-3 rounded-full border-2 border-brand bg-paper px-2 py-0.5 text-[10px] font-black text-brand" title={t(lang, 'grade.mf')}>
            {t(lang, 'grade.mf')}
          </span>
        )}
        {f.imageFrom === 'past' && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {t(lang, 'poster.past')}
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-muted">
          <span className="truncate">{L.placeName}</span>
          {f.visitorLift != null && f.visitorLift >= 2 && (
            <span className="shrink-0 rounded-full bg-tint-r px-1.5 py-0.5 text-[10px] font-black text-on-r" title={t(lang, 'lift.note')}>
              {t(lang, 'lift.label', { x: f.visitorLift.toFixed(1) })}
            </span>
          )}
          {distanceKm != null && (
            <span className="shrink-0 font-bold text-brand-400">
              {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)}km
            </span>
          )}
        </div>

        <h3 className="mb-1.5 line-clamp-2 text-[16px] font-bold leading-snug text-ink">{L.name}</h3>

        <p className="text-[13px] tabular-nums text-hint">
          {always ? t(lang, 'status.always') : `${fmt(f.startDate)} – ${fmt(f.endDate)}`}
        </p>
      </div>
    </Link>
  )
}
