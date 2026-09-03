import { fromSlug, toSlug } from './slug.ts'

// 이미 공유된 주소가 현재 대표 출처 변경 때문에 끊기지 않도록 연결한다.
//
// 옛 주소 짝은 코드에 적지 않는다. 근거는 DB 한 곳에 둔다 — 자세한 사정은 lib/route-aliases.ts.
// (2026-09-04까지는 이 파일에 손으로 적은 표가 있었는데, DB에는 있고 코드에는 없는 항목이
//  생겨 실제로 갈라졌다.)

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

/**
 * 주소 하나를 축제로 옮긴다.
 *
 * 요청한 주소로 먼저 찾고, 없을 때만 별칭을 뒤진다 — 정상 주소는 DB를 한 번 더 가지 않는다.
 * `lookupAliases`를 주입받는 이유는 이 함수를 DB 없이 테스트하기 위해서다.
 */
export async function resolveFestivalRoute<T extends { externalId: string }>(
  slug: string,
  findByExternalId: (externalId: string) => Promise<T | undefined>,
  lookupAliases: (slug: string) => Promise<string[]> = async () => [],
): Promise<ResolvedFestivalRoute<T> | null> {
  const requestedExternalId = fromSlug(slug)

  const direct = await findByExternalId(requestedExternalId)
  if (direct) {
    return { festival: direct, canonicalSlug: toSlug(direct.externalId), isAlias: false }
  }

  for (const externalId of await lookupAliases(slug)) {
    if (externalId === requestedExternalId) continue
    const festival = await findByExternalId(externalId)
    if (!festival) continue
    return { festival, canonicalSlug: toSlug(festival.externalId), isAlias: true }
  }

  return null
}
