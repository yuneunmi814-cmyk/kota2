// 실시간 응답으로 들어온 축제가 '이미 DB에 흡수된 그 축제'인지 가리는 규칙.
//
// 왜 필요한가. 병합은 여러 원천의 같은 축제를 한 건으로 묶고, 대표 externalId 하나만
// 남긴다. 그런데 화면을 그릴 때 하는 실시간 대조는 그 대표 ID로만 짝을 맞춘다.
// 대표가 tourapi인 축제가 병합 때 표준데이터 행도 흡수했다면, 그 표준데이터 행은
// '짝을 못 찾은 새 축제'로 다시 들어온다. 두 원천이 날짜를 다르게 주면 기간겹침
// 판정에도 안 걸려 같은 축제가 두 장 뜬다.
//
//   한국유교문화축전 — DB는 09-12~09-20 한 건(sources: tourapi·kfes·stdfest)인데
//   라이브 목록엔 09-12~09-13(stdfest)과 09-18~09-20(tourapi)이 따로 떴다(2026-09-04 실측).
//
// 근거는 DB가 이미 갖고 있다. `sources` 칼럼이 '이 축제가 어느 원천을 흡수했는지'를
// 적어 둔다. 대표가 그 원천이 아닌데 sources에 들어 있으면, 같은 이름·같은 지역의
// 그 원천 행은 흡수된 그 행으로 본다.
//
// 대표가 그 원천이면 이 규칙을 쓰지 않는다. 그때는 대표 ID로 정확히 짝지을 수 있고,
// 무창포 신비의바닷길처럼 한 해에 두 번 여는 같은 원천의 축제를 잘못 지우면 안 된다.

/** 이름에서 회차·연도·'축제/페스티벌' 접미사와 공백·기호를 떼어 비교용 열쇠로 만든다. */
// 같은 축제인데 이름이 아예 다른 것은 규칙으로 못 잡아 손으로 적는다.
// pipeline/src/lib/match.ts의 SAME과 같은 표다. ⚠ 한쪽만 고치면 다시 갈라진다.
const SAME: Record<string, string> = { 재즈in가평: '자라섬재즈' }

export function bareName(s: string): string {
  const n = s
    .replace(/[(（[].*?[)）\]]/g, '')
    .replace(/제?\s*\d+\s*회/g, '')
    .replace(/20\d{2}\s*년?/g, '')
    .replace(/축제|페스티벌|페스타|한마당|문화제|축전/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
  return SAME[n] ?? n
}

/** 정규화한 이름 → 그 축제가 흡수한 `원천|시군구` 집합 */
export type AbsorbedIndex = Map<string, Set<string>>

interface Absorbable {
  name: string
  externalId: string
  sigungu?: string | null
  sources?: string[] | null
}

export function buildAbsorbedIndex(kept: Absorbable[]): AbsorbedIndex {
  const index: AbsorbedIndex = new Map()
  for (const f of kept) {
    const n = bareName(f.name)
    if (!n) continue
    const own = f.externalId.split(':')[0]
    const set = index.get(n) ?? new Set<string>()
    for (const s of f.sources ?? []) if (s !== own) set.add(`${s}|${f.sigungu ?? ''}`)
    index.set(n, set)
  }
  return index
}

/**
 * 지역이 어긋나면 다른 축제로 본다. 다만 한쪽 지역을 모르면 어긋났다고 보지 않는다 —
 * 실시간 TourAPI 응답에는 시군구가 없다.
 */
export function isAbsorbed(
  index: AbsorbedIndex,
  f: { name: string; sigungu?: string | null },
  source: string,
): boolean {
  if (!source) return false
  const n = bareName(f.name)
  if (!n) return false
  const set = index.get(n)
  if (!set) return false
  if (!f.sigungu) return [...set].some((x) => x.startsWith(`${source}|`))
  return set.has(`${source}|${f.sigungu}`) || set.has(`${source}|`)
}
