import { readFileSync, writeFileSync } from 'node:fs'
import type { Festival } from './lib/types.js'
import { placeName } from './lang/places.js'
import { LANGS, translateFestivalName, translateSummary, type Lang } from './lang/translate-name.js'
import { llmSummaryFor, loadLlmCache, runLlmTranslation } from './translate-llm.js'

// 다국어 — 손번역(data/seed/festival-translations.json)이 엔진을 덮는다.
//
// 엔진(사전+음역)은 매주 새로 들어오는 축제를 자동으로 덮는 안전망이고,
// 손번역은 그 위에 얹는 품질층이다. 이름이 정확히 같을 때만 손번역을 쓴다.
//
// kfes 산문 개요(150~300자)는 엔진 사전이 감당하지 못하는 진짜 문장이다.
// 이건 Claude(translate-llm.ts)가 옮기고 캐시된다. 키가 없으면 원문을 둔다 —
// 어설픈 기계 번역보다 한국어 원문이 낫다는 판단(외국인은 번역 앱으로 원문을 읽는다).
// 우선순위: 손번역 > LLM > 엔진.

interface Hand { name?: string; summary?: string | null; placeName?: string | null }
interface HandItem { festivalName: string; en?: Hand; ja?: Hand; th?: Hand }

const DATA = new URL('../data/festivals.json', import.meta.url)
const hand = new Map(
  (JSON.parse(readFileSync(new URL('../data/seed/festival-translations.json', import.meta.url), 'utf-8')) as { items: HandItem[] }).items.map(
    (i) => [i.festivalName, i],
  ),
)
const items = (JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }).items

await runLlmTranslation() // 키 없으면 즉시 반환
const llm = loadLlmCache()

const MAX_ENGINE_SUMMARY = 80 // 이 길이를 넘는 산문은 엔진으로 옮기지 않는다

let handCount = 0
let llmCount = 0
for (const f of items) {
  const h = hand.get(f.name)
  const nameTr = translateFestivalName(f.name)
  const sumTr = f.summary && f.summary.length <= MAX_ENGINE_SUMMARY ? translateSummary(f.summary) : null
  const llmTr = llmSummaryFor(llm, f)
  if (h) handCount += 1
  if (llmTr) llmCount += 1
  f.translations = LANGS.map((lang: Lang) => {
    const hl = h?.[lang]
    return {
      langCode: lang,
      name: hl?.name || nameTr[lang],
      summary: hl?.summary ?? llmTr?.[lang] ?? sumTr?.[lang] ?? null,
      placeName: hl?.placeName ?? placeName(f.sido ?? null, f.sigungu ?? null, lang),
    }
  })
}

writeFileSync(DATA, JSON.stringify({ exportedAt: new Date().toISOString(), items }))
const n = items.length
const withSum = items.filter((f) => f.translations.some((t) => t.summary)).length
const longProse = items.filter((f) => (f.summary?.length ?? 0) > MAX_ENGINE_SUMMARY).length
console.log(`▶ 번역 ${n}건 × 3언어 · 손번역 ${handCount} · LLM ${llmCount} · 요약 번역 ${withSum}건 (산문 ${longProse}건 중 원문 유지 ${longProse - llmCount})`)
