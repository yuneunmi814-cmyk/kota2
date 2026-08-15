import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import type { Festival } from './lib/types.js'
import { translateSummary } from './lang/translate-name.js'

// 산문 개요 LLM 번역 — 엔진(사전+음역)이 못 옮기는 긴 문장을 Claude로 옮긴다.
//
// 자리: 손번역 > LLM > 엔진. 손번역이 있으면 LLM을 안 부르고, LLM 결과가 있으면 엔진을 안 쓴다.
// 결과는 data/llm-translations.json 에 (externalId, 원문 해시)로 캐시된다.
// 그래서 첫 실행만 130건을 옮기고, 매주는 새로 들어온 축제만 옮긴다 — 비용이 거의 0에 수렴한다.
//
// ANTHROPIC_API_KEY 가 없으면 아무것도 하지 않는다. 파이프라인은 그대로 완주한다.
// 키는 은미님이 console.anthropic.com에서 발급해 pipeline/.env 와 GitHub 시크릿에 넣는다.

const CACHE = new URL('../data/llm-translations.json', import.meta.url)
const DATA = new URL('../data/festivals.json', import.meta.url)
const MODEL = 'claude-sonnet-5' // 번역은 Sonnet으로 충분하고 Opus 5는 요청당 사고 시간이 길어 8건 배치가 10분을 넘겼다(실측)
const MAX_ENGINE = 80 // 이 길이를 넘으면 엔진 사전이 감당 못 한다
const BATCH = 4 // 한 요청에 4건 — 응답 1~2천 토큰, 한 배치가 1분 안에 끝난다

interface Tr { en: string; ja: string; th: string }
interface CacheEntry { hash: string; name: string; summary: Tr }
type Cache = Record<string, CacheEntry>

const hashOf = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 12)

// 엔진이 실패했는지 — 한국어 조사·어미가 로마자로 남아 있으면 번역이 아니라 음역이다.
// 예: '우리가 살고 있는 도시는…' → 'Uriga Salgo Inneun City Neun Wollae…'
// 길이로만 거르면 이런 짧은 실패가 그대로 화면에 나간다(실측 15건).
const KO_PARTICLE =
  /\b(?:Neun|Reul|Eul|Ege|Eseo|Euro|Ieotda|Ieotdago|Haeyo|Hamnida|Ipnida|Inneun|Haneun|Doeneun|Wihan|Wihae|Kkaji|Buteo|Boda|Cheoreom|Mada|Hago|Hamyeo|Seumnida|Getda)\b/i

/** 이 축제의 요약을 LLM이 맡아야 하는가 — 길거나, 엔진 결과가 음역으로 무너졌거나 */
export function needsLlm(f: Festival): boolean {
  const ko = f.summary?.trim()
  if (!ko) return false
  if (ko.length > MAX_ENGINE) return true
  const en = translateSummary(ko)?.en ?? ''
  return KO_PARTICLE.test(en)
}

