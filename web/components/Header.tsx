import Link from 'next/link'
import { LANGS, LANG_NAME, type Lang } from '@/lib/i18n'
import Icon from './Icon'

// 헤더 — 언어 전환이 <a>로 되어 있는 것이 핵심이다.
//
// 이전 구현은 localStorage를 바꾸는 버튼이었다. 그러면 URL이 그대로라 검색엔진이
// 다른 언어판의 존재를 모르고, 사용자가 일본어 링크를 공유해도 상대는 한국어로 연다.
// 여기서는 같은 페이지의 다른 언어 URL로 이동하는 진짜 링크다.

export default function Header({ lang, path = '' }: { lang: Lang; path?: string }) {
  const clean = path.replace(/^\/+|\/+$/g, '')
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href={`/${lang}/`} className="text-[21px] font-black tracking-tight text-brand">
          KOTA
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href={`/${lang}/calendar/`}
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-bold text-muted transition hover:bg-paper-2 hover:text-brand sm:flex"
          >
            <Icon name="calendar" size={16} />
            {lang === 'ko' ? '축제 달력' : lang === 'ja' ? '祭りカレンダー' : lang === 'th' ? 'ปฏิทิน' : 'Calendar'}
          </Link>

          {/* 언어 — 링크라서 크롤러가 4개 언어판을 모두 따라갈 수 있다 */}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-bold text-muted transition hover:bg-paper-2 hover:text-brand"
              aria-haspopup="true"
            >
              <Icon name="globe" size={16} />
              {LANG_NAME[lang]}
            </button>
            <ul className="invisible absolute right-0 top-full w-36 rounded-2xl border border-line bg-surface py-1.5 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {LANGS.map((l) => (
                <li key={l}>
                  <Link
                    href={`/${l}/${clean ? `${clean}/` : ''}`}
                    hrefLang={l}
                    className={`block px-4 py-2 text-[14px] transition hover:bg-paper-2 ${
                      l === lang ? 'font-bold text-brand' : 'text-muted'
                    }`}
                  >
                    {LANG_NAME[l]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </header>
  )
}
