import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival, RawFestival } from './lib/types.js'
import { canonSido, resolveSido, displayName, nameContains, normalizeName, periodsOverlap } from './lib/match.js'
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

// ⛔ mcst(문체부 「지역축제 개최계획」 시드) 제외 — 2026-08-16 검증 결과 신뢰 불가.
//
// data/seed/mcst-festivals-2026.json의 출처를 추적할 수 없었다(원본 엑셀·zip이 어디에도 없음).
// 표본 5건을 웹으로 실검증한 결과 3건이 틀렸다:
//   · 남원 워터밤 페스티벌 — 2024년이 마지막. 2026년은 「요천 물축제」(8/1~8/10)로 개명됐다.
//   · 춘천호수 드론라이트쇼 — 실제로는 2026-08-08 하루. 시드는 3/1~10/1 7개월로 적어 놨다.
//   · 여름방학 곤충페스티벌 — 정식명은 「예천곤충페스티벌」(8/15~17). 기사 수식어가 이름에 섞였다.
// 게다가 문체부 2026년판 개최계획은 애초에 공개된 적이 없다(공공데이터포털 최신본은
// 2025-01-06 기준 「문화체육관광부_지역축제 정보」 1,214행 — data.go.kr/data/15143175).
// 없는 자료를 출처로 단 263건이 목록의 38%를 차지하고 있었고, 그 263건은 이미지 33건·
// 홈페이지 0건의 빈 껍데기였다. 빼면 425건이 남지만 이미지 비율이 41% → 67%로 오른다.
//
// 되살리려면: data.go.kr/data/15143175 실파일을 받아 시드를 다시 만들고, 개최연도가 과거인
// 항목을 '예정'으로 표시하지 않도록 걸러낸 뒤 아래 배열에 'mcst'를 되돌린다.
const today = todayKst()
const raws = (['tourapi', 'kfes', 'stdfest', 'manual'] as const)
  .flatMap(loadRaw)
  .filter((r) => r.endDate >= today && r.startDate && r.name)

// https를 실제로 지원하는 이미지 호스트만 올린다.
// 지원하지 않는 곳(예: noel.or.kr)을 https로 바꾸면 열리지 않는 주소가 된다 —
// 그런 주소는 http 그대로 두고, 화면에서 Poster가 Next 이미지 최적화기로 우회한다.
const HTTPS_OK = ['tong.visitkorea.or.kr', 'kfescdn.visitkorea.or.kr']
const toHttps = (u: string | null | undefined) =>
  u && u.startsWith('http://') && HTTPS_OK.some((h) => u.includes(h)) ? 'https://' + u.slice(7) : u

