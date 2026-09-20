import Script from 'next/script'

// Google Analytics 4 — 측정 ID가 있을 때만 붙는다.
//
// Vercel 환경변수 NEXT_PUBLIC_GA_ID(G-로 시작)를 넣고 다시 배포하면 켜지고, 비우면 꺼진다.
// 켜는 순간 개인정보처리방침에도 해당 항목이 같이 나타난다(lib/legal.ts의 legalDoc) —
// 받는 정보와 방침이 어긋나지 않게 스위치를 하나로 묶었다.
//
// 광고용 신호는 끈다. 우리는 '어떤 화면이 쓰이는지'만 보면 되고, 방문자를 광고 대상으로
// 묶을 이유가 없다. IP는 GA4가 저장하지 않는다(기본 동작).
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim() || ''

export default function Analytics() {
  if (!/^G-[A-Z0-9]+$/.test(GA_ID)) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
      </Script>
    </>
  )
}
