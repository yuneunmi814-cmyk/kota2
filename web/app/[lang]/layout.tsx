import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Gaegu } from 'next/font/google'
import { HTML_LANG, LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import '../globals.css'

// 언어별 레이아웃 — 여기서 <html lang>과 hreflang이 정해진다.
//
// hreflang을 붙이는 이유: 같은 축제의 4개 언어판이 서로 '번역본'임을 검색엔진에
// 알려야 각 언어권 검색에서 맞는 판이 노출된다. 이게 없으면 중복 콘텐츠로 취급되거나
// 한 벌만 색인된다 — 이전 구현이 정확히 그 상태였다.

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

// 손글씨 — 히어로 라틴 헤드라인 한 줄에만 쓴다(짱구 로고의 '크레용으로 쓴 손글씨' 문법).
// 한·일·태 문자는 손글씨 폰트 품질이 낮아 표준 산세리프를 유지한다.
const hand = Gaegu({ weight: '700', subsets: ['latin'], variable: '--font-hand', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
}

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  return (
    <html lang={HTML_LANG[l]} className={hand.variable}>
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  )
}
