import type { NextConfig } from 'next'
import path from 'node:path'

// 동적 렌더링 — Vercel에 올린다. (2026-08-17 정적 내보내기에서 전환)
//
// 왜 바꿨나: 정적 사이트는 '누군가 남긴 것을 저장'할 수 없다. 리뷰·관심리스트·조회수처럼
// 시간이 쌓아주는 자산이 전부 막혔다. 축제 목록 자체는 여전히 주 1회만 바뀌지만,
// 그 하나 때문에 서비스의 미래를 닫아둘 이유가 없다.
//
// 다만 요청마다 DB를 때리지는 않는다. 페이지는 ISR로 굽는다(revalidate 3600) —
// 한 시간에 한 번만 다시 그리고 그 사이 방문자는 캐시를 본다. 축제 데이터는 주 1회
// 갱신이라 한 시간도 사실 과하게 촘촘한 편이고, 트래픽이 백 배로 늘어도 DB 부하는 그대로다.
// 리뷰처럼 즉시 보여야 하는 것만 따로 실시간으로 가져온다.
const nextConfig: NextConfig = {
  // Web and ingestion share the official correction policy/data outside web/.
  turbopack: { root: path.join(__dirname, '..') },
  outputFileTracingRoot: path.join(__dirname, '..'),
  // 축제 포스터는 지자체·주최측 서버의 외부 URL이라 도메인을 열어줘야 한다.
  // 정적 시절엔 unoptimized였지만 이제 Next 이미지 최적화 서버를 쓸 수 있다.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'tong.visitkorea.or.kr' },
      { protocol: 'https', hostname: 'kfescdn.visitkorea.or.kr' },
      { protocol: 'https', hostname: '**' }, // 주최측 홈페이지에서 긁은 포스터는 호스트가 제각각이다
    ],
  },
  // 정적 시절 /festivals/ 로 색인된 주소를 그대로 살린다. 지금 빼면 검색 결과가 전부 깨진다.
  trailingSlash: true,
  typedRoutes: false,
}

export default nextConfig
