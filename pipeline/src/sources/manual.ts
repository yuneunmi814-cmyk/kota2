import { readFileSync } from 'node:fs'
import type { RawFestival } from '../lib/types.js'
import { todayKst } from '../lib/http.js'

// 수기 등록 — 현장 현수막·지자체 공지 등 API에 아직 없는 축제. data/seed/manual-festivals.json
export function fetchManual(): RawFestival[] {
  const file = JSON.parse(readFileSync(new URL('../../data/seed/manual-festivals.json', import.meta.url), 'utf-8')) as {
    items: Array<Partial<RawFestival> & { externalId: string; name: string; startDate: string; endDate: string }>
  }
  const rows = file.items
  const today = todayKst()
  return rows
    .filter((r) => r.endDate >= today)
    .map((r) => ({ ...r, source: 'manual' as const, sido: r.sido ?? null, sigungu: r.sigungu ?? null }))
}
