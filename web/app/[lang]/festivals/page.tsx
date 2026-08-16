import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { listItems } from '@/lib/listData'
import { t } from '@/lib/ui'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FestivalListFromQuery from '@/components/FestivalListFromQuery'
import FestivalListFallback from '@/components/FestivalListFallback'

// 축제 목록 — 4개 언어판을 각각 정적 생성한다.
// 필터·정렬은 클라이언트에서 돌고, 초기값(?sort=, ?theme=, ?q=)은 URL에서 읽는다.

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const n = listItems(l).filter((f) => f.st !== 'ended').length
  const title = l === 'ko' ? '전국 축제 목록' : l === 'ja' ? '韓国の祭り一覧' : l === 'th' ? 'รายชื่อเทศกาลทั่วเกาหลี' : 'All festivals in Korea'
  return {
    title: `${title} · KOTA`,
    description: t(l, 'list.total', { n }),
    alternates: {
      canonical: `${SITE_URL}/${l}/festivals/`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/festivals/`])),
    },
  }
}

export default async function FestivalsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const items = listItems(l)

  return (
    <>
      <Header lang={l} path="festivals" />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <h1 className="h-display mb-8 text-[30px] text-brand sm:text-[36px]">
          {l === 'ko' ? '전국 축제' : l === 'ja' ? '韓国の祭り' : l === 'th' ? 'เทศกาลทั่วเกาหลี' : 'Festivals in Korea'}
        </h1>
        {/* useSearchParams는 정적 내보내기에서 Suspense 경계가 필요하다.
            fallback이 null이면 빌드된 HTML에 카드가 0장이라 SEO와 첫 페인트를 다 잃는다 —
            첫 24장을 서버에서 같은 순서로 그려 둔다. */}
        <Suspense fallback={<FestivalListFallback items={items} lang={l} />}>
          <FestivalListFromQuery items={items} lang={l} />
        </Suspense>
      </main>
      <Footer lang={l} />
    </>
  )
}
