import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { RawFestival } from '../lib/types.js'
import { todayKst } from '../lib/http.js'

// 문화체육관광부 「지역축제 개최계획」 — 연 1회 공개 엑셀(mcst.go.kr). 전국 시군구 조사라
// TourAPI·표준데이터에 없는 소규모 축제까지 담는다. 이미지가 없어 병합에서 보강한다.
// 원본은 data/seed/mcst-festivals-2026.json (엑셀 → JSON, 예정분만).

interface Row { name: string; sido: string; sigungu?: string; place?: string; startDate: string; endDate: string; note?: string }

export function fetchMcst(): RawFestival[] {
  const rows = JSON.parse(readFileSync(new URL('../../data/seed/mcst-festivals-2026.json', import.meta.url), 'utf-8')) as Row[]
  const today = todayKst()
  return rows
    .filter((r) => r.endDate >= today)
    .map((r) => {
      const h = createHash('sha1').update(`${r.name}|${r.startDate}`).digest('hex').slice(0, 10)
      const [type] = (r.note ?? '').split('/').map((s) => s.trim())
      return {
        externalId: `mcst:${h}`,
        source: 'mcst' as const,
        name: r.name.trim(),
        startDate: r.startDate,
        endDate: r.endDate,
        sido: r.sido || null,
        sigungu: r.sigungu || null,
        address: r.place ? `${r.sido} ${r.sigungu ?? ''} ${r.place}`.replace(/\s+/g, ' ').trim() : null,
        // 요약은 '장소 · 유형' 조각으로 — kfes 산문이 있으면 병합에서 덮인다
        summary: [r.place, type].filter(Boolean).join(' · ') || null,
        category: type || null,
      }
    })
}
