'use client'
import { useState } from 'react'
import { browserSupabase } from '@/lib/supabase-browser'
import { track } from '@/lib/track'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'

// 정보가 틀렸다고 알리는 창구.
//
// 로그인을 요구하지 않는다. "날짜가 틀렸어요" 한 줄 남기려고 가입해야 한다면 아무도 안 남긴다.
// 유형을 고르게 하는 이유는 처리 때문이다 — 자유 서술만 받으면 분류에 사람이 붙는다.
//
// 눈에 띄지 않는 자리에 조용히 둔다. 페이지에서 가장 먼저 보여야 할 것은 축제이지
// "이 정보가 틀렸을 수도 있다"는 고백이 아니다. 다만 필요한 사람은 반드시 찾을 수 있어야 한다.

const KINDS = ['dates', 'place', 'canceled', 'photo', 'link', 'other'] as const

export default function ReportError({ festivalId, lang }: { festivalId: string; lang: Lang }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<(typeof KINDS)[number]>('dates')
  const [body, setBody] = useState('')
  const [contact, setContact] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (body.trim().length < 2) return setError(t(lang, 'report.needBody'))
    setState('sending')
    setError(null)
    let visitor: string | null = null
    try {
      visitor = localStorage.getItem('kota_visitor')
    } catch {
      /* 저장소가 막힌 브라우저 */
    }
    const { error } = await browserSupabase().from('corrections').insert({
      festival_id: festivalId,
      kind,
      body: body.trim(),
      contact: contact.trim() || null,
      visitor,
      lang,
    })
    if (error) {
      setError(error.message)
      setState('idle')
      return
    }
    track('click', { festivalId, payload: { what: 'report', kind }, lang })
    setState('done')
  }

  if (state === 'done') {
    return (
      <p className="mt-10 rounded-[var(--radius-card)] bg-brand-50 px-4 py-3 text-[14px] font-semibold text-brand-deep">
        {t(lang, 'report.thanks')}
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-10 text-[13px] font-semibold text-hint underline underline-offset-4 hover:text-ink"
      >
        {t(lang, 'report.open')}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-10 rounded-[var(--radius-card)] border border-line p-4">
      <p className="mb-1 text-[15px] font-bold text-ink">{t(lang, 'report.title')}</p>
      <p className="mb-4 text-[13px] text-hint">{t(lang, 'report.note')}</p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition ${
              kind === k ? 'bg-brand text-white' : 'bg-paper-2 text-muted hover:text-ink'
            }`}
          >
            {t(lang, `report.kind.${k}`)}
          </button>
        ))}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={t(lang, 'report.placeholder')}
        className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-[15px] outline-none placeholder:text-hint focus:border-brand"
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder={t(lang, 'report.contact')}
        className="mt-2 w-full rounded-xl border border-line bg-surface p-3 text-[14px] outline-none placeholder:text-hint focus:border-brand"
      />
      {error && <p className="mt-2 text-[13px] font-semibold text-r">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-[14px] font-bold text-muted hover:text-ink">
          {t(lang, 'report.cancel')}
        </button>
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {t(lang, 'report.submit')}
        </button>
      </div>
    </form>
  )
}
