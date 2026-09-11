import { readFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { normalizeName, nameContains, periodsOverlap } from './lib/match.js'
import { todayKst } from './lib/http.js'
// Read-only snapshot audit. Pass a path and --json; stdout can be redirected to a report.
const path = process.argv.slice(2).find(x => !x.startsWith('--'))
const snapshot = JSON.parse(readFileSync(path ?? new URL('../data/festivals.json', import.meta.url), 'utf-8'))
const today = todayKst()
const items: Festival[] = snapshot.items
const active = items.filter(f => f.endDate >= today)
const duplicateCandidates = active.flatMap((a, i) => active.slice(i + 1).filter(b => (normalizeName(a.name) === normalizeName(b.name) || (!!a.sigungu && a.sigungu === b.sigungu && nameContains(a.name, b.name, [a.sigungu, a.sido ?? '']))) && a.sido === b.sido && periodsOverlap(a.startDate, a.endDate, b.startDate, b.endDate, 0)).map(b => ({ name: a.name, ids: [a.externalId, b.externalId] })))
const missing = active.filter(f => !f.imageUrl).map(f => ({ externalId: f.externalId, name: f.name, startDate: f.startDate, homepage: f.homepage ?? null, nextAction: f.tourapiId ? 'TourAPI 갤러리 확인' : f.homepage ? '공식 상세 공지·이용조건 검수' : '공식 출처 탐색' }))
const report = { checkedAt: new Date().toISOString(), snapshotExportedAt: snapshot.exportedAt ?? null, scope: '로컬 스냅샷; 실시간 이미지 응답/현재 운영 DB 미검사', total: items.length, active: active.length, missing: missing.length, pastEditionImages: active.filter(f => f.imageFrom === 'past').length, duplicateCandidates, missingItems: missing }
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2))
else {
  console.log(`# KOTA 콘텐츠 점검\n\n${report.scope}\n\n기준: ${today} · 원본 갱신: ${report.snapshotExportedAt ?? '미확인'}\n\n| 항목 | 건수 |\n|---|---:|\n| 진행·예정 축제 | ${report.active} |\n| 이미지 누락 | ${report.missing} |\n| 지난 회차 이미지 | ${report.pastEditionImages} |\n| 중복 의심 쌍(검수 필요) | ${duplicateCandidates.length} |\n\n## 이미지 누락 조치 목록\n`)
  for (const f of missing) console.log(`- ${f.startDate} ${f.name} (${f.externalId}) — ${f.nextAction}`)
}
