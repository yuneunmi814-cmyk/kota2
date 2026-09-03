import { cache } from 'react'
import { supabase } from './supabase'
import { fromSlug } from './slug'

// 이미 공유된 주소가 끊기지 않게, 옛 주소를 지금 축제로 잇는다.
//
// 예전에는 이 짝을 코드 안 표(ROUTE_CANDIDATES)에 손으로 적었다. 그런데 원천이 바뀔 때마다
// 사람이 표를 고쳐야 했고, 실제로 어긋났다 — DB의 `festival_route_aliases`에는 자라섬재즈
// 옛 주소가 있는데 코드 표에는 없었다(2026-09-04 확인). 근거가 두 군데로 갈리면 한쪽만
// 고쳐지고 다시 벌어진다.
//
// 이제는 DB 하나만 본다. 근거가 둘이다:
//   ① `festival_sources` — 병합에 참여한 모든 출처 ID가 영속 ID에 묶여 있다(924행).
//      대표 출처가 tourapi에서 stdfest로 바뀌어도 옛 tourapi 주소가 그대로 이어진다.
//      파이프라인이 주마다 갱신하므로 사람이 손댈 일이 없다.
//   ② `festival_route_aliases` — 출처 ID가 아닌 옛 주소(수기 등록분 등)를 손으로 적어 둔 표.
//      ①로 안 잡히는 것만 여기 남는다.
//
// 이 조회는 '직접 찾기에 실패했을 때만' 부른다. 정상 주소는 DB를 한 번 더 가지 않는다.

/** 옛 주소(externalId 또는 slug)로 지금 축제의 대표 externalId를 찾는다. 없으면 빈 배열. */
export const lookupAliasTargets = cache(async (slug: string): Promise<string[]> => {
  const externalId = fromSlug(slug)

  const [bySource, byAlias] = await Promise.all([
    supabase.from('festival_sources').select('festival_uid').eq('external_id', externalId).limit(1),
    supabase.from('festival_route_aliases').select('festival_uid').eq('slug', slug).limit(1),
  ])

  // 두 근거를 모두 시도한다. ①만 보고 끝내면 안 된다 — 대장에는 '죽은 영속 ID'가 남기
  // 때문이다. 원천에서 내려간 축제의 출처 ID도 대장에 그대로 있고, 그 영속 ID를 가진
  // festivals 행만 사라진다. 그때 ①이 먼저 답을 가로채면 ②의 손으로 적은 별칭이
  // 영영 쓰이지 않는다(유라리 건맥축제, 2026-09-04 실측).
  const uids = [bySource.data?.[0]?.festival_uid, byAlias.data?.[0]?.festival_uid].filter(
    (v): v is string => Boolean(v),
  )
  if (uids.length === 0) return []

  // 표가 아직 없는 환경(이전 SQL 미적용)에서는 조용히 빈 배열이 된다 — 옛 주소만 404가 되고
  // 나머지 화면은 그대로 돈다. 여기서 던지면 정상 주소까지 같이 죽는다.
  const out: string[] = []
  for (const uid of [...new Set(uids)]) {
    const { data } = await supabase.from('festivals').select('id').eq('festival_uid', uid).limit(1)
    const id = data?.[0]?.id
    if (id) out.push(id as string)
  }
  return out
})
