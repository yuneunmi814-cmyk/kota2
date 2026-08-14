// 아이콘 — 인라인 SVG. 이모지를 쓰지 않는다.
//
// 이모지는 기기·OS마다 다르게 그려져 브랜드 색 밖으로 튀고, 여러 개가 나란히 서면
// '기본값 그대로'라는 인상을 준다. SVG는 currentColor를 따라가므로 어디에 놓아도
// 팔레트가 유지되고, 세트를 바꿀 때 이 파일만 고치면 된다.

export type IconName =
  | 'pin'
  | 'globe'
  | 'search'
  | 'calendar'
  | 'arrow'
  | 'heart'
  | 'heartFilled'
  | 'food'
  | 'nature'
  | 'heritage'
  | 'music'
  | 'family'
  | 'night'

const P: Record<IconName, { d: string; fill?: boolean }> = {
  pin: { d: 'M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z' },
  globe: { d: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3.6 9h16.8 M3.6 15h16.8 M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z' },
  search: { d: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-4.2-4.2' },
  calendar: { d: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12Z M8 3v4 M16 3v4 M4 10h16' },
  arrow: { d: 'M5 12h14 M13 6l6 6-6 6' },
  heart: { d: 'M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13L12 20.3Z' },
  heartFilled: { d: 'M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 1 1 19.3 13L12 20.3Z', fill: true },
  food: { d: 'M7 3v8 M5 3v4a2 2 0 0 0 4 0V3 M7 11v10 M17 3c-1.7 1.2-2.5 3-2.5 5.2 0 1.6.8 2.6 2.5 2.8V3Z M17 11v10' },
  nature: { d: 'M4.5 19.5c0-8.5 5.5-14 15-15 1 9.5-4.5 15-15 15Z M4.5 19.5c3.5-3.5 7-5.5 11-7.5' },
  heritage: { d: 'M3 9.5 12 4l9 5.5 M5.5 9.5V19 M18.5 9.5V19 M9.5 19v-5.5h5V19 M3 19h18' },
  music: { d: 'M9 18V6l10-2v12 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z' },
  family: { d: 'M8.5 8a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z M4.5 20v-5a4 4 0 0 1 8 0v5 M17 11.5a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z M14 20v-3.6a3 3 0 0 1 6 0V20' },
  night: { d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z M17.5 3v3.4 M15.8 4.7h3.4' },
}

export default function Icon({
  name,
  size = 18,
  className = '',
  strokeWidth = 1.8,
}: {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}) {
  const { d, fill } = P[name]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  )
}
