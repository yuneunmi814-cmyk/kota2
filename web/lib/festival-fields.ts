import { DEFAULT_LANG, type Lang } from './i18n.ts'
import { daysBetween, festivalStatus, todayKst, type FestivalStatus } from './date.ts'
import type { Festival } from './festivals.ts'

// 축제 한 건에서 값을 꺼내 판단하는 함수들 — DB를 보지 않는다.
//
// 원래 lib/festivals.ts 안에 있었는데, 그 파일은 첫 줄에서 Supabase 클라이언트를 불러온다.
// 그래서 이 함수 하나를 쓰려 해도 DB 접속 설정이 있어야 했고, 테스트에서 부를 수가 없었다.
// 계산만 하는 것들을 여기로 떼어 낸다. festivals.ts가 그대로 다시 내보내므로
// 이 함수들을 쓰던 화면 코드는 한 줄도 바뀌지 않는다.

/** 축제 식별자는 언제나 externalId — 숫자 id는 환경마다 달라진다(이전 구현에서 겪은 버그) */
export const key = (f: Festival) => f.externalId

// 요금 — 셋으로 가른다. 둘이 아니라 셋인 이유는 '모른다'가 다수이기 때문이다.
//
// 425건 중 fee 값이 있는 건 125건뿐이다(29%). 나머지 300건은 공공 API가 요금을
// 안 준 것이지 공짜라는 뜻이 아니다. 그런데 화면은 `f.fee ?? '무료'` 로 그 300건을
// 전부 「무료」라고 단정하고 있었다. 지금도 틀렸고, 유료 티켓 축제를 싣기 시작하면
// 2만원짜리 행사를 공짜라고 알리는 일이 생긴다.
//
// 판정 규칙은 하나다 — '무료'라는 말이 들어 있으면 그건 입장료 이야기다.
// 실제 데이터로 검산했다:
//   "입장료 무료 (먹거리 유료)"          → free  (입장은 공짜, 부대비용은 따로 적혀 있다)
//   "무료입장 및 기타체험비 유료"          → free
//   "입장료 유료 (8,000원/시민 6,000원)"  → paid
//   "유료(2,000원)"                     → paid
export type FeeKind = 'free' | 'paid' | 'unknown'

export function feeKind(f: Pick<Festival, 'fee'>): FeeKind {
  const s = f.fee?.trim()
  if (!s) return 'unknown'
  return /무료|free/i.test(s) ? 'free' : 'paid'
}

// 누가 여는가 — 공공이 연 것인가, 우리가 직접 확인해 넣은 것인가.
//
// 가격과는 다른 축이다. 춘천 썸머워터 페스티벌은 8,000원이지만 지자체 축제이고,
// 무료 브랜드 행사도 있다. 가격으로 가르면 엉뚱하게 갈린다.
//
// 새 컬럼이 필요 없다 — sources 에 이미 답이 있다. 이 구분을 화면에 밝히는 것이
// 우리가 파는 것(데이터 신뢰)의 설명이기도 하다.
const PUBLIC_SOURCES = ['tourapi', 'kfes', 'stdfest']

export function isPublicData(f: Pick<Festival, 'sources'>): boolean {
  return (f.sources ?? []).some((s) => PUBLIC_SOURCES.includes(s))
}

/** 그 언어로 보이는 이름·요약·지명. 번역이 없으면 한국어 원문으로 떨어진다 */
export function localized(f: Festival, lang: Lang) {
  if (lang === DEFAULT_LANG) {
    return { name: f.name, summary: f.summary ?? null, placeName: placeFallback(f) }
  }
  const t = f.translations?.find((x) => x.langCode === lang)
  return {
    name: t?.name || f.name,
    summary: t?.summary || f.summary || null,
    placeName: t?.placeName || placeFallback(f),
  }
}

function placeFallback(f: Festival): string | null {
  return [f.sido, f.sigungu].filter(Boolean).join(' ') || null
}

const DAY = 86_400_000

/** 기간이 60일을 넘으면 축제라기보다 상설 프로그램·전시·투어다.
 * 실측 경계: 31~60일은 계절 축제(세미원 연꽃 53일, 춘천 썸머워터 45일, 태백 해바라기 32일),
 * 91일 넘어가면 상설 전시·정기공연·연간 투어가 대부분(41건). 목록에서 뒤로 보낸다. */
export function isLongRun(f: Festival): boolean {
  const days = (new Date(f.endDate).getTime() - new Date(f.startDate).getTime()) / 86_400_000 + 1
  return days > 60
}

/**
 * 상시 운영 행사 — '지금 뭐하지'를 물을 때 답이 되지 못한다.
 * 기준을 300일로 잡는 이유: 1/1~12/31은 364일이라 '365일 이상'으로 하면 빠져나간다.
 * 실측으로 그 사이(300~364일)에 놓이는 축제는 전부 연중 상설 행사였다.
 */
export function isAlwaysOn(f: Festival): boolean {
  return new Date(f.endDate).getTime() - new Date(f.startDate).getTime() >= 300 * DAY
}

export type Status = FestivalStatus

export function statusOf(f: Festival, today = todayKst()): Status {
  return festivalStatus(f.startDate, f.endDate, today)
}

/** 축제가 걸쳐 있는 달(1~12) — 월별 필터는 kfes에 있고 우리에겐 없던 축이다 */
export function monthsOf(f: Festival): number[] {
  const s = new Date(f.startDate)
  const e = new Date(f.endDate)
  const out: number[] = []
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  while (cur <= e && out.length < 24) {
    out.push(cur.getMonth() + 1)
    cur.setMonth(cur.getMonth() + 1)
  }
  return [...new Set(out)]
}

/** 두 지점 사이 거리(km) */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/**
 * 카드에 붙일 시간 뱃지 — T맵 「가볼만한 축제」가 쓰는 문법.
 *
 * '진행중'만으로는 급한 정도가 안 보인다. 오늘 끝나는 축제와 다음 주까지 하는 축제가
 * 같은 얼굴을 하고 있으면 여행자는 어느 쪽을 서둘러야 할지 모른다.
 *
 * 우선순위는 다급한 순이다: 오늘 끝남 > 곧 시작(D-N) > 진행중.
 * D-N은 2주 안쪽만 붙인다 — 'D-113'은 정보가 아니라 소음이다.
 */
export type DayBadge = { kind: 'endsToday' | 'countdown' | 'ongoing'; days?: number } | null

export function dayBadge(f: Festival, today = todayKst()): DayBadge {
  if (isAlwaysOn(f)) return null
  if (today > f.endDate) return null
  if (today >= f.startDate) return f.endDate === today ? { kind: 'endsToday' } : { kind: 'ongoing' }
  const days = daysBetween(today, f.startDate)
  return days <= 14 ? { kind: 'countdown', days } : null
}
