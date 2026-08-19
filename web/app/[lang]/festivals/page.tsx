import type { Metadata } from 'next'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { listItems } from '@/lib/listData'
import { t } from '@/lib/ui'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import FestivalList from '@/components/FestivalList'

// 1시간마다 다시 굽는다 — 축제 데이터는 주 1회만 바뀌므로 요청마다 DB를 볼 이유가 없다
export const revalidate = 3600

// 축제 목록 — 4개 언어판을 각각 정적 생성한다.
// 필터·정렬은 클라이언트에서 돌고, 초기값(?sort=, ?theme=, ?q=)은 URL에서 읽는다.

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const n = (await listItems(l)).filter((f) => f.st !== 'ended').length
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
  const items = await listItems(l)

  return (
    <>
      <Header lang={l} path="festivals" />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <h1 className="h-display mb-8 text-[30px] text-brand sm:text-[36px]">
          {l === 'ko' ? '전국 축제' : l === 'ja' ? '韓国の祭り' : l === 'th' ? 'เทศกาลทั่วเกาหลี' : 'Festivals in Korea'}
        </h1>
        {/* Suspense를 걷어냈다.
            경계가 있던 이유는 FestivalListFromQuery가 useSearchParams를 썼기 때문인데,
            그 훅이 정적 페이지에서 하이드레이션을 막아 칩이 그려지고도 아무 반응이 없었다.
            이제 FestivalList가 마운트 뒤에 window.location을 직접 읽으므로 훅도 경계도
            필요 없다. 서버는 기본 상태(첫 24장)를 그대로 그려 주니 검색엔진에도 그대로 보인다. */}
        <FestivalList items={items} lang={l} />
      </main>
      <Footer lang={l} />
    </>
  )
}
