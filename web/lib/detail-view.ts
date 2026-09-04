import { distanceKm, isAlwaysOn, statusOf } from './festival-fields.ts'
import type { FeeKind } from './festival-fields.ts'
import type { Festival } from './festivals.ts'

// 상세 페이지가 화면을 그리기 전에 하는 계산 — DB를 보지 않는다.
//
// app/[lang]/festivals/[id]/page.tsx 한 파일에 데이터 조회, 화면용 데이터 조립,
// 검색엔진용 정보 만들기, 마크업이 전부 섞여 있었다(597줄). 그중 '조립'과 '검색정보'는
// 값만 넣으면 답이 정해지는 계산이라 여기로 뺐다. 화면 동작은 그대로다.

/** 「이 근처 다른 축제」 한 장 — 축제와 원점에서의 거리 */
export interface NearbyItem {
  x: Festival
  km: number
}

/**
 * 반경 안의 다른 축제를 가까운 순으로.
 *
 * 같은 축제의 다른 회차를 뺀다. externalId만 보면 '거제맥주축제'(8/23)의 근처 목록에
 * '거제맥주축제'(9/11)가 들어왔다. 「다른 축제」라고 해놓고 같은 이름을 보여주니
 * 쓰는 사람 눈에는 중복이다(2026-08-23 점검).
 *
 * 끝난 축제와 상시 행사도 뺀다 — 지금 갈 수 있는 곳만 답이 된다.
 */
export function nearbyFestivals(
  f: Festival,
  candidates: Festival[],
  { radiusKm = 30, limit = 8, today }: { radiusKm?: number; limit?: number; today?: string } = {},
): NearbyItem[] {
  if (f.lat == null || f.lng == null) return []
  const origin = { lat: f.lat, lng: f.lng }
  const bare = (s: string) => s.replace(/\s+/g, '')

  return candidates
    .filter(
      (x) =>
        x.externalId !== f.externalId &&
        bare(x.name) !== bare(f.name) &&
        x.lat != null &&
        x.lng != null &&
        statusOf(x, today) !== 'ended' &&
        !isAlwaysOn(x),
    )
    .map((x) => ({ x, km: distanceKm(origin, { lat: x.lat as number, lng: x.lng as number }) }))
    .filter((o) => o.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
}

/** 목차에 놓을 수 있는 칸. 화면 순서와 같다 */
export type SectionId = 'about' | 'photos' | 'lineup' | 'program' | 'location' | 'reviews' | 'nearby'

/**
 * 목차 — 그 섹션이 실제로 그려질 때만 넣는다.
 * 이름표(사람이 읽는 글자)는 화면 쪽에서 붙인다. 여기서는 무엇이 있는지만 정한다.
 */
export function detailSections(
  f: Festival,
  { hasSummary, nearbyCount }: { hasSummary: boolean; nearbyCount: number },
): SectionId[] {
  const out: SectionId[] = []
  if (hasSummary) out.push('about')
  if ((f.photos?.length ?? 0) > 0) out.push('photos')
  if (f.lineup) out.push('lineup')
  if (f.program) out.push('program')
  if (f.lat != null && f.lng != null) out.push('location')
  out.push('reviews')
  if (nearbyCount > 0) out.push('nearby')
  return out
}

/** 히어로와 곁타일에 무엇을 놓을지 */
export interface HeroMedia {
  /** 큰 사진. 없으면 히어로 자체를 그리지 않는다 */
  heroSrc: string | null
  /** 유튜브 영상 id. 주소에서 뽑는다 */
  ytId: string | null
  sideTiles: Array<{ kind: 'photo'; src: string } | { kind: 'yt'; id: string }>
}

/**
 * 히어로에 쓸 사진. 대표 이미지가 없으면 갤러리 첫 장이라도 쓴다.
 * 둘 다 없으면 heroSrc는 null이고, 그때는 히어로 자체를 그리지 않는다 —
 * 420건 중 183건(43%)이 포스터가 없는데, 그 화면에서 폭 2/3짜리 회색 상자에
 * 축제명 첫 글자만 크게 뜨는 건 정보가 아니라 빈자리다. 목록 카드에서는 같은
 * 자리채움이 제 몫을 한다(수백 장이 같은 아이콘이면 만들다 만 화면으로 읽힌다).
 * 상세는 한 장뿐이라 사정이 다르다. 접으면 소개와 지도가 그만큼 위로 올라온다.
 *
 * 곁타일은 사진과 영상만 쓴다. 사진이 모자랄 때 지도로 칸을 메우고 있었는데 뺐다(2026-08-19).
 *  · 아래 '위치'에 같은 지도가 이미 있어 한 페이지에 같은 지도가 두 번 그려졌다(BUG-19).
 *  · 타일을 <a href="#location">으로 감쌌는데 KakaoMap 안에 카카오맵으로 나가는 <a>가 또
 *    있어 앵커가 중첩됐다. 잘못된 HTML이라 하이드레이션이 통째로 깨졌고, 그 페이지의
 *    클라이언트 기능이 전부 죽었다 — 리포트에 없던 건이다.
 * 칸이 비면 그리드가 알아서 좁아진다. 지도를 두 번 그리는 것보다 낫다.
 */
export function heroMedia(f: Festival): HeroMedia {
  const heroSrc = f.imageUrl ?? f.photos?.[0]?.url ?? null
  const ytId = f.youtube?.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/)?.[1] ?? null
  // 옆 칸 우선순위: 실제 축제 사진 → 영상. 사진이 있으면 그게 가장 정직한 대표 이미지다
  const extraPhoto = f.photos?.[1] ?? null
  const photo2 = f.photos?.[2] ?? null
  const sideTiles = [
    extraPhoto ? ({ kind: 'photo', src: extraPhoto.thumb } as const) : ytId ? ({ kind: 'yt', id: ytId } as const) : null,
    photo2
      ? ({ kind: 'photo', src: photo2.thumb } as const)
      : ytId && extraPhoto
        ? ({ kind: 'yt', id: ytId } as const)
        : null,
  ].filter((x): x is { kind: 'photo'; src: string } | { kind: 'yt'; id: string } => x !== null)

  return { heroSrc, ytId, sideTiles }
}

