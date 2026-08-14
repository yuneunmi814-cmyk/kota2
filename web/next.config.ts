import type { NextConfig } from 'next'

// 정적 내보내기 — 서버 없이 GitHub Pages/CDN에 올린다.
//
// 왜 SSG인가: 축제 정보는 주 1회만 갱신되므로 요청마다 서버가 돌 이유가 없다.
// 그리고 네이버 크롤러는 JS를 실행하지 않으므로 **실제 HTML 파일**이 있어야 색인된다
// (이전 구현은 빌드 후 문자열 치환으로 흉내냈는데, 그건 우회였다).
//
// basePath: GitHub Pages는 /<repo>/ 아래에 올라간다. 도메인을 사면 빈 값으로 바꾼다.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  // 정적 내보내기에서는 Next 이미지 최적화 서버가 없다. 축제 포스터는 지자체 서버의
  // 외부 URL이라 어차피 우리가 리사이즈할 수 없다.
  images: { unoptimized: true },
  // 정적 호스팅에서 /festivals/ 처럼 디렉터리+index.html 로 나가야 404가 안 난다
  trailingSlash: true,
  // typedRoutes는 끈다 — 모든 경로가 `/${lang}/...` 템플릿이라 컴파일 타임에 검증이
  // 불가능하고, 결과적으로 링크마다 as Route 캐스팅만 늘어나 안전성은 오히려 사라진다.
  typedRoutes: false,
}

export default nextConfig
