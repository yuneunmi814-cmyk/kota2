'use client'

import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/i18n'
import { scrollToTop, shouldShowBackToTop } from '@/lib/back-to-top'
import { t } from '@/lib/ui'

/** A page-wide return control, kept in the language layout so long detail pages get it too. */
export default function BackToTop({ lang }: { lang: Lang }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(shouldShowBackToTop(window.scrollY))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  const returnToStart = () => {
    scrollToTop(window)
    requestAnimationFrame(() => document.getElementById('page-start')?.focus({ preventScroll: true }))
  }

  return (
    visible && <button
      type="button"
      onClick={returnToStart}
      className="fixed bottom-[max(2.75rem,calc(env(safe-area-inset-bottom)+1rem))] right-[max(1rem,env(safe-area-inset-right))] z-40 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface/95 px-3 text-sm font-bold text-brand shadow-[0_6px_20px_-8px_rgba(79,50,22,.5)] backdrop-blur transition hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      aria-label={t(lang, 'list.toTop')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <span>{t(lang, 'list.toTop')}</span>
    </button>
  )
}
