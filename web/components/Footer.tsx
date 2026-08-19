import Link from 'next/link'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import { legalDoc, LEGAL_KINDS } from '@/lib/legal'

export default function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="border-t border-line bg-paper-2/60">
      <div className="mx-auto max-w-6xl space-y-3 px-5 py-10 text-[13px] text-hint">
        {/* 법적고지는 모든 화면에서 두 번 안에 닿아야 한다 — 푸터가 그 자리다 */}
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_KINDS.map((k) => (
            <Link key={k} href={`/${lang}/${k}/`} className="font-semibold text-muted underline underline-offset-4 hover:text-ink">
              {legalDoc(lang, k).title}
            </Link>
          ))}
        </nav>
        <p>{t(lang, 'foot.disclaimer')}</p>
        <p>{t(lang, 'foot.source')} · © 2026 KOTA</p>
      </div>
    </footer>
  )
}
