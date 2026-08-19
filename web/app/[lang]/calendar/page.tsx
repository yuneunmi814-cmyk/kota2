import type { Metadata } from 'next'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { listItems } from '@/lib/listData'
import { t } from '@/lib/ui'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MonthCalendar from '@/components/MonthCalendar'

// 1시간마다 다시 굽는다 — 축제 데이터는 주 1회만 바뀌므로 요청마다 DB를 볼 이유가 없다
export const revalidate = 3600

// 축제 달력 — 월별로 시작하는 축제를 한눈에.
//
// kfes에 있고 우리에 없던 뷰다. 목록의 월 필터와 겹치지만 쓰임이 다르다 —
// 목록은 '이번 달 뭐 있지', 달력은 '올해 언제쯤 갈까'를 훑는 화면이다.
// 상시 행사(1년 이상)는 뺀다. 매달 나오면 달력이 아니다.

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const title = l === 'ko' ? '축제 달력' : l === 'ja' ? '祭りカレンダー' : l === 'th' ? 'ปฏิทินเทศกาล' : 'Festival calendar'
  return {
    title: `${title} · KOTA`,
    alternates: {
      canonical: `${SITE_URL}/${l}/calendar/`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/calendar/`])),
    },
  }
}

export default async function CalendarPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const items = (await listItems(l)).filter((f) => f.st !== 'ended' && !f.al)

  // 오늘은 서버가 정해 넘긴다. 클라이언트 시계로 잡으면 첫 렌더가 서버와 어긋난다.
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return (
    <>
      <Header lang={l} path="calendar" />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-10">
        <h1 className="h-display mb-2 text-[30px] text-brand sm:text-[36px]">
          {l === 'ko' ? '축제 달력' : l === 'ja' ? '祭りカレンダー' : l === 'th' ? 'ปฏิทินเทศกาล' : 'Festival calendar'}
        </h1>
        <p className="mb-8 text-[15px] text-muted">{t(l, 'month.title')}</p>

        <MonthCalendar items={items} lang={l} today={today} />
      </main>
      <Footer lang={l} />
    </>
  )
}
