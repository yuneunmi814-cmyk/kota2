import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { QuotaError } from './lib/http.js'
import { SIDO_PREFIX, buildSigunguIndex, daysBetween, safeLoadDay, type DayRow } from './sources/datalab.js'

// 인기 지표 — 관광공사 관광빅데이터(통신 데이터 방문자수)로 축제별 '외지인 유입 배율'을 만든다.
//
// 정의: 지난 회차 축제 기간 중 개최 시군구 외지인 방문자 **최대치** ÷ 전후 4주 **같은 요일 중앙값**.
//  - 최대치를 쓰는 이유: 축제는 주말 하루에 몰린다. 평균은 평일에 희석돼 신호가 사라진다
//    (무주반딧불 실측: 축제 토요일 45,840 vs 평일 14,000. 평균으로 보면 0.7배, 최대로 보면 3.1배).
//  - 같은 요일 중앙값을 쓰는 이유: 주말은 원래 많다. 토요일은 토요일끼리 비교해야 축제 효과만 남는다.
//    8월 휴가철 같은 계절 효과도 전후 4주 안에서는 대체로 상쇄된다.
//  - 지난 회차(작년 같은 날짜)를 보는 이유: 올해 축제는 아직 안 열렸다.
//
// 결과 popularity = 유입 배율 × 100 (정수). 없으면(시군구 매칭 실패·데이터 없음) 기존 프록시로.
// 데이터랩 지연 때문에 최근 축제는 계산이 안 될 수 있다 — 그건 정직하게 null이다.

const DATA = new URL('../data/festivals.json', import.meta.url)
mkdirSync(new URL('../data/datalab/', import.meta.url), { recursive: true })

const items = (JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }).items

const shift = (d: string, days: number) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + days)
  return t.toISOString().slice(0, 10)
}
const compact = (d: string) => d.replace(/-/g, '')
const dow = (ymd: string) => new Date(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}T00:00:00Z`).getUTCDay()
const median = (v: number[]) => {
  if (!v.length) return null
  const s = [...v].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2
}

// 하루 스냅샷 캐시(메모리) — 같은 날을 여러 축제가 쓴다
const dayCache = new Map<string, DayRow[] | null>()
async function day(d: string) {
  if (!dayCache.has(d)) dayCache.set(d, await safeLoadDay(d))
  return dayCache.get(d) ?? null
}

// 시군구 이름→코드 인덱스는 아무 날 하나로 만든다
let sgIndex: Map<string, string[]> | null = null

async function liftFor(f: Festival): Promise<{ lift: number; peak: number; base: number } | null> {
  if (!f.sigungu || !f.sido) return null
  const prefix = SIDO_PREFIX[f.sido]
  if (!prefix) return null
  // 지난 회차: 작년 같은 날짜. 상시(300일↑)는 의미 없으니 제외
  const s0 = f.startDate
  const e0 = f.endDate
  if ((new Date(e0).getTime() - new Date(s0).getTime()) / 86_400_000 > 21) return null // 3주 넘는 행사는 '기간 유입'이 안 잡힌다
  const s = compact(shift(s0, -364)) // 같은 요일 정렬을 위해 364일(52주)
  const e = compact(shift(e0, -364))
  const before = daysBetween(compact(shift(s0, -364 - 28)), compact(shift(s0, -364 - 1)))
  const after = daysBetween(compact(shift(e0, -364 + 1)), compact(shift(e0, -364 + 28)))
  const festDays = daysBetween(s, e)

  if (!sgIndex) {
    const any = await day(festDays[0]!)
    if (!any) return null
    sgIndex = buildSigunguIndex(any)
  }
  const codes = (sgIndex.get(f.sigungu) ?? []).filter((c) => c.startsWith(prefix))
  const code = codes[0]
  if (!code) return null

  const outsiders = async (d: string) => {
    const rows = await day(d)
    if (!rows) return null
    const r = rows.find((x) => x.signguCode === code && x.touDivCd === '2')
    return r ? r.touNum : null
  }

  // 축제 기간 일별 → 최대치와 그 요일
  let peak = -1
  let peakDow = -1
  for (const d of festDays) {
    const v = await outsiders(d)
    if (v != null && v > peak) {
      peak = v
      peakDow = dow(d)
    }
  }
  if (peak < 0) return null
  // 기준: 전후 4주 중 같은 요일
  const baseVals: number[] = []
  for (const d of [...before, ...after]) {
    if (dow(d) !== peakDow) continue
    const v = await outsiders(d)
    if (v != null) baseVals.push(v)
  }
  const base = median(baseVals)
  if (!base || base <= 0) return null
  return { lift: peak / base, peak, base }
}

let computed = 0
let skipped = 0
const report: { name: string; sigungu: string; lift: number; peak: number; base: number }[] = []
try {
  for (const f of items) {
    const r = await liftFor(f)
    if (!r) {
      skipped += 1
      continue
    }
    computed += 1
    f.visitorLift = Math.round(r.lift * 100) / 100
    report.push({ name: f.name, sigungu: f.sigungu!, ...r })
  }
} catch (e) {
  if (e instanceof QuotaError) console.error(`✖ 데이터랩 쿼터 소진 — ${computed}건 계산 후 중단. 캐시된 날은 다음 실행이 이어서 씁니다`)
  else throw e
}

// popularity 재산정 — 유입 배율이 있으면 그것을 주축으로, 공식 지정은 보정으로
for (const f of items) {
  const grade = f.category === 'MF' ? 100 : 0
  const cur = f.sources.includes('kfes') ? 30 : 0
  const multi = f.sources.length * 10
  if (f.visitorLift != null) {
    // 배율 1.0 = 평소와 같음(0점), 2.0 = 두 배(100점), 3.0 = 세 배(200점)…  + 공식 지정 보정
    f.popularity = Math.round(Math.max(0, f.visitorLift - 1) * 100) + grade + cur
  } else {
    f.popularity = grade + cur + multi // 데이터 없으면 이전 프록시
  }
}

writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items }))
report.sort((a, b) => b.lift - a.lift)
console.log(`▶ 방문자 유입 배율 계산 ${computed}건 · 대상 외 ${skipped}건 (시군구 미매칭·3주 초과·데이터 없음)`)
for (const r of report.slice(0, 10)) console.log(`   ${r.lift.toFixed(2)}x  ${r.name.slice(0, 22).padEnd(22)} ${r.sigungu} (피크 ${Math.round(r.peak).toLocaleString()} / 평소 ${Math.round(r.base).toLocaleString()})`)
