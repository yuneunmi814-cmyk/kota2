import { cache } from 'react'
import { supabase } from './supabase'

// 리뷰 읽기 — 서버에서 도는 쪽. 쓰기는 브라우저에서 로그인한 채로 한다(components/detail/Reviews).
//
// 공개된 리뷰만 나온다. 이건 코드가 거르는 게 아니라 DB가 거른다(RLS reviews_read) —
// 여기서 status 조건을 빠뜨려도 검토 중인 글은 새어 나오지 않는다. 화면 코드의 실수 하나로
// 승인 전 글이 노출되는 일이 없게 하려는 이중 장치다.
//
// profiles 조인에 제약 이름(!reviews_user_id_fkey)을 붙인 이유: reviews.user_id에서
// profiles로 가는 경로가 둘 생겨 PostgREST가 어느 쪽인지 못 고른다. 이름을 박아 두면
// 나중에 남는 제약을 정리해도 이 쿼리는 그대로 돈다.

export interface Review {
  id: number
  rating: number
  body: string
  visitedOn: string | null
  helpful: number
  createdAt: string
  author: string
  avatar: string | null
}

export interface Rating {
  average: number
  count: number
}

interface ReviewRow {
  id: number
  rating: number
  body: string
  visited_on: string | null
  helpful: number
  created_at: string
  user_id: string
  profiles: { display_name: string; avatar_url: string | null } | null
}

export const reviewsOf = cache(async (festivalId: string): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, body, visited_on, helpful, created_at, user_id, profiles!reviews_user_id_fkey(display_name, avatar_url)')
    .eq('festival_id', festivalId)
    .eq('status', 'published')
    // 도움돼요가 많은 글을 위로. 같으면 최신순 — 아무도 안 누른 초기에는 사실상 최신순이다.
    .order('helpful', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`리뷰 조회 실패(${festivalId}): ${error.message}`)
  return (data as unknown as ReviewRow[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body,
    visitedOn: r.visited_on,
    helpful: r.helpful,
    createdAt: r.created_at,
    author: r.profiles?.display_name ?? '여행자',
    avatar: r.profiles?.avatar_url ?? null,
  }))
})

/** 평점 집계 — 상세 상단의 별점. 리뷰가 없으면 null이고, 화면은 그 자리를 비운다. */
export const ratingOf = cache(async (festivalId: string): Promise<Rating | null> => {
  const { data, error } = await supabase
    .from('festival_rating')
    .select('rating, review_count')
    .eq('festival_id', festivalId)
    .maybeSingle()
  if (error || !data) return null
  return { average: Number(data.rating), count: Number(data.review_count) }
})
