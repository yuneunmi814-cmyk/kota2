'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { LANGS, LANG_NAME, type Lang } from '@/lib/i18n'
import { languageHref } from '@/lib/language-switch'

/** Only the language links need live URL state; the rest of Header stays server-rendered. */
export default function LanguageSwitcher({ lang }: { lang: Lang }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()

  return LANGS.map((nextLang) => (
    <li key={nextLang}>
      <a
        href={languageHref(nextLang, pathname, search)}
        hrefLang={nextLang}
        onClick={(event) => {
          // list-state writes with history.replaceState; read at activation too in case it
          // changed since this component's last render.
          event.currentTarget.href = languageHref(nextLang, window.location.pathname, window.location.search + window.location.hash)
        }}
        className={`flex min-h-11 items-center px-4 py-2 text-[14px] transition hover:bg-paper-2 ${
          nextLang === lang ? 'font-bold text-brand' : 'text-muted'
        }`}
      >
        {LANG_NAME[nextLang]}
      </a>
    </li>
  ))
}
