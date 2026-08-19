import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LANGS, SITE_URL, isLang, type Lang } from '@/lib/i18n'
import { listItems } from '@/lib/listData'
import { THEMES, isTheme, themeDesc, themeLabel } from '@/lib/themes'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Icon from '@/components/Icon'
import FestivalList from '@/components/FestivalList'

// 1시간마다 다시 굽는다 — 축제 데이터는 주 1회만 바뀌므로 요청마다 DB를 볼 이유가 없다
export const revalidate = 3600

// 목적 테마 랜딩 — 6테마 × 4언어 = 24장.
// "가족과 갈 만한 축제" 같은 검색어의 착지점(SEO)이자, AI 검색이 목적별로 인용할 수 있는 URL(GEO).

export function generateStaticParams() {
  return LANGS.flatMap((lang) => THEMES.map((key) => ({ lang, key })))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; key: string }> }): Promise<Metadata> {
  const { lang, key } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  if (!isTheme(key)) return {}
  const n = (await listItems(l)).filter((f) => f.th.includes(key) && f.st !== 'ended').length
  return {
    title: `${themeLabel(key, l)} · KOTA`,
    description: `${themeDesc(key, l)} — ${n}`,
    alternates: {
      canonical: `${SITE_URL}/${l}/themes/${key}/`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/themes/${key}/`])),
    },
  }
}

export default async function ThemePage({ params }: { params: Promise<{ lang: string; key: string }> }) {
  const { lang, key } = await params
  const l: Lang = isLang(lang) ? lang : 'ko'
  if (!isTheme(key)) notFound()
  const items = (await listItems(l)).filter((f) => f.th.includes(key))

  return (
    <>
      <Header lang={l} path={`themes/${key}`} />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand">
            <Icon name={key} size={28} strokeWidth={1.6} />
          </span>
          <div>
            <h1 className="h-display text-[30px] text-brand sm:text-[36px]">{themeLabel(key, l)}</h1>
            <p className="mt-1 text-[15px] text-muted">{themeDesc(key, l)}</p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {THEMES.map((k) => (
            <Link
              key={k}
              href={`/${l}/themes/${k}/`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-bold transition ${
                k === key ? 'border-brand bg-brand text-white' : 'border-line text-muted hover:border-brand/40 hover:text-brand'
              }`}
            >
              <Icon name={k} size={14} /> {themeLabel(k, l)}
            </Link>
          ))}
        </div>
        <FestivalList items={items} lang={l} initialTheme={key} />
      </main>
      <Footer lang={l} />
    </>
  )
}
