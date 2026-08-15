import type { Metadata } from 'next'
import Link from 'next/link'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { listItems } from '@/lib/listData'
import { monthLabel } from '@/lib/sido'
import { t } from '@/lib/ui'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Poster from '@/components/Poster'

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

const fmt = (d: string) => d.slice(5).replace('-', '.')

export default async function CalendarPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  const items = listItems(l).filter((f) => f.st !== 'ended' && !f.al)

  // 시작 월 기준으로 묶는다. 이번 달부터 12개월을 돈다.
  const now = new Date()
  const months: { y: number; m: number }[] = []
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push({ y: d.getFullYear(), m: d.getMonth() + 1 })
  }
  const byMonth = months.map(({ y, m }) => ({
    y,
    m,
    list: items
      .filter((f) => f.s.startsWith(`${y}-${String(m).padStart(2, '0')}`))
      .sort((a, b) => a.s.localeCompare(b.s)),
  }))

  return (
    <>
      <Header lang={l} path="calendar" />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <h1 className="h-display mb-2 text-[30px] text-brand sm:text-[36px]">
          {l === 'ko' ? '축제 달력' : l === 'ja' ? '祭りカレンダー' : l === 'th' ? 'ปฏิทินเทศกาล' : 'Festival calendar'}
        </h1>
        <p className="mb-8 text-[15px] text-muted">{t(l, 'month.title')}</p>

        {/* 월 점프 */}
        <nav className="-mx-5 mb-10 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {byMonth.map(({ y, m, list }) => (
            <a
              key={`${y}-${m}`}
              href={`#m-${y}-${m}`}
              className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition ${
                list.length ? 'border-line text-muted hover:border-brand/40 hover:text-brand' : 'border-line/50 text-hint/60'
              }`}
            >
              {monthLabel(m, l)} <span className="ml-1 font-normal opacity-60">{list.length}</span>
            </a>
          ))}
        </nav>

        {byMonth.map(({ y, m, list }) =>
          list.length === 0 ? null : (
            <section key={`${y}-${m}`} id={`m-${y}-${m}`} className="mb-14 scroll-mt-24">
              <h2 className="h-display mb-5 flex items-baseline gap-3 text-[24px] text-ink">
                {monthLabel(m, l)}
                <span className="text-[14px] font-bold text-hint">{y} · {list.length}</span>
              </h2>
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
                {list.map((f) => (
                  <li key={f.k}>
                    <Link
                      href={`/${l}/festivals/${f.k}/`}
                      className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface"
                    >
                      <span className="w-14 shrink-0 text-[13px] font-bold tabular-nums text-brand">{fmt(f.s)}</span>
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                        <Poster src={f.img} name={f.n} letterClass="text-[1.3em]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-ink">{f.n}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {f.p}{f.s !== f.e ? ` · ~${fmt(f.e)}` : ''}
                        </span>
                      </span>
                      {f.st === 'ongoing' && (
                        <span className="shrink-0 sticker rounded-full bg-y px-2.5 py-1 text-[11px] font-black text-on-y">
                          {t(l, 'status.ongoing')}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
      </main>
      <Footer lang={l} />
    </>
  )
}
