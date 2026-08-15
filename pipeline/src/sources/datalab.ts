import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { QuotaError, getJson, serviceKey, sleep } from '../lib/http.js'

// 한국관광공사 관광빅데이터 — 기초지자체 일별 방문자수 (DataLabService/locgoRegnVisitrDDList)
//
// KT(내국인)·SKT(외국인) 통신 데이터로 집계한 시군구별·일별·관광객구분(현지인/외지인/외국인)
// 방문자수다. 하루 1회 호출이면 전국 약 800행이 한 번에 온다.
//
// 축제 인기 지표로 쓰는 법: 축제별 방문자수는 없다. 대신 "축제 기간 중 개최 시군구의
// 외지인 방문자가 평소 대비 얼마나 늘었나"를 계산한다 — 그 축제가 사람을 얼마나 끌어왔나.
// 올해 축제는 아직 안 열렸으니 지난 회차(작년 같은 기간)로 계산한다.
//
// 저장: data/datalab/YYYYMMDD.json — 날짜별 전국 스냅샷. 한 번 받은 날은 다시 안 받는다.
// 데이터는 며칠~몇 주 지연되어 올라오므로 최근 날짜는 0건일 수 있다(그럼 캐시 안 함).

const BASE = 'https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList'
const DIR = new URL('../../data/datalab/', import.meta.url)

export interface DayRow { signguCode: string; signguNm: string; touDivCd: '1' | '2' | '3'; touNum: number }
interface Env { response?: { body?: { totalCount?: number; items?: '' | { item?: DayRow[] | DayRow } } } }

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

async function fetchDay(day: string): Promise<DayRow[]> {
  const url = `${BASE}?serviceKey=${serviceKey()}&MobileOS=ETC&MobileApp=KOTA&_type=json&numOfRows=1000&pageNo=1&startYmd=${day}&endYmd=${day}`
  const j = await getJson<Env>(url)
  const raw = j.response?.body?.items
  const items = raw && typeof raw === 'object' ? (Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []) : []
  return items.map((r) => ({ ...r, touNum: Number(r.touNum) }))
}

/** 날짜 하나 — 캐시 있으면 캐시, 없으면 호출 후 저장(0건이면 저장 안 함) */
export async function loadDay(day: string): Promise<DayRow[] | null> {
  const p = new URL(`${day}.json`, DIR)
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf-8')) as DayRow[]
  const rows = await fetchDay(day)
  if (rows.length === 0) return null
  writeFileSync(p, JSON.stringify(rows))
  await sleep(100)
  return rows
}

/** [from, to] 구간의 날짜 문자열 목록 */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  const d = new Date(`${from.slice(0, 4)}-${from.slice(4, 6)}-${from.slice(6, 8)}T00:00:00Z`)
  const end = new Date(`${to.slice(0, 4)}-${to.slice(4, 6)}-${to.slice(6, 8)}T00:00:00Z`)
  while (d <= end) {
    out.push(ymd(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/**
 * 시군구 이름 → 코드 매핑. 응답의 signguNm이 '무주군'처럼 짧은 이름이라 우리 sigungu와 바로 붙는다.
 * 같은 이름이 여러 도에 있는 경우(예: '중구', '남구', '동구')는 시·도 코드 앞 2자리로 가른다.
 */
export function buildSigunguIndex(rows: DayRow[]): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const r of rows) {
    const arr = m.get(r.signguNm) ?? []
    if (!arr.includes(r.signguCode)) arr.push(r.signguCode)
    m.set(r.signguNm, arr)
  }
  return m
}

// 시·도 → 행정표준코드 앞 2자리(통신 데이터의 signguCode 접두)
export const SIDO_PREFIX: Record<string, string> = {
  서울특별시: '11', 부산광역시: '26', 대구광역시: '27', 인천광역시: '28', 광주광역시: '29', 대전광역시: '30',
  울산광역시: '31', 세종특별자치시: '36', 경기도: '41', 강원특별자치도: '51', 충청북도: '43', 충청남도: '44',
  전북특별자치도: '52', 전라남도: '46', 경상북도: '47', 경상남도: '48', 제주특별자치도: '50',
}

/** 실패해도 파이프라인을 세우지 않기 위한 래퍼 */
export async function safeLoadDay(day: string): Promise<DayRow[] | null> {
  try {
    return await loadDay(day)
  } catch (e) {
    if (e instanceof QuotaError) throw e
    return null
  }
}
