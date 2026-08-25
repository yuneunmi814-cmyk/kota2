import Link from 'next/link'
import { localized, statusOf, isAlwaysOn, isLongRun, dayBadge, type Festival } from '@/lib/festivals'
import DayBadgeChip from './DayBadge'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import Poster from './Poster'
import { toSlug } from '@/lib/slug'

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
      href={`/${lang}/festivals/${toSlug(f.externalId)}/`}
      className="lift group block overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface hover:border-brand/40 hover:shadow-[0_10px_28px_-14px_rgba(79,50,22,.35)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <Poster
          src={f.imageUrl}
          name={L.name}
          pendingLabel={t(lang, 'photo.pending')}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <DayBadgeChip badge={dayBadge(f)} lang={lang} />
        {f.imageFrom === 'past' && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            {t(lang, 'poster.past')}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* 두 줄 자리를 늘 확보한다.
            지역 줄만 두 줄로 늘렸더니 폭에 밀린 카드만 키가 14px 커져 같은 줄에서 밑선이
            어긋났다. 가로 스크롤 줄이라 서로 맞춰지지도 않는다(2026-08-25 2차 검증).
            늘 두 줄 높이를 잡아 두면 어느 카드나 키가 같다. */}
        <div className="mb-1.5 flex min-h-[2.7em] items-start gap-2 text-[12px] font-semibold leading-[1.35] text-muted">
          {/* 지역 줄은 두 줄까지 허용한다.
              한 줄 고정(truncate)이라 영어에서는 대부분 잘렸다 — 'Changnyeong,
              Gyeongsangnam-do'는 208px가 필요한데 칸이 126px뿐이라 도(道)가 아예
              안 보였다(2026-08-23 점검). 어느 도인지 못 읽으면 지역 줄의 몫이 없다.

              min-w-0 flex-1 이 함께 있어야 한다 — flex 자식의 기본 min-width 는 auto 라
              옆의 shrink-0 형제(방문객 배지·거리)가 자리를 먼저 가져가면 이 칸이 0px 로
              눌린다. 그러면 글자는 한 자도 안 보이면서 두 줄 높이만 차지한다.
              (2026-08-25 verify-ko 실측: 폭 0px, 카드 키만 280px 로 튐) */}
          <span className="line-clamp-2 min-w-0 flex-1 leading-[1.35]">{L.placeName}</span>
          {f.visitorLift != null && f.visitorLift >= 2 && (
            <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand" title={t(lang, 'lift.note')}>
              {t(lang, 'lift.label', { x: f.visitorLift.toFixed(1) })}
            </span>
          )}
          {distanceKm != null && (
            <span className="shrink-0 font-bold text-brand-400">
              {distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)}km
            </span>
          )}
        </div>

        {/* 제목은 세 줄까지.
            두 줄 고정이라 긴 이름이 3분의 1만 보였다 — 한국 축제명은 '제N회'와 후원사가
            앞에 붙어 길고, 영어로 옮기면 더 길어진다. 정작 축제를 구분하는 고유명은
            뒤쪽에 있어서 앞 두 줄만으로는 어떤 축제인지 알 수 없었다.
            태국어는 낱말 사이에 공백이 없어 브라우저가 아무 데서나 끊는다 —
            음차어가 글자 단위로 쪼개지지 않도록 break-keep을 함께 건다. */}
        <h3 className="mb-1.5 line-clamp-3 break-keep text-[16px] font-bold leading-snug text-ink">{L.name}</h3>

        <p className="text-[13px] tabular-nums text-hint">
          {always ? t(lang, 'status.always') : `${fmt(f.startDate)} – ${fmt(f.endDate)}`}
        </p>
        {/* 두 달 넘게 걸린 기간은 대개 '그 사이 정해진 날에만' 열린다(주말마다, 월 1회…).
            날짜만 보여주면 아무 날이나 가도 되는 줄 알고 허탕을 친다 */}
        {!always && isLongRun(f) && (
          <p className="mt-0.5 text-[12px] text-hint/80">{t(lang, 'status.selectDates')}</p>
        )}
      </div>
    </Link>
  )
}
