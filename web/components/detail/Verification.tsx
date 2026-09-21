import { officialVerification, syncDate } from '@/lib/verification'
import type { Festival } from '@/lib/festivals'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'

export default function Verification({ f, lang }: { f: Festival; lang: Lang }) {
  const checks = officialVerification(f)
  const synced = syncDate(f.syncedAt)
  return <div className="mb-5 space-y-1 text-[12px] leading-relaxed text-muted" aria-label={t(lang, 'verification.title')}>
    {checks.length ? checks.map(check => <p key={check.scope}><a href={check.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{t(lang, `verification.${check.scope}`, { d: check.date })}</a></p>) : <p>{t(lang, 'verification.unknown')}</p>}
    {synced && <p>{t(lang, 'detail.checked', { d: synced })}</p>}
  </div>
}
