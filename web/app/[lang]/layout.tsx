import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
  // 언어가 아닌 첫 조각은 여기서 끊는다.
  //
  // [lang]은 한 칸짜리 경로를 전부 삼킨다. 그래서 /privacy 같은 없는 주소가 lang="privacy"로
  // 잡혔고, 아래 폴백이 그걸 조용히 한국어로 바꿔 홈 화면을 200으로 돌려주고 있었다.
  // 검색엔진에는 같은 홈이 무한한 주소로 존재하는 셈이고, 사람에게는 오타가 오타로 안 보인다.
  if (!isLang(lang)) notFound()
  const l: Lang = lang
  return (
    <html lang={HTML_LANG[l]}>
      <body className="bg-paper text-ink antialiased">{children}</body>
    </html>
  )
}
