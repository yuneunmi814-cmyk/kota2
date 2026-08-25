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
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        {/* 축포 — 꼬깔에서 조각이 터져 나오는 표식.
            글자만 있던 자리에 마크를 더한다. 이모지(🎉)를 쓰지 않는 이유는 기기·OS마다
            다르게 그려져 로고 구실을 못 하기 때문이다. 인라인 SVG라 어디서나 같게 보인다. */}
        <Link href={`/${lang}/`} className="flex items-center gap-2 text-[21px] font-black tracking-tight text-brand">
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" aria-hidden="true">
            <path d="M2.6 21.4 9.4 9.2a1.1 1.1 0 0 1 1.7-.25l3.9 3.9a1.1 1.1 0 0 1-.25 1.7L2.6 21.4z" fill="currentColor" />
            <circle cx="17.6" cy="6.4" r="2.5" fill="var(--color-signal)" />
            <rect x="12.6" y="1.2" width="2.6" height="4.4" rx="1.3" transform="rotate(-24 13.9 3.4)" fill="var(--color-signal)" />
            <rect x="19.8" y="9.4" width="4.4" height="2.6" rx="1.3" transform="rotate(-14 22 10.7)" fill="var(--color-signal)" />
            <rect x="19.6" y="1.6" width="2.6" height="4" rx="1.3" transform="rotate(38 20.9 3.6)" fill="var(--color-signal)" />
          </svg>
          KOTA
        </Link>

        <nav className="flex items-center gap-1">
          {/* 축제 전체 — 달력과 같은 규칙으로 좁은 화면에서는 아이콘만 남긴다 */}
          <Link
            href={`/${lang}/festivals/`}
            aria-label={allLabel}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-bold text-muted transition hover:bg-paper-2 hover:text-brand"
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
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] font-bold text-muted transition hover:bg-paper-2 hover:text-brand"
          >
            <Icon name="calendar" size={16} />
            <span className="hidden sm:inline">{calendarLabel}</span>
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
