import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import type { Festival } from './lib/types.js'

// 파이프라인 결과를 Supabase로 밀어 넣는다 — 주 1회, GitHub Actions에서 돈다.
//
// 여기서만 Secret 키를 쓴다. 축제 테이블은 공개 키로 읽기만 되고 쓰기는 RLS가 막으므로
// (실측: 42501 insufficient_privilege), 데이터를 넣는 건 이 스크립트뿐이다.
// 키는 코드나 저장소에 두지 않는다 — 로컬은 pipeline/.env, CI는 GitHub Secrets.
//
// ⚠ 끝난 축제는 지우지 않는다. 목록에서 빠져도 DB에는 남긴다.
// 축제는 매년 다시 열리고, 거기 달린 리뷰·사진은 회차가 바뀌어도 읽을 값어치가 있다.
// '올해 목록'은 화면에서 날짜로 거르지, 과거를 삭제해서 만들지 않는다.
//
// 다만 '아직 안 끝났는데 이번 산출물에 없는 행'은 지운다 — 병합돼 사라졌거나 원천에서
// 내려간 것이라 화면에 있으면 중복·유령이 된다. 맨 아래 정리 단계를 볼 것.

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
  lineup: f.lineup ?? null,
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
//
// 주소는 https로 올려서 넣는다. 공공 API가 http://tong.visitkorea.or.kr 로 주는 것이 섞여
// 있는데(BUG-21) 우리 페이지는 https라 브라우저가 혼합 콘텐츠로 차단한다 — 지금도 안 보이는
// 사진이라 올린다고 잃을 것이 없다. merge에서 imageUrl에 같은 처리를 한다.
const https = (u: string | null | undefined) => (u && u.startsWith('http://') ? 'https://' + u.slice(7) : u)
const photos = items.flatMap((f) =>
  (f.photos ?? []).map((p, i) => ({
    festival_id: f.externalId,
    ord: i,
    url: https(p.url)!,
    thumb: https(p.thumb) ?? null,
    caption: p.name || null,
  })),
)

console.log(`▶ Supabase 적재 — 축제 ${festivals.length} · 번역 ${translations.length} · 사진 ${photos.length}`)
await push('festivals', festivals, 'id')
await push('festival_translations', translations, 'festival_id,lang')
await push('festival_photos', photos, 'festival_id,ord')

// ── 병합돼 사라진 옛 행 걷어내기 ────────────────────────────
//
// 위 규칙("지우지 않는다")은 과거 축제를 위한 것이다. 그런데 그것만 지키다 보니 다른 것이
// 같이 눌러앉았다 — 병합 규칙이 좋아져 한 건으로 합쳐진 축제의 '합쳐지기 전 행'이다.
//
// 예: 명량대첩축제는 tourapi:607417 하나로 병합됐는데 DB에는 kfes:607417이 그대로 남아,
// 화면에 같은 축제가 두 번 떴다(2026-08-23 QA에서 8쌍). 산출물 475건 대 DB 510건,
// 차이 35건 중 16건이 아직 안 끝난 축제였다.
//
// 그래서 조건을 좁혀 지운다 — 산출물에 없고, 아직 끝나지도 않은 행.
// 아직 안 끝났는데 이번 산출물에 없다는 것은 둘 중 하나다: 다른 행으로 병합됐거나,
// 원천에서 내려갔거나. 어느 쪽이든 화면에 있어서는 안 된다.
// 끝난 축제는 건드리지 않는다 — 리뷰·사진을 남겨 두는 원래 뜻 그대로다.
const alive = new Set(festivals.map((f) => f.id))
const todayKstStr = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
const { data: dbRows, error: listErr } = await db
  .from('festivals')
  .select('id,name,end_date')
  .gte('end_date', todayKstStr)
if (listErr) throw new Error(`정리 대상 조회 실패: ${listErr.message}`)

const stale = (dbRows ?? []).filter((r) => !alive.has(r.id as string))
if (stale.length === 0) {
  console.log('   정리할 옛 행 없음')
} else {
  for (const part of chunks(stale)) {
    const { error } = await db.from('festivals').delete().in('id', part.map((r) => r.id as string))
    if (error) throw new Error(`옛 행 삭제 실패: ${error.message}`)
  }
  console.log(`   옛 행 ${stale.length}건 정리 — ${stale.slice(0, 5).map((r) => `${r.name}(${r.id})`).join(', ')}${stale.length > 5 ? ' 외' : ''}`)
}

const { count } = await db.from('festivals').select('*', { count: 'exact', head: true })
console.log(`✔ 완료 — DB의 축제 ${count}건`)
