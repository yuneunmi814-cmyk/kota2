import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import type { DayBadge as Badge } from '@/lib/festivals'

// 사진 왼쪽 위 시간 뱃지 — 오늘 끝남 / D-N / 진행중.
//
// 세 가지가 한 자리를 나눠 쓴다. 동시에 뜨는 일은 없다(하나의 축제는 한 상태다).
// 색을 셋으로 쪼개지 않은 이유: 뱃지마다 색이 다르면 목록이 신호등이 된다.
// 급한 것(오늘 끝남)만 색을 쓰고 나머지는 같은 초록으로 둔다.

export default function DayBadge({ badge, lang }: { badge: Badge; lang: Lang }) {
  if (!badge) return null
  const urgent = badge.kind === 'endsToday'
  const label =
    badge.kind === 'endsToday'
      ? t(lang, 'badge.endsToday')
      : badge.kind === 'countdown'
        ? t(lang, 'badge.dday', { n: badge.days ?? 0 })
        : t(lang, 'status.ongoing')

  return (
    <span
      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
        urgent ? 'bg-r text-white' : 'bg-brand text-white'
      }`}
    >
      {label}
    </span>
  )
}
