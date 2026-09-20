import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/i18n'

export const dynamic = 'force-static'

// robots.txt
//
// 막는 곳은 둘뿐이다. /admin은 운영 화면이고, /img는 http 포스터를 https로 중계하는 통로라
// 색인될 내용이 없다(크롤러가 긁으면 우리 대역폭만 쓴다).
//
// AI 검색(ChatGPT·Claude·Perplexity·Gemini)의 크롤러는 이름을 적어 명시적으로 허용한다.
// '*' 허용만으로도 들어올 수 있지만, 일부 호스팅·보안 설정은 이 봇들을 기본 차단한다 —
// 여기 이름이 있으면 "일부러 열어 둔 것"이라는 기록이 된다. 축제 정보는 많이 인용될수록 좋다.
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Yeti', 'Bingbot']

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/admin', '/img/']
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
