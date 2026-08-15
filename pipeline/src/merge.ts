import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival, RawFestival } from './lib/types.js'
import { canonSido, normalizeName, periodsOverlap } from './lib/match.js'
import { classifyThemes } from './lib/themes.js'
import { todayKst } from './lib/http.js'

// 5개 소스를 하나로 — data/raw/*.json → data/festivals.json
//
// 원칙
//  1) 이미 있는 것을 버리지 않는다. 겹치면 합치고, 정보가 풍부한 값이 이긴다.
//     (이전 구현은 이름이 겹치면 kfes 건을 건너뛰어 413건을 잃었다)
//  2) 대표 externalId는 소스 우선순위로 고른다: tourapi > kfes > stdfest > mcst > manual.
//     tourapi/kfes는 같은 CMS라 contentid가 같으므로 어느 쪽이든 안정적인 키다.
//     기존 사이트·앱이 tourapi: 키를 쓰고 있어 그 호환을 지킨다.
//  3) 종료된 축제는 뺀다(정적 사이트에 실을 이유가 없다).

const SOURCE_RANK: Record<RawFestival['source'], number> = { tourapi: 0, kfes: 1, stdfest: 2, mcst: 3, manual: 4 }

function loadRaw(name: string): RawFestival[] {
  const p = new URL(`../data/raw/${name}.json`, import.meta.url)
  if (!existsSync(p)) return []
  return (JSON.parse(readFileSync(p, 'utf-8')) as { rows: RawFestival[] }).rows
}

const today = todayKst()
const raws = (['tourapi', 'kfes', 'stdfest', 'mcst', 'manual'] as const)
  .flatMap(loadRaw)
  .filter((r) => r.endDate >= today && r.startDate && r.name)

// 정규화 — 시·도 표기 통일, 주소에서 시·도/시군구 보충
const validSigungu = (v?: string | null) => (v && /^[가-힣]{1,6}(시|군|구)$/.test(v.trim()) ? v.trim() : null)
for (const r of raws) {
  r.sido = canonSido(r.sido)
  r.sigungu = validSigungu(r.sigungu) // '서초구남부순환로317길' 같은 주소 덩어리는 버린다
  if (!r.sido && r.address) {
    const m = r.address.match(/^(\S+?(?:특별시|광역시|특별자치시|특별자치도|도))\s*(\S+?(?:시|군|구))?/)
    if (m) {
      r.sido = canonSido(m[1])
      r.sigungu = r.sigungu ?? m[2] ?? null
    }
  }
  if (!r.sigungu && r.address && r.sido) {
    const m = r.address.replace(r.sido, '').trim().match(/^(\S+?(?:시|군|구))\b/)
    if (m) r.sigungu = m[1]
  }
}

// ── 1단계: 확실한 열쇠(tourapiId)로 묶기 ─────────────────────
const groups: RawFestival[][] = []
const byTourapi = new Map<string, RawFestival[]>()
const rest: RawFestival[] = []
for (const r of raws) {
  if (r.tourapiId) {
    const g = byTourapi.get(r.tourapiId)
    if (g) g.push(r)
    else byTourapi.set(r.tourapiId, [r])
  } else rest.push(r)
}
groups.push(...byTourapi.values())

// ── 2단계: 이름 정규화 + 시·도 + 기간으로 붙이기 ─────────────
// 기존 그룹에 붙일 수 있으면 붙이고, 아니면 rest끼리 묶는다
const nameIndex = new Map<string, RawFestival[][]>()
const indexGroup = (g: RawFestival[]) => {
  for (const r of g) {
    const k = normalizeName(r.name)
    if (!k) continue
    const arr = nameIndex.get(k) ?? []
    if (!arr.includes(g)) arr.push(g)
    nameIndex.set(k, arr)
  }
}
groups.forEach(indexGroup)

// 같은 축제 판정.
//  - 이름이 같고 기간이 실제로 겹치면 → 시·도가 달라도 같은 것으로 본다.
//    (TourAPI가 광주 금남로를 '전라남도'로 주거나, 서울→수원 능행차처럼 두 시·도에 걸치는 행사가 있다)
//  - 이름이 같고 기간이 30일 안에서 인접하면 → 시·도가 같을 때만 합친다.
//    (무창포는 9월·10월 두 번 열린다 — 이건 갈라야 한다)
const sameFestival = (a: RawFestival, b: RawFestival) => {
  if (normalizeName(a.name) !== normalizeName(b.name)) return false
  if (periodsOverlap(a.startDate, a.endDate, b.startDate, b.endDate, 0)) return true
  return (!a.sido || !b.sido || a.sido === b.sido) && periodsOverlap(a.startDate, a.endDate, b.startDate, b.endDate, 30)
}

for (const r of rest) {
  const k = normalizeName(r.name)
  const cands = k ? (nameIndex.get(k) ?? []) : []
  const hit = cands.find((g) => g.some((x) => sameFestival(x, r)))
  if (hit) {
    hit.push(r)
  } else {
    const g = [r]
    groups.push(g)
    indexGroup(g)
  }
}

