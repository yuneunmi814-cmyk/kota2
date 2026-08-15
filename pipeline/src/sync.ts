import { mkdirSync, writeFileSync } from 'node:fs'
import { fetchKfes } from './sources/kfes.js'
import { fetchTourapi } from './sources/tourapi.js'
import { fetchStdfest } from './sources/stdfest.js'
import { fetchMcst } from './sources/mcst.js'
import { fetchManual } from './sources/manual.js'
import type { RawFestival } from './lib/types.js'

// 5개 소스를 각각 받아 data/raw/<source>.json 으로 저장한다.
// 한 소스가 실패해도 나머지는 저장한다 — 쿼터 소진 하루 때문에 전체가 비면 안 된다.
// 이전 결과 파일이 남아 있으므로, 실패한 소스는 지난 주 데이터로 병합된다.

mkdirSync(new URL('../data/raw/', import.meta.url), { recursive: true })
const save = (name: string, rows: RawFestival[]) => {
  writeFileSync(new URL(`../data/raw/${name}.json`, import.meta.url), JSON.stringify({ fetchedAt: new Date().toISOString(), rows }, null, 0))
  const c = (k: keyof RawFestival) => rows.filter((r) => r[k]).length
  console.log(`✔ ${name.padEnd(8)} ${String(rows.length).padStart(4)}건 · 이미지 ${c('imageUrl')} · 좌표 ${rows.filter((r) => r.lat && r.lng).length} · 개요 ${c('summary')}`)
}

const jobs: [string, () => Promise<RawFestival[]> | RawFestival[]][] = [
  ['kfes', fetchKfes],
  ['tourapi', fetchTourapi],
  ['stdfest', fetchStdfest],
  ['mcst', fetchMcst],
  ['manual', fetchManual],
]
let failed = 0
for (const [name, fn] of jobs) {
  try {
    save(name, await fn())
  } catch (e) {
    failed += 1
    console.error(`✖ ${name}: ${(e as Error).message}`)
  }
}
if (failed) console.error(`\n${failed}개 소스 실패 — 해당 소스는 지난 결과로 병합됩니다`)
