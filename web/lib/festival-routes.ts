import { fromSlug, toSlug } from './slug.ts'

// 이미 공유된 주소가 현재 대표 출처 변경 때문에 끊기지 않도록 연결한다.
//
// 지금은 DB 구조를 바꾸기 전의 과도기다. 축제별 예외를 상세 페이지에 넣지 않고,
// 주소 호환 데이터만 이곳에 모은다. 이후 festival_route_aliases 테이블을 도입하면
// 이 객체를 그 테이블 조회로 교체할 수 있다.
const ROUTE_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  // JIMFF는 상담 당시 kfes → manual로 바뀌었고, 2026-09-01 빌드에서는
  // 다시 stdfest가 현재 데이터가 됐다. 영속 ID 도입 전까지 세 주소를 한 묶음으로 본다.
  'kfes:2026-jimff': [
    'manual:jimff-2026',
    'stdfest:제22회제천국제음악영화제-2026-09-03',
    'kfes:2026-jimff',
  ],
  'manual:jimff-2026': [
    'manual:jimff-2026',
    'stdfest:제22회제천국제음악영화제-2026-09-03',
    'kfes:2026-jimff',
  ],
  // 9/2 회의 후 공식 주최·지자체 페이지와 당시 원본의 이름·장소·회차를 대조해
  // 같은 2026년 행사임을 확인했다. 공공데이터의 날짜가 정정되며 대표 ID가 바뀐 사례다.
  'stdfest:거제맥주축제-2026-08-23': [
    'tourapi:2614762',
    'stdfest:거제맥주축제-2026-08-23',
  ],
  'stdfest:홍성남당항대하축제-2026-08-21': [
    'tourapi:140911',
    'stdfest:홍성남당항대하축제-2026-08-21',
  ],
  'stdfest:2026수원화성미디어아트-2026-10-03': [
    'tourapi:2751090',
    'stdfest:2026수원화성미디어아트-2026-10-03',
  ],
  'stdfest:맥주축제-2026-08-28': [
    'tourapi:3351268',
    'stdfest:맥주축제-2026-08-28',
  ],
}

export interface ResolvedFestivalRoute<T> {
  festival: T
  canonicalSlug: string
  isAlias: boolean
}

/** Location 헤더에 한글·기호가 그대로 들어가 500이 나지 않도록 경로를 인코딩한다. */
export function festivalRoutePath(lang: string, canonicalSlug: string): string {
  return `/${lang}/festivals/${encodeURIComponent(canonicalSlug)}/`
}

export function externalIdsToSlugs(externalIds: readonly string[]): string[] {
  return externalIds.map(toSlug)
}

export async function resolveFestivalRoute<T extends { externalId: string }>(
  slug: string,
  findByExternalId: (externalId: string) => Promise<T | undefined>,
): Promise<ResolvedFestivalRoute<T> | null> {
  const requestedExternalId = fromSlug(slug)
  const candidates = ROUTE_CANDIDATES[requestedExternalId] ?? [requestedExternalId]

  for (const externalId of candidates) {
    const festival = await findByExternalId(externalId)
    if (!festival) continue
    return {
      festival,
      canonicalSlug: toSlug(festival.externalId),
      isAlias: festival.externalId !== requestedExternalId,
    }
  }

  return null
}