// ── 3단계: 그룹을 한 건으로 합친다 — 풍부한 값이 이긴다 ────────
const first = <T>(vals: (T | null | undefined)[]): T | null => vals.find((v) => v != null && v !== '') ?? null
const longest = (vals: (string | null | undefined)[]) =>
  vals.filter((v): v is string => !!v && v.trim().length > 0).sort((a, b) => b.length - a.length)[0] ?? null

const merged: Festival[] = groups.map((g) => {
  const sorted = [...g].sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source])
  const head = sorted[0]!
  // 개요는 '가장 긴 산문' — kfes가 있으면 kfes, 없으면 stdfest의 fstvlCo, 마지막에 mcst 조각
  const bySrc = (s: RawFestival['source']) => sorted.find((x) => x.source === s)
  const summary = bySrc('kfes')?.summary ?? bySrc('stdfest')?.summary ?? bySrc('manual')?.summary ?? longest(sorted.map((x) => x.summary))
  // 기간은 가장 이른 시작 ~ 가장 늦은 끝(소스마다 하루 이틀 다르다)
  const startDate = sorted.map((x) => x.startDate).sort()[0]!
  const endDate = sorted.map((x) => x.endDate).sort().at(-1)!
  const withCoords = sorted.find((x) => x.lat != null && x.lng != null)
  const name = bySrc('kfes')?.name ?? bySrc('tourapi')?.name ?? head.name

  const f: Festival = {
    externalId: head.externalId,
    source: head.source,
    sources: [...new Set(sorted.map((x) => x.source))],
    tourapiId: first(sorted.map((x) => x.tourapiId)),
    name,
    startDate,
    endDate,
    sido: first(sorted.map((x) => x.sido)),
    sigungu: first(sorted.map((x) => x.sigungu)),
    address: longest(sorted.map((x) => x.address)),
    lat: withCoords?.lat ?? null,
    lng: withCoords?.lng ?? null,
    imageUrl: first(sorted.map((x) => x.imageUrl)),
    imageFrom: first(sorted.map((x) => x.imageUrl)) ? 'own' : null,
    summary,
    program: first(sorted.map((x) => x.program)),
    fee: first(sorted.map((x) => x.fee)),
    homepage: first(sorted.map((x) => x.homepage)),
    instagram: first(sorted.map((x) => x.instagram)),
    youtube: first(sorted.map((x) => x.youtube)),
    tel: first(sorted.map((x) => x.tel)),
    category: first(sorted.map((x) => x.category)),
    themes: [],
    popularity: 0,
    translations: [],
  }
  f.themes = classifyThemes(f.name, `${f.summary ?? ''} ${f.category ?? ''}`)
  // 인기 — 관광공사 공식 근거를 위에 둔다.
  //  ① 문화관광축제 지정(kfes fstvlClCd=MF, 문체부 지정·관광공사 인증 65건) = 가장 강한 신호 +100
  //  ② 관광공사 구석구석 큐레이션 포함(kfes) +30 — 공사가 골라 실은 축제
  //  ③ 여러 공공 소스에 동시 등재 +10/소스 — 지자체·문체부·공사가 각자 챙기는 규모
  //  ④ 이미지·좌표 완비 +3 — 동점 정리용
  // TourAPI 데이터랩(검색순위·방문자)은 2026-08 현재 폐기 상태라 못 쓴다. 살아나면 여기에 얹는다.
  const kfesGrade = bySrc('kfes')?.category ?? null // 'MF' | 'AF' | null
  f.popularity =
    (kfesGrade === 'MF' ? 100 : 0) +
    (f.sources.includes('kfes') ? 30 : 0) +
    f.sources.length * 10 +
    (f.imageUrl ? 2 : 0) +
    (f.lat != null ? 1 : 0)
  if (kfesGrade === 'MF') f.category = 'MF'
  return f
})

merged.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name))

// ── 저장 + 리포트 ─────────────────────────────────────────
mkdirSync(new URL('../data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../data/festivals.json', import.meta.url), JSON.stringify({ exportedAt: new Date().toISOString(), items: merged }, null, 0))

const n = merged.length
const c = (fn: (f: Festival) => unknown) => merged.filter(fn).length
console.log(`▶ 원본 ${raws.length}건 → 병합 ${n}건`)
console.log(`   이미지 ${c((f) => f.imageUrl)} (${Math.round((100 * c((f) => f.imageUrl)) / n)}%) · 좌표 ${c((f) => f.lat != null)} (${Math.round((100 * c((f) => f.lat != null)) / n)}%) · 산문 개요 ${c((f) => (f.summary?.length ?? 0) > 60)}`)
console.log(`   소스 조합: ${Object.entries(merged.reduce<Record<string, number>>((m, f) => ((m[f.sources.join('+')] = (m[f.sources.join('+')] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
console.log(`   테마 미분류 ${c((f) => f.themes.length === 0)}건`)
