'use client'
import type { Lang } from '@/lib/i18n'

// 화이트 ↔ 네이비 전환.
//
// 기본값은 서버가 언어로 정해 <html data-theme>에 적어 보낸다(태국어=네이비). 여기서는 그 값을
// 뒤집고 localStorage에 남길 뿐이다. 저장된 선택은 layout의 인라인 스크립트가 첫 칠 전에 읽어
// 적용한다 — 여기서 읽으면 화면이 한 번 깜빡인다.
//
// 상태를 React에 두지 않는다. 아이콘 두 개를 다 그려 놓고 CSS가 data-theme를 보고 하나만 보여 준다.
// 그래야 서버가 그린 HTML과 브라우저의 첫 화면이 어긋나지 않는다.

const LABEL: Record<Lang, string> = {
  ko: '화면 색 바꾸기 (화이트 / 네이비)',
  en: 'Switch colour theme (white / navy)',
  ja: '画面の色を切り替える(ホワイト/ネイビー)',
  th: 'สลับโทนสีหน้าจอ (ขาว / กรมท่า)',
}

export const THEME_KEY = 'kota-theme'

export default function ThemeToggle({ lang }: { lang: Lang }) {
  const flip = () => {
    const root = document.documentElement
    const next = root.dataset.theme === 'navy' ? 'white' : 'navy'
    root.dataset.theme = next
    try { localStorage.setItem(THEME_KEY, next) } catch { /* 사생활 보호 모드 — 이번 화면에서만 바뀐다 */ }
  }
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={LABEL[lang]}
      title={LABEL[lang]}
      className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-brand"
    >
      <svg viewBox="0 0 24 24" className="theme-icon-moon h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
      </svg>
      <svg viewBox="0 0 24 24" className="theme-icon-sun h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
      </svg>
    </button>
  )
}
