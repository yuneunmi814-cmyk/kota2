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

// 공유 카드에 쓰는 문구 — 카카오톡·검색·SNS에서 링크 아래 붙는 줄이다.
const SHARE: Record<Lang, { title: string; desc: string }> = {
  ko: { title: 'KOTA — 전국 축제를 날짜와 위치로', desc: '지금 내 주변에서 열리는 축제까지. 한국어·영어·일본어·태국어로 봅니다.' },
  en: { title: 'KOTA — Find Korean festivals by date and place', desc: 'Including what is on near you right now. Available in Korean, English, Japanese and Thai.' },
  ja: { title: 'KOTA — 韓国のお祭りを日付と場所で', desc: '今いる場所の近くで開催中のお祭りも。韓国語・英語・日本語・タイ語で見られます。' },
  th: { title: 'KOTA — ค้นหาเทศกาลเกาหลีตามวันที่และสถานที่', desc: 'รวมถึงเทศกาลที่กำลังจัดใกล้คุณตอนนี้ รองรับภาษาเกาหลี อังกฤษ ญี่ปุ่น และไทย' },
}

// 공유 카드와 파비콘.
//
// 왜 필요한가: 축제는 "같이 갈래?"로 퍼지는 물건이라 카카오톡 공유가 유입의 큰 몫이다.
// 그런데 og:image가 없어서 지금까지 공유하면 회색 빈칸에 제목만 나갔다. 8/18에 공유가
// 막히는 문제로 주소의 콜론까지 하이픈으로 바꿨는데, 정작 카드 그림이 비어 있었다.
//
// 파비콘도 Next.js 기본 아이콘이 그대로 남아 있어 탭·북마크에 남의 로고가 붙었다.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const s = SHARE[l]
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.title, template: '%s · KOTA' },
    description: s.desc,
    icons: {
      icon: [
        { url: '/icon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: '32x32' },
      ],
      apple: '/apple-icon.png',
    },
    openGraph: {
      type: 'website',
      siteName: 'KOTA',
      locale: HTML_LANG[l].replace('-', '_'),
      title: s.title,
      description: s.desc,
      url: `${SITE_URL}/${l}/`,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: 'KOTA' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: s.title,
      description: s.desc,
      images: ['/og.png'],
    },
  }
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