// 정규화 — 시·도 표기 통일, 주소에서 시·도/시군구 보충
const validSigungu = (v?: string | null) => (v && /^[가-힣]{1,6}(시|군|구)$/.test(v.trim()) ? v.trim() : null)
for (const r of raws) {
  r.sido = resolveSido(r.sido, r.sigungu, r.address)
  // 주소 원문의 시·도 표기도 같이 고친다.
  //
  // canonSido는 sido 칸만 고쳐 왔다. 그래서 목록의 지역 분류는 「전라남도」로 맞는데,
  // 상세 화면의 위치 줄에는 원문이 그대로 나와 「전남광주통합특별시 진도군 …」이 보였다
  // (17건, 2026-08-19 발견). 분류는 고쳐졌으니 끝났다고 본 것이 놓친 지점이다.
  //
  // 원문 보존이 더 중요한 필드였다면 표시할 때 고쳤겠지만, 주소는 그럴 이유가 없다 —
  // 존재하지 않는 행정구역명을 보존할 값어치는 없다.
  if (r.address) {
    const m = r.address.match(/^\s*(\S+?(?:특별시|광역시|특별자치시|특별자치도|도))(\s|$)/)
    const head = m?.[1]
    if (head) {
      const canon = resolveSido(head, r.sigungu, r.address)
      if (canon && canon !== head) r.address = canon + r.address.slice(head.length)
    }
  }
  r.sigungu = validSigungu(r.sigungu) // '서초구남부순환로317길' 같은 주소 덩어리는 버린다
  if (!r.sido && r.address) {
    const m = r.address.match(/^(\S+?(?:특별시|광역시|특별자치시|특별자치도|도))\s*(\S+?(?:시|군|구))?/)
    if (m) {
      r.sido = resolveSido(m[1], r.sigungu ?? m[2], r.address)
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
//  - 이름이 완전일치하지 않아도, 같은 시군구에서 기간이 실제로 겹치고 한 이름이 다른 이름을
//    품으면 같은 축제로 본다. 표준데이터는 지자체가 축제명을 줄여 적는 일이 잦다
//    ('맥주축제'/'동대문구 맥주축제', '황토갯벌축제'/'무안 황토 갯벌축제' — 실측 14쌍).
//    포함 판정은 헐거우므로 시군구 일치와 기간 실제 겹침을 반드시 함께 건다.
const sameFestival = (a: RawFestival, b: RawFestival) => {
  const exact = normalizeName(a.name) === normalizeName(b.name)
  if (exact) {
    if (periodsOverlap(a.startDate, a.endDate, b.startDate, b.endDate, 0)) return true
    return (!a.sido || !b.sido || a.sido === b.sido) && periodsOverlap(a.startDate, a.endDate, b.startDate, b.endDate, 30)
  }
  return (
    !!a.sigungu &&
    a.sigungu === b.sigungu &&
    a.sido === b.sido &&
    periodsOverlap(a.startDate, a.endDate, b.startDate, b.endDate, 0) &&
    nameContains(a.name, b.name, placeWords(a))
  )
}

/** 포함 판정에서 배제할 낱말 — 그 축제가 열리는 지역 이름('광명시'·'광명') */
const bareRegion = (v: string) => v.replace(/(특별자치도|특별자치시|특별시|광역시|도|시|군|구)$/, '')
const placeWords = (r: RawFestival) =>
  [r.sigungu, r.sido].flatMap((v) => (v ? [v, bareRegion(v)] : []))

// 시군구 인덱스 — 포함관계 후보는 이름 완전일치 인덱스로 찾을 수 없다
const sgIndex = new Map<string, RawFestival[][]>()
const indexSigungu = (g: RawFestival[]) => {
  for (const r of g) {
    if (!r.sigungu || !r.sido) continue
    const k = `${r.sido}|${r.sigungu}`
    const arr = sgIndex.get(k) ?? []
    if (!arr.includes(g)) arr.push(g)
    sgIndex.set(k, arr)
  }
}
groups.forEach(indexSigungu)

for (const r of rest) {
  const k = normalizeName(r.name)
  const cands = [
    ...(k ? (nameIndex.get(k) ?? []) : []),
    ...(r.sigungu && r.sido ? (sgIndex.get(`${r.sido}|${r.sigungu}`) ?? []) : []),
  ]
  const hit = cands.find((g) => g.some((x) => sameFestival(x, r)))
  if (hit) {
    hit.push(r)
    indexGroup(hit) // 붙은 뒤 새 이름·시군구로도 찾히게
    indexSigungu(hit)
  } else {
    const g = [r]
    groups.push(g)
    indexGroup(g)
    indexSigungu(g)
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
  // 이름: 관광공사 공식 표기(kfes·tourapi)가 우선. 없으면 소스 순위가 아니라 '정보량'으로 고른다.
  // 표준데이터는 '맥주축제'처럼 지역명을 빼고 적는데, 소스 순위(stdfest > mcst)를 그대로 쓰면
  // 그 빈약한 이름이 '동대문구 맥주축제'를 이긴다. 긴 쪽이 대체로 지역명·주최를 담고 있다.
  let name = displayName(bySrc('kfes')?.name ?? bySrc('tourapi')?.name ?? longest(sorted.map((x) => x.name)) ?? head.name)
  // 회차는 매년 올라간다 — 소스마다 다르면 큰 쪽이 최신이다.
  // (경산대추축제: 표준데이터가 작년치 '제15회'를 들고 있어 문체부의 '제16회'를 눌렀다)
  const editions = sorted.map((x) => Number(x.name.match(/제?\s*(\d+)\s*회/)?.[1] ?? 0))
  const maxEd = Math.max(...editions, 0)
  const myEd = Number(name.match(/제?\s*(\d+)\s*회/)?.[1] ?? 0)
  if (myEd > 0 && maxEd > myEd) name = name.replace(/제?\s*\d+\s*회/, `제${maxEd}회`)

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
    lineup: first(sorted.map((x) => x.lineup)),
    // 요금만 소스 순서를 따르지 않는다.
    //
    // TourAPI는 「유료」 두 글자만 주는 일이 흔하다. 그건 사실이지만 여행자에게는
    // 거의 정보가 아니다 — 2천원인지 27만원인지 모른 채 갈지 말지를 정해야 한다.
    // 우리가 예매처에서 확인해 넣은 「3일권 266,000원 / 1일권 120,000원」이
    // 소스 순위가 낮다는 이유로 밀리면 아깝다.
    //
    // 그래서 금액이 적힌 것을 먼저 고른다. 없으면 원래대로 소스 순서.
    fee: first(sorted.map((x) => x.fee).filter((v) => v && /\d/.test(v))) ?? first(sorted.map((x) => x.fee)),
    homepage: first(sorted.map((x) => x.homepage)),
    instagram: first(sorted.map((x) => x.instagram)),
    youtube: first(sorted.map((x) => x.youtube)),
    tel: first(sorted.map((x) => x.tel)),
    category: first(sorted.map((x) => x.category)),
    organizer: first(sorted.map((x) => x.organizer)),
    booths: first(sorted.map((x) => x.booths)),
    boothsFromPastEdition: sorted.some((x) => x.boothsFromPastEdition),
    ageInfo: first(sorted.map((x) => x.ageInfo)),
    hours: first(sorted.map((x) => x.hours)),
    themes: [],
    popularity: 0,
    visitorLift: null,
    translations: [],
  }
  // 원문 안의 「전남광주통합특별시」도 판정된 시·도로 바꾼다.
  //
  // 이 표기는 주소뿐 아니라 주최자·소개글에도 섞여 나온다(명량대첩축제의 주최는
  // "전남광주통합특별시, 진도군, 해남군", 광주김치축제 소개는 "전남광주통합특별시는
  // 예로부터…"). 화면에 그대로 나가면 존재하지 않는 행정구역명을 우리가 퍼뜨리는 셈이다.
  //
  // 축제마다 답이 다르므로(광주 축제면 광주광역시, 전남 축제면 전라남도) 위에서 이미
  // 가려낸 f.sido로 바꾼다. 문장 안이라 통째로 갈아끼우지 않고 그 낱말만 바꾼다.
  if (f.sido && f.sido !== '전남광주통합특별시') {
    // 「전남광주통합특별시」와, 그것을 줄여 쓴 「전남광주」 둘 다 잡는다. 긴 것부터
    // 바꿔야 앞부분만 먹히고 「…특별시」가 남는 일이 없다. 광주 추억의 충장축제 소개에
    // "전남광주 동구 충장로"가 그렇게 남아 있었다.
    const fix = (v: string | null | undefined) =>
      v ? v.replaceAll('전남광주통합특별시', f.sido!).replaceAll('전남광주', f.sido!) : v
    f.organizer = fix(f.organizer) ?? null
    f.summary = fix(f.summary) ?? null
  }
  // 이미지 주소를 https로 올린다 — 단, 그 호스트가 https를 지원할 때만 의미가 있다.
  //
  // 공공 API가 http://tong.visitkorea.or.kr 로 주는 것이 26건 있었다(BUG-21). 이 호스트는
  // https를 지원하므로 올려 두는 편이 낫다. 프록시를 거치지 않아 우리 대역폭을 안 쓴다.
  //
  // 반대로 https를 아예 지원하지 않는 사이트도 있다(노을동요제의 noel.or.kr). 그런 주소를
  // https로 바꾸면 열리지 않는 주소가 되므로 손대지 않고 http 그대로 둔다 — 화면에서는
  // Poster가 Next 이미지 최적화기를 거쳐 우리 도메인에서 https로 내보낸다.
  f.imageUrl = toHttps(f.imageUrl) ?? null
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

// ── 보강 캐시 되먹임 ────────────────────────────────────────
// merge는 raw/*만 보고 festivals.json을 통째로 다시 만든다. 그래서 enrich 뒤에 merge를
// 단독 실행하면 enrich가 채운 좌표·이미지가 조용히 사라진다(실측: 이미지 66건·좌표 140건 유실).
// 캐시는 남아 있으니 여기서 바로 되먹인다 — API 호출 0, enrich를 다시 안 돌려도 된다.
try {
  const cp = new URL('../data/enrich-cache.json', import.meta.url)
  if (existsSync(cp)) {
    const cache = JSON.parse(readFileSync(cp, 'utf-8')) as Record<string, { lat?: number; lng?: number; imageUrl?: string; miss?: true }>
    let g = 0
    let i = 0
    for (const f of merged) {
      const c = cache[f.externalId]
      if (!c || c.miss) continue
      if (f.lat == null && c.lat != null) {
        f.lat = c.lat
        f.lng = c.lng ?? null
        g += 1
      }
      if (!f.imageUrl && c.imageUrl) {
        // 여기서도 https로. 위에서 한 번 올렸지만 이 되먹임이 그 뒤에 오므로 캐시에 남은
        // 옛 http 주소가 그대로 다시 들어온다 — 실제로 25건이 그렇게 살아남았다.
        f.imageUrl = toHttps(c.imageUrl) ?? null
        f.imageFrom = 'past'
        i += 1
      }
    }
    if (g || i) console.log(`   보강 캐시 되먹임: 좌표 +${g} · 이미지 +${i}`)
  }
} catch {
  /* 캐시가 깨졌으면 무시 — enrich가 다시 만든다 */
}

// ── 저장 + 리포트 ─────────────────────────────────────────
mkdirSync(new URL('../data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../data/festivals.json', import.meta.url), JSON.stringify({ exportedAt: new Date().toISOString(), items: merged }, null, 0))

const n = merged.length
const c = (fn: (f: Festival) => unknown) => merged.filter(fn).length
console.log(`▶ 원본 ${raws.length}건 → 병합 ${n}건`)
console.log(`   이미지 ${c((f) => f.imageUrl)} (${Math.round((100 * c((f) => f.imageUrl)) / n)}%) · 좌표 ${c((f) => f.lat != null)} (${Math.round((100 * c((f) => f.lat != null)) / n)}%) · 산문 개요 ${c((f) => (f.summary?.length ?? 0) > 60)}`)
console.log(`   소스 조합: ${Object.entries(merged.reduce<Record<string, number>>((m, f) => ((m[f.sources.join('+')] = (m[f.sources.join('+')] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
console.log(`   테마 미분류 ${c((f) => f.themes.length === 0)}건`)