// 시스템 프롬프트 — 약 300토큰이라 프롬프트 캐시 최소(Sonnet 5는 1024)에 못 미친다. 캐시를 켜도 실측 cache 0.
// 4건 배치에선 캐시 이득이 작으니 프롬프트를 억지로 늘리지 않고 그냥 보낸다.
const SYSTEM = `You translate Korean festival descriptions for a tourism website (KOTA) that helps foreign visitors find festivals in Korea.

Audience: travelers reading on a phone. Register: warm, plain, concrete. Not marketing copy, not a brochure — a friend explaining what the festival is.

Rules
- Translate the meaning, not word by word. Korean official prose is often one long sentence with many clauses; split it into 2–4 natural sentences.
- Keep every fact: dates, place names, what visitors can do, prices if mentioned. Do not add facts, do not drop them.
- Place names: use the romanization travelers will see on signs (Revised Romanization) — Gyeongju, Jeonju, Tongyeong, Yangpyeong. Japanese: katakana with kanji where established (慶州, 全州). Thai: transliterate phonetically.
- Festival names inside the text: keep them recognizable; don't over-translate proper nouns.
- Japanese: です・ます体, natural for a Japanese travel site (じゃらん・楽天トラベル tone).
- Thai: polite register, no ครับ/ค่ะ endings.
- No preamble, no notes, no quotes around the text.

Return JSON only.`

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          en: { type: 'string' },
          ja: { type: 'string' },
          th: { type: 'string' },
        },
        required: ['id', 'en', 'ja', 'th'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

async function translateBatch(client: Anthropic, batch: { id: string; name: string; summary: string }[]): Promise<Map<string, Tr>> {
  const user = batch.map((b) => `<festival id="${b.id}">\n<name>${b.name}</name>\n<summary>${b.summary}</summary>\n</festival>`).join('\n\n')
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 16000, // 태국어가 길다 — 4건×3언어에 8000이면 잘린다(실측 배치 1건 JSON 절단)
    system: SYSTEM,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Translate each <summary> into English, Japanese, and Thai. Return {"items":[{"id","en","ja","th"}]} for every festival, same ids.\n\n${user}` }],
  })
  if (res.stop_reason === 'refusal') throw new Error(`refusal: ${res.stop_details?.category ?? ''}`)
  const text = res.content.find((b) => b.type === 'text')?.text ?? ''
  const parsed = JSON.parse(text) as { items: ({ id: string } & Tr)[] }
  const out = new Map<string, Tr>()
  for (const it of parsed.items) out.set(it.id, { en: it.en, ja: it.ja, th: it.th })
  process.stdout.write(`   · ${batch.length}건 (in ${res.usage.input_tokens}+cache ${res.usage.cache_read_input_tokens ?? 0} / out ${res.usage.output_tokens})\n`)
  return out
}

export async function runLlmTranslation(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('▶ LLM 번역 건너뜀 — ANTHROPIC_API_KEY 없음(엔진 번역만 적용)')
    return
  }
  const cache: Cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {}
  const items = (JSON.parse(readFileSync(DATA, 'utf-8')) as { items: Festival[] }).items

  // 대상: LLM이 맡아야 하는 요약(긴 산문 + 엔진이 음역으로 무너진 것) 중 캐시에 없는 것
  const todo = items
    .filter(needsLlm)
    .filter((f) => cache[f.externalId]?.hash !== hashOf(f.summary!))
    .map((f) => ({ id: f.externalId, name: f.name, summary: f.summary! }))

  if (todo.length === 0) {
    console.log(`▶ LLM 번역 — 새 항목 없음(캐시 ${Object.keys(cache).length}건)`)
    return
  }
  console.log(`▶ LLM 번역 ${todo.length}건 (${MODEL}, ${BATCH}건씩)`)
  const client = new Anthropic()
  let done = 0
  let failed = 0
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    process.stdout.write(`   [${Math.floor(i / BATCH) + 1}/${Math.ceil(todo.length / BATCH)}] `)
    try {
      const got = await translateBatch(client, batch)
      for (const b of batch) {
        const tr = got.get(b.id)
        if (!tr) continue
        cache[b.id] = { hash: hashOf(b.summary), name: b.name, summary: tr }
        done += 1
      }
      writeFileSync(CACHE, JSON.stringify(cache, null, 1)) // 배치마다 저장 — 중간에 끊겨도 잃지 않는다
    } catch (e) {
      failed += batch.length
      console.error(`   ✖ 배치 실패: ${(e as Error).message}`)
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) break
    }
  }
  console.log(`✔ LLM 번역 완료 ${done}건 · 실패 ${failed}건 · 캐시 총 ${Object.keys(cache).length}건`)
}

/** translate.ts가 쓴다 — 캐시에서 이 축제의 LLM 요약을 꺼낸다(원문이 바뀌었으면 null) */
export function loadLlmCache(): Cache {
  return existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {}
}
export function llmSummaryFor(cache: Cache, f: Festival): Tr | null {
  const c = cache[f.externalId]
  if (!c || !f.summary || c.hash !== hashOf(f.summary)) return null
  return c.summary
}
