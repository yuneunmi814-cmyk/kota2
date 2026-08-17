'use client'
import { useEffect, useState } from 'react'
import type { Review } from '@/lib/reviews'
import { browserSupabase } from '@/lib/supabase-browser'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import Icon from '../Icon'
import SocialLogin from '../SocialLogin'

// 축제 리뷰 — 읽기는 서버가 미리 그려 넘기고, 쓰기와 로그인만 여기서 한다.
//
// 승인제다. 쓴 사람에게는 "검토 후 공개된다"고 그 자리에서 밝힌다 — 썼는데 화면에 안 보이면
// 버그로 오해하고 두 번, 세 번 쓴다. 검토를 두는 이유는 심사 기간에 악성 글 하나가
// 그대로 심사 화면이 되는 것을 막기 위해서다.
//
// 로그인은 카카오·구글·이메일 셋이다. 소셜 제공자는 Supabase에서 켠 것만 버튼이 뜬다 —
// 눌리는데 안 되는 버튼은 없느니만 못하다.

const STARS = [1, 2, 3, 4, 5]

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n}점`}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'} text-[18px] leading-none transition ${
            n <= value ? 'text-brand-deep' : 'text-line'
          }`}
        >
          ★
        </button>
      ))}
    </span>
  )
}

export default function Reviews({
  festivalId,
  lang,
  initial,
}: {
  festivalId: string
  lang: Lang
  initial: Review[]
}) {
  const [email, setEmail] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'submitted'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loginEmail, setLoginEmail] = useState('')

  useEffect(() => {
    const sb = browserSupabase()
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError(null)
    const { error } = await browserSupabase().auth.signInWithOtp({
      email: loginEmail,
      options: { emailRedirectTo: window.location.href },
    })
    if (error) {
      setError(error.message)
      setState('idle')
    } else setState('sent')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (rating === 0) return setError(t(lang, 'review.needRating'))
    if (body.trim().length < 10) return setError(t(lang, 'review.needBody'))
    setState('sending')
    const sb = browserSupabase()
    const { data: u } = await sb.auth.getUser()
    if (!u.user) {
      setState('idle')
      return setError(t(lang, 'review.needLogin'))
    }
    // 표시 이름이 없으면 만들어 둔다 — 리뷰에 '여행자'로만 뜨면 누가 썼는지 구분이 안 된다
    await sb.from('profiles').upsert({
      id: u.user.id,
      display_name: (u.user.email ?? '').split('@')[0] || '여행자',
    })
    const { error } = await sb.from('reviews').upsert(
      { festival_id: festivalId, user_id: u.user.id, rating, body: body.trim() },
      { onConflict: 'festival_id,user_id' },
    )
    if (error) {
      setError(error.message)
      setState('idle')
    } else {
      setState('submitted')
      setBody('')
      setRating(0)
    }
  }

  const fmt = (d: string) => d.slice(0, 10).replace(/-/g, '.')

  return (
    <section id="reviews" className="scroll-mt-24">
      <h2 className="mb-1 text-[20px] font-bold text-ink">{t(lang, 'review.title')}</h2>
      <p className="mb-5 text-[13px] text-hint">{t(lang, 'review.moderated')}</p>

      {/* 쓰기 */}
      {state === 'submitted' ? (
        <p className="mb-8 rounded-[var(--radius-card)] bg-brand-50 px-4 py-3 text-[14px] font-semibold text-brand-deep">
          {t(lang, 'review.thanks')}
        </p>
      ) : email ? (
        <form onSubmit={submit} className="mb-8 rounded-[var(--radius-card)] border border-line p-4">
          <div className="mb-3 flex items-center gap-3">
            <Stars value={rating} onChange={setRating} />
            <span className="truncate text-[12px] text-hint">{email}</span>
            {/* 누구로 쓰고 있는지 보여줬으면 빠져나갈 문도 있어야 한다 — 가족·지인과 기기를 같이 쓰는 경우가 흔하다 */}
            <button
              type="button"
              onClick={() => browserSupabase().auth.signOut()}
              className="ml-auto shrink-0 text-[12px] font-semibold text-hint underline underline-offset-2 hover:text-ink"
            >
              {t(lang, 'review.signOut')}
            </button>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder={t(lang, 'review.placeholder')}
            className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-[15px] outline-none placeholder:text-hint focus:border-brand"
          />
          {error && <p className="mt-2 text-[13px] font-semibold text-r">{error}</p>}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={state === 'sending'}
              className="rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-brand-ink transition hover:bg-brand-600 disabled:opacity-50"
            >
              {t(lang, 'review.submit')}
            </button>
          </div>
        </form>
      ) : state === 'sent' ? (
        <p className="mb-8 rounded-[var(--radius-card)] bg-brand-50 px-4 py-3 text-[14px] text-brand-deep">
          {t(lang, 'review.linkSent')}
        </p>
      ) : (
        <form onSubmit={sendLink} className="mb-8 rounded-[var(--radius-card)] border border-line p-4">
          <p className="mb-3 text-[14px] font-semibold text-ink">{t(lang, 'review.loginTitle')}</p>
          <SocialLogin lang={lang} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2.5 text-[15px] outline-none placeholder:text-hint focus:border-brand"
            />
            <button
              type="submit"
              disabled={state === 'sending'}
              className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-brand-ink transition hover:bg-brand-600 disabled:opacity-50"
            >
              {t(lang, 'review.sendLink')}
            </button>
          </div>
          {error && <p className="mt-2 text-[13px] font-semibold text-r">{error}</p>}
          <p className="mt-2 text-[12px] text-hint">{t(lang, 'review.loginNote')}</p>
        </form>
      )}

      {/* 읽기 */}
      {initial.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line px-5 py-10 text-center text-[14px] text-muted">
          {t(lang, 'review.empty')}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {initial.map((r) => (
            <li key={r.id} className="py-5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Stars value={r.rating} />
                <span className="text-[13px] font-bold text-ink">{r.author}</span>
                <span className="text-[12px] text-hint">{fmt(r.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{r.body}</p>
              {r.helpful > 0 && (
                <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-hint">
                  <Icon name="heart" size={13} /> {t(lang, 'review.helpful', { n: r.helpful })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
