import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'

export default function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl space-y-2 px-5 py-10 text-[13px] text-hint">
        <p>{t(lang, 'foot.disclaimer')}</p>
        <p>{t(lang, 'foot.source')} · © 2026 KOTA</p>
      </div>
    </footer>
  )
}