/** 검색결과에 뜨는 한 줄. 160자에서 자른다 */
export function metaDescription(
  L: { summary: string | null; placeName: string | null },
  f: Pick<Festival, 'startDate' | 'endDate'>,
): string {
  return [L.summary, `${f.startDate} ~ ${f.endDate}`, L.placeName].filter(Boolean).join(' · ').slice(0, 160)
}

/**
 * 검색엔진에 넘기는 구조화 정보(schema.org Festival).
 *
 * 요금을 모르면 아예 말하지 않는다. 요금을 모르는 축제에 isAccessibleForFree: true를 넣으면
 * 검색엔진에도 "무료"라고 알리는 셈이고, 그건 화면의 거짓말이 검색결과까지 번지는 것이다.
 */
export function festivalJsonLd({
  f,
  L,
  lang,
  fee,
  url,
}: {
  f: Festival
  L: { name: string; summary: string | null; placeName: string | null }
  lang: string
  fee: FeeKind
  url: string
}): Record<string, unknown> {
  const hasCoords = f.lat != null && f.lng != null
  return {
    '@context': 'https://schema.org',
    '@type': 'Festival',
    name: L.name,
    ...(L.summary ? { description: L.summary } : {}),
    startDate: f.startDate,
    endDate: f.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: lang,
    location: {
      '@type': 'Place',
      name: L.placeName ?? f.address ?? 'Korea',
      ...(f.address ? { address: f.address } : {}),
      ...(hasCoords ? { geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng } } : {}),
    },
    ...(f.imageUrl ? { image: [f.imageUrl] } : {}),
    ...(f.organizer ? { organizer: { '@type': 'Organization', name: f.organizer } } : {}),
    ...(fee === 'unknown' ? {} : { isAccessibleForFree: fee === 'free' }),
    url,
  }
}

/**
 * 출처 표기 — 문자열에서 주소를 뽑아 쓴다.
 *
 * imageSource에 주소만 들어오리라 믿고 new URL()에 그대로 넣었더니 빌드가 깨졌다
 * (2026-08-19, 국가유산 미디어아트). 손으로 모은 포스터의 출처는 "○○재단 공식 홈페이지
 * https://..." 처럼 설명이 붙은 문장으로 들어오기도 한다. 데이터도 정리하지만 화면 쪽도
 * 이상한 값에 안 죽게 둔다 — 출처 한 줄 때문에 1,891페이지 빌드가 멈추는 건 균형이 안 맞는다.
 */
const firstUrl = (raw: string) => raw.match(/https?:\/\/[^\s)]+/)?.[0] ?? null

export const sourceUrl = (raw: string) => firstUrl(raw) ?? undefined

export function sourceHost(raw: string): string {
  const u = firstUrl(raw)
  if (!u) return raw.slice(0, 24)
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return raw.slice(0, 24)
  }
}
