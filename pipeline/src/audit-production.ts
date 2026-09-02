import { createClient } from '@supabase/supabase-js'

// 운영 DB 현황을 읽기만 하는 점검 도구.
//
// 의도적으로 select 이외의 Supabase 메서드를 쓰지 않는다. 결과에는
// 리뷰 내용, 검색어, 방문자 ID 같은 이용자 데이터를 출력하지 않고
// 표/컬럼/행 수와 연결이 끊긴 festival_id 건수만 출력한다.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SECRET_KEY

if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY가 필요합니다.')
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const TABLES = [
  'festivals',
  'festival_translations',
  'festival_photos',
  'profiles',
  'reviews',
  'review_photos',
  'review_votes',
  'reports',
  'saves',
  'views',
  'events',
  'corrections',
  'promos',
] as const

const FESTIVAL_LINK_TABLES = [
  'festival_translations',
  'festival_photos',
  'reviews',
  'saves',
  'views',
  'events',
  'corrections',
  'promos',
] as const

async function openApiColumns(): Promise<Map<string, string[]>> {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key!,
      Authorization: `Bearer ${key}`,
      Accept: 'application/openapi+json',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`PostgREST 메타데이터 조회 실패: HTTP ${response.status}`)

  const spec = (await response.json()) as {
    definitions?: Record<string, { properties?: Record<string, unknown> }>
    components?: { schemas?: Record<string, { properties?: Record<string, unknown> }> }
  }
  const schemas = spec.definitions ?? spec.components?.schemas ?? {}
  return new Map(
    Object.entries(schemas).map(([name, schema]) => [name, Object.keys(schema.properties ?? {}).sort()]),
  )
}

async function exactCount(table: string): Promise<number | null> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) {
    console.warn(`- ${table}: 조회 불가 (${error.code ?? 'unknown'})`)
    return null
  }
  return count ?? 0
}

async function readColumn(table: string, column: string): Promise<string[]> {
  const PAGE = 1_000
  const values: string[] = []

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .not(column, 'is', null)
      .order(column)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}.${column} 조회 실패: ${error.code ?? error.message}`)
    const page = (data ?? []) as unknown as Array<Record<string, unknown>>
    values.push(...page.map((row) => String(row[column])))
    if (page.length < PAGE) break
  }

  return values
}

const columns = await openApiColumns()

console.log('[운영 DB 읽기 전용 점검]')
console.log(`시각: ${new Date().toISOString()}`)
console.log('\n1. 표·행·컬럼')

for (const table of TABLES) {
  const knownColumns = columns.get(table)
  if (!knownColumns) {
    console.log(`- ${table}: 표 또는 메타데이터 미확인`)
    continue
  }
  const count = await exactCount(table)
  console.log(`- ${table}: ${count ?? '미확인'}행 / ${knownColumns.join(', ')}`)
}

const festivalIds = new Set(await readColumn('festivals', 'id'))

console.log('\n2. 현재 festivals와 연결이 끊긴 festival_id')
for (const table of FESTIVAL_LINK_TABLES) {
  if (!columns.has(table) || !columns.get(table)?.includes('festival_id')) {
    console.log(`- ${table}: festival_id 컬럼 미확인`)
    continue
  }
  const ids = await readColumn(table, 'festival_id')
  const orphanRows = ids.filter((id) => !festivalIds.has(id))
  console.log(`- ${table}: ${orphanRows.length}행 / ${new Set(orphanRows).size}개 ID`)
  if (orphanRows.length > 0) {
    const counts = new Map<string, number>()
    for (const id of orphanRows) counts.set(id, (counts.get(id) ?? 0) + 1)
    for (const [id, count] of [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      console.log(`  · ${id}: ${count}행`)
    }
  }
}

console.log('\n완료: 데이터 변경 없음 (SELECT/GET만 사용)')
