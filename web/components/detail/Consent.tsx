import Link from 'next/link'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'

// 개인정보 수집 동의 체크박스.
//
// 후기와 제보가 같은 모양을 쓴다. 문구만 다르다.
//
// 체크를 미리 켜 두지 않는다. 「동의함」이 기본값인 체크박스는 동의가 아니다 —
// 이용자가 직접 누른 것만 동의로 친다.

export default function Consent({
  lang,
  checked,
  onChange,
  textKey,
}: {
  lang: Lang
  checked: boolean
  onChange: (v: boolean) => void
  textKey: 'consent.review' | 'consent.contact'
}) {
  return (
    <label className="mt-3 flex cursor-pointer items-start gap-2 text-[13px] leading-[1.6] text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--color-brand)]"
      />
      <span>
        {t(lang, textKey)}{' '}
        <Link
          href={`/${lang}/privacy/`}
          target="_blank"
          className="font-semibold text-brand underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          {t(lang, 'consent.more')}
        </Link>
      </span>
    </label>
  )
}
