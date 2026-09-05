import { createClient } from '@supabase/supabase-js'
import { measuredFetch } from './query-metrics'

// Supabase 클라이언트 — 서버·브라우저 양쪽에서 쓰는 읽기 전용 기본 클라이언트.
//
// 여기 실리는 건 Publishable 키뿐이다. 이 키는 브라우저에 그대로 나가는 게 정상이고,
// 실제 접근 통제는 키가 아니라 DB의 행 수준 보안(RLS)이 한다 — 공개 정책을 붙인 테이블만
// 읽히고, 리뷰 수정·삭제는 로그인한 본인만 된다(supabase/schema.sql).
//
// 모든 것을 할 수 있는 Secret 키는 이 파일에도, 저장소에도 두지 않는다.
// 데이터를 쓰는 쪽(주 1회 도는 파이프라인)만 그 키를 쓰고, 그건 GitHub Secrets에 있다.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  // 빌드 중에 조용히 빈 데이터로 넘어가면 '축제 0곳' 사이트가 배포된다. 여기서 멈추는 게 낫다.
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 가 없습니다. ' +
      '로컬은 web/.env.local, 배포는 Vercel 환경변수를 확인하세요.',
  )
}

export const supabase = createClient(url, key, {
  ...(process.env.KOTA_QUERY_METRICS === '1' && typeof window === 'undefined' ? {
    global: { fetch: measuredFetch(fetch, metric => console.info('[kota-db-metric]' + JSON.stringify(metric))) },
  } : {}),
  auth: {
    // 서버 렌더링에서는 세션을 저장할 곳이 없다. 로그인 흐름은 별도 클라이언트에서 다룬다.
    persistSession: false,
  },
})
