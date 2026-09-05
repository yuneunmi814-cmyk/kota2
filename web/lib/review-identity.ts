import type { SupabaseClient } from '@supabase/supabase-js'

/** Transitional read/write key set. Source IDs remain intact while the UID stays permanent. */
export async function reviewSourceIds(sb: SupabaseClient, festivalId: string): Promise<string[]> {
  // Enable in both server/client bundles only AFTER the CTO migration/rehearsal.
  // No automatic error fallback: a mapping outage must not create a second review.
  if (process.env.NEXT_PUBLIC_STABLE_REVIEW_IDS !== '1') return [festivalId]
  const { data, error } = await sb.from('festival_sources').select('festival_uid').eq('external_id', festivalId).limit(1)
  if (error) throw new Error('축제 후기 연결 조회 실패')
  const uid = data?.[0]?.festival_uid
  if (!uid) return [festivalId] // live-only event has no persistent mapping yet
  const sources = await sb.from('festival_sources').select('external_id').eq('festival_uid', uid)
  if (sources.error) throw new Error('축제 후기 출처 조회 실패')
  return [...new Set([festivalId, ...(sources.data ?? []).map(r => String(r.external_id))])]
}

/** Reuse the original review ID, including its votes/photos. Database UID uniqueness guards races. */
export async function saveReview(sb: SupabaseClient, festivalId: string, userId: string, rating: number, body: string) {
  try {
    const ids = await reviewSourceIds(sb, festivalId)
    const existing = await sb.from('reviews').select('id').in('festival_id', ids).eq('user_id', userId).order('id').limit(2)
    if (existing.error) return { error: existing.error }
    if ((existing.data?.length ?? 0) > 1) return { error: { message: '기존 후기 연결 확인이 필요합니다. 관리자에게 문의해 주세요.' } }
    const payload = { rating, body: body.trim(), status: 'pending', updated_at: new Date().toISOString() }
    if (existing.data?.[0]) return await sb.from('reviews').update(payload).eq('id', existing.data[0].id).eq('user_id', userId)
    return await sb.from('reviews').upsert({ festival_id: festivalId, user_id: userId, ...payload }, { onConflict: 'festival_id,user_id' })
  } catch {
    return { error: { message: '후기 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' } }
  }
}
