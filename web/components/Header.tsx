import Link from 'next/link'
import { Suspense } from 'react'
import { LANGS, LANG_NAME, type Lang } from '@/lib/i18n'
import Icon from './Icon'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeToggle from './ThemeToggle'

// 헤더 — 언어 전환이 <a>로 되어 있는 것이 핵심이다.
//
// 이전 구현은 localStorage를 바꾸는 버튼이었다. 그러면 URL이 그대로라 검색엔진이
// 다른 언어판의 존재를 모르고, 사용자가 일본어 링크를 공유해도 상대는 한국어로 연다.
// 여기서는 같은 페이지의 다른 언어 URL로 이동하는 진짜 링크다.

export default function Header({ lang, path = '' }: { lang: Lang; path?: string }) {
  const clean = path.replace(/^\/+|\/+$/g, '')
  const calendarLabel =
    lang === 'ko' ? '축제 달력' : lang === 'ja' ? '祭りカレンダー' : lang === 'th' ? 'ปฏิทิน' : 'Calendar'
  // 전체 목록 — 헤더에 입구가 없었다(BUG-02, 2026-08-23).
  //
  // 홈에서 목록으로 가는 길은 '지역으로 찾기' 섹션 제목이 통째로 링크인 것과, 검색창을
  // 빈 채로 눌러 얻어걸리는 것 둘뿐이었다. 앞은 링크로 안 보이고 뒤는 우연이라, 둘 다
  // 입구라고 부를 수 없다. 달력 옆이 자리다 — 달력과 목록은 같은 데이터의 두 가지 보기다.
  const allLabel =
    lang === 'ko' ? '축제 전체' : lang === 'ja' ? '祭り一覧' : lang === 'th' ? 'เทศกาลทั้งหมด' : 'All festivals'
  return (
    <>
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-1 px-3 sm:px-5">
        {/* 로고 — 「KOTA Korea Festa」. 태극 O와 오방색 엠블럼이 '한국 축제'를 첫눈에 말한다.
            테마마다 'Korea Festa' 글자색이 다른 판을 쓴다: 둘 다 그려 두고 CSS가 하나만 보여 준다
            (서버가 그린 HTML과 첫 화면이 어긋나지 않게). 폭·높이를 적어 자리 밀림을 막는다. */}
        <Link href={`/${lang}/`} className="flex shrink-0 items-center" aria-label="KOTA Korea Festa">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.webp" alt="KOTA Korea Festa" width={880} height={304} className="logo-light h-8 w-auto sm:h-11" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.webp" alt="" aria-hidden="true" width={880} height={304} className="logo-dark h-8 w-auto sm:h-11" />
        </Link>

        <nav className="flex shrink-0 items-center gap-0 sm:gap-1">
          {/* 축제 전체 — 달력과 같은 규칙으로 좁은 화면에서는 아이콘만 남긴다 */}
          <Link
            href={`/${lang}/festivals/`}
            aria-label={allLabel}
            className="flex items-center gap-1.5 rounded-full px-2 py-2 sm:px-3 text-[14px] font-bold text-muted transition hover:bg-paper-2 hover:text-brand"
          >
            <Icon name="search" size={16} />
            <span className="hidden sm:inline">{allLabel}</span>
          </Link>

          {/* 달력 — 모바일에서는 아이콘만 남긴다.
              전에는 아예 hidden이라 좁은 화면에서 달력에 갈 방법이 없었다(BUG-25).
              햄버거를 새로 만드는 것보다 아이콘 하나를 남기는 편이 눌리는 곳도 늘지 않고
              데스크톱 배치도 그대로다. 글자만 sm 이상에서 붙는다.
              aria-label을 두는 것은 모바일에서 글자가 사라지면 화면낭독기에 이름이
              남지 않기 때문이다. */}
          <Link
            href={`/${lang}/calendar/`}
            aria-label={calendarLabel}
            className="flex items-center gap-1.5 rounded-full px-2 py-2 sm:px-3 text-[14px] font-bold text-muted transition hover:bg-paper-2 hover:text-brand"
          >
            <Icon name="calendar" size={16} />
            <span className="hidden sm:inline">{calendarLabel}</span>
          </Link>

          <ThemeToggle lang={lang} />

          {/* 언어 — 링크라서 크롤러가 4개 언어판을 모두 따라갈 수 있다 */}
          {/* Native disclosure works on touch/Safari and before hydration;
              do not rely on hover or button focus to reveal the links. */}
          <details className="relative shrink-0">
            <summary
              className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full px-2 py-2 sm:px-3 text-[14px] font-bold text-muted transition hover:bg-paper-2 hover:text-brand [&::-webkit-details-marker]:hidden"
            >
              <Icon name="globe" size={16} />
              {LANG_NAME[lang]}
            </summary>
            <ul className="absolute right-0 top-full w-36 rounded-2xl border border-line bg-surface py-1.5 shadow-lg">
              <Suspense fallback={LANGS.map((l) => (
                <li key={l}>
                  <Link
                    href={`/${l}/${clean ? `${clean}/` : ''}`}
                    hrefLang={l}
                    className={`flex min-h-11 items-center px-4 py-2 text-[14px] transition hover:bg-paper-2 ${
                      l === lang ? 'font-bold text-brand' : 'text-muted'
                    }`}
                  >
                    {LANG_NAME[l]}
                  </Link>
                </li>
              ))}>
                <LanguageSwitcher lang={lang} />
              </Suspense>
            </ul>
          </details>
        </nav>
      </div>
    </header>
    {/* 홈(path 없음)은 히어로가 문양을 쓰므로 띠를 두지 않는다 */}
    {clean !== '' && <div aria-hidden className="pattern-changsal-band border-b border-line" />}
    </>
  )
}
