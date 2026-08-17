import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import type { Festival } from './lib/types.js'

// 파이프라인 결과를 Supabase로 밀어 넣는다 — 주 1회, GitHub Actions에서 돈다.
//
// 여기서만 Secret 키를 쓴다. 축제 테이블은 공개 키로 읽기만 되고 쓰기는 RLS가 막으므로
// (실측: 42501 insufficient_privilege), 데이터를 넣는 건 이 스크립트뿐이다.
// 키는 코드나 저장소에 두지 않는다 — 로컬은 pipeline/.env, CI는 GitHub Secrets.
//
// ⚠ 지우지 않는다. 목록에서 빠진 축제도 DB에는 남긴다.
// 축제는 매년 다시 열리고, 거기 달린 리뷰·사진은 회차가 바뀌어도 읽을 값어치가 있다.
// '올해 목록'은 화면에서 날짜로 거르지, 과거를 삭제해서 만들지 않는다.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY
if (!url || !key) {
  console.error('✖ SUPABASE_URL / SUPABASE_SECRET_KEY 가 없습니다.')
  console.error('  로컬: pipeline/.env 에 SUPABASE_SECRET_KEY=sb_secret_... 한 줄 추가')
  console.error('  CI  : GitHub 저장소 Secrets 에 SUPABASE_SECRET_KEY 등록')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })
const items = (JSON.parse(readFileSync(new URL('../data/festivals.json', import.meta.url), 'utf-8')) as { items: Festival[] }).items

/** 한 번에 다 보내면 요청이 타임아웃된다 — 실측상 100건이 안전하다 */
const CHUNK = 100
const chunks = <T>(arr: T[]) => Array.from({ length: Math.ceil(arr.length / CHUNK) }, (_, i) => arr.slice(i * CHUNK, i * CHUNK + CHUNK))

async function push<T extends object>(table: string, rows: T[], conflict: string) {
  let done = 0
  for (const part of chunks(rows)) {
    const { error } = await db.from(table).upsert(part, { onConflict: conflict })
    if (error) throw new Error(`${table}: ${error.message}`)
    done += part.length
    process.stdout.write(`\r   ${table} ${done}/${rows.length}`)
  }
  process.stdout.write(`\r   ${table.padEnd(24)} ${rows.length}행 ✔\n`)
}

// ── 축제 본체 ───────────────────────────────────────────────
const festivals = items.map((f) => ({
  id: f.externalId,
  name: f.name,
  start_date: f.startDate,
  end_date: f.endDate,
  sido: f.sido ?? null,
  sigungu: f.sigungu ?? null,
  address: f.address ?? null,
  lat: f.lat ?? null,
  lng: f.lng ?? null,
  image_url: f.imageUrl ?? null,
  image_from: f.imageFrom ?? null,
  image_source: (f as { imageSource?: string }).imageSource ?? null,
  summary: f.summary ?? null,
  program: f.program ?? null,
  fee: f.fee ?? null,
  homepage: f.homepage ?? null,
  instagram: f.instagram ?? null,
  youtube: f.youtube ?? null,
  tel: f.tel ?? null,
  category: f.category ?? null,
  organizer: f.organizer ?? null,
  booths: f.booths ?? null,
  booths_from_past: f.boothsFromPastEdition ?? false,
  age_info: f.ageInfo ?? null,
  hours: f.hours ?? null,
  themes: f.themes ?? [],
  popularity: f.popularity ?? 0,
  visitor_lift: f.visitorLift ?? null,
  sources: f.sources ?? [],
  tourapi_id: f.tourapiId ?? null,
  synced_at: new Date().toISOString(),
}))

// ── 번역 ────────────────────────────────────────────────────
const translations = items.flatMap((f) =>
  (f.translations ?? []).map((t) => ({
    festival_id: f.externalId,
    lang: t.langCode,
    name: t.name ?? null,
    summary: t.summary ?? null,
    place_name: t.placeName ?? null,
    program: (t as { program?: string }).program ?? null,
    fee: (t as { fee?: string }).fee ?? null,
  })),
)

// ── 사진 ────────────────────────────────────────────────────
const photos = items.flatMap((f) =>
  (f.photos ?? []).map((p, i) => ({
    festival_id: f.externalId,
    ord: i,
    url: p.url,
    thumb: p.thumb ?? null,
    caption: p.name || null,
  })),
)

console.log(`▶ Supabase 적재 — 축제 ${festivals.length} · 번역 ${translations.length} · 사진 ${photos.length}`)
await push('festivals', festivals, 'id')
await push('festival_translations', translations, 'festival_id,lang')
await push('festival_photos', photos, 'festival_id,ord')

const { count } = await db.from('festivals').select('*', { count: 'exact', head: true })
console.log(`✔ 완료 — DB의 축제 ${count}건`)
