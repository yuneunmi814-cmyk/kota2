'use client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 브라우저용 Supabase 클라이언트 — 로그인 세션을 들고 있는 쪽.
//
// lib/supabase.ts(서버용)와 나눈 이유: 서버는 요청마다 남의 세션을 들고 있으면 안 되고
// (persistSession: false), 브라우저는 반대로 새로고침해도 로그인이 유지돼야 한다.
// 한 객체로 합치면 서버 렌더링 중에 누군가의 세션이 다른 사람 화면에 섞일 수 있다.
//
// 쓰기 권한은 키가 아니라 DB의 RLS가 정한다. 이 클라이언트로 리뷰를 써도
// user_id가 로그인한 본인이 아니면 거절된다(supabase/schema.sql의 reviews_insert).
//
// 테이블 타입은 아직 느슨하다. `supabase gen types`로 스키마에서 타입을 뽑아 두면
// 컬럼 오타를 컴파일 단계에서 잡을 수 있다 — 리뷰 스키마가 안정되면 그때 붙인다.

let client: SupabaseClient | null = null

export function browserSupabase(): SupabaseClient {
  if (client) return client
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
  )
  return client
}
