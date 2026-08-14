import type { Metadata } from 'next'
import type { ReactNode } from 'react'
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
    <html lang={HTML_LANG[l]}>
      <body className="bg-white text-ink antialiased">{children}</body>
    </html>
  )
}
