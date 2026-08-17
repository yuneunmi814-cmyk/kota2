'use client'
import { useCallback, useEffect, useState } from 'react'
import { browserSupabase } from '@/lib/supabase-browser'
import SocialLogin from '../SocialLogin'
import { toSlug } from '@/lib/slug'

// 관리자 보드 — 배너 큐레이션과 리뷰 검토.
//
// 접근 통제는 이 화면이 하지 않는다. 관리자가 아니면 DB가 조회를 막고(RLS is_admin),
// 화면은 그 결과로 빈 목록을 받을 뿐이다. 화면에서만 막는 방식은 브라우저 도구를 열 줄
// 아는 사람에게 아무 방어가 못 된다.

interface Promo {
  id: number
  festival_id: string
  ord: number
  starts_on: string | null
  ends_on: string | null
  active: boolean
  sponsored: boolean
  note: string | null
}
interface Row {
  id: string
  name: string
  start_date: string
  end_date: string
  image_url: string | null
}
interface Correction {
  id: number
  festival_id: string
  kind: string
  body: string
  contact: string | null
  status: string
  created_at: string
}
interface Review {
  id: number
  festival_id: string
  rating: number
  body: string
  status: string
  created_at: string
}

export default function AdminBoard() {
  const sb = browserSupabase()
  const [email, setEmail] = useState<string | null>(null)
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [sent, setSent] = useState(false)

  const [promos, setPromos] = useState<Promo[]>([])
  const [names, setNames] = useState<Record<string, Row>>({})
  const [reviews, setReviews] = useState<Review[]>([])
  const [fixes, setFixes] = useState<Correction[]>([])
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Row[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  // ── 로그인 상태 ──
  useEffect(() => {
    sb.auth.getUser().then(async ({ data }) => {
      setEmail(data.user?.email ?? null)
      if (!data.user) return setAdmin(false)
      const { data: p } = await sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
      setAdmin((p as { role?: string } | null)?.role === 'admin')
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null))
    return () => sub.subscription.unsubscribe()
  }, [sb])

  const load = useCallback(async () => {
    const { data: pr } = await sb.from('promos').select('*').order('ord')
    const list = (pr ?? []) as unknown as Promo[]
    setPromos(list)
    const { data: rv } = await sb
      .from('reviews')
      .select('id, festival_id, rating, body, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setReviews((rv ?? []) as unknown as Review[])

    const { data: cx } = await sb
      .from('corrections')
      .select('id, festival_id, kind, body, contact, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    const fixList = (cx ?? []) as unknown as Correction[]
    setFixes(fixList)

    // 배너·리뷰·신고에 걸린 축제 이름을 한 번에 채운다
    const ids = [...new Set([...list.map((p) => p.festival_id), ...((rv ?? []) as unknown as Review[]).map((r) => r.festival_id), ...fixList.map((c) => c.festival_id)])]
    if (ids.length) {
      const { data: fs } = await sb.from('festivals').select('id, name, start_date, end_date, image_url').in('id', ids)
      setNames(Object.fromEntries(((fs ?? []) as unknown as Row[]).map((f) => [f.id, f])))
    }
  }, [sb])

  useEffect(() => {
    if (admin) void load()
  }, [admin, load])

  // ── 축제 검색 ──
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) return setFound([])
    const id = setTimeout(async () => {
      const { data } = await sb
        .from('festivals')
        .select('id, name, start_date, end_date, image_url')
        .ilike('name', `%${needle}%`)
        .gte('end_date', new Date().toISOString().slice(0, 10))
        .order('popularity', { ascending: false })
        .limit(8)
      setFound((data ?? []) as unknown as Row[])
    }, 350)
    return () => clearTimeout(id)
  }, [q, sb])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 2500)
  }

  async function addPromo(f: Row) {
    const { error } = await sb.from('promos').insert({ festival_id: f.id, ord: promos.length })
    if (error) return flash(`실패: ${error.message}`)
    setQ('')
    setFound([])
    flash(`${f.name} 추가됨`)
    void load()
  }
  async function patch(id: number, v: Partial<Promo>) {
    const { error } = await sb.from('promos').update(v).eq('id', id)
    if (error) return flash(`실패: ${error.message}`)
    void load()
  }
  async function remove(id: number) {
    const { error } = await sb.from('promos').delete().eq('id', id)
    if (error) return flash(`실패: ${error.message}`)
    void load()
  }
  async function closeFix(id: number, status: 'fixed' | 'rejected') {
    const { error } = await sb.from('corrections').update({ status }).eq('id', id)
    if (error) return flash(`실패: ${error.message}`)
    flash(status === 'fixed' ? '고쳤다고 표시했어요' : '반영 안 함으로 닫았어요')
    void load()
  }
  async function judge(id: number, status: 'published' | 'hidden') {
    const { error } = await sb.from('reviews').update({ status }).eq('id', id)
    if (error) return flash(`실패: ${error.message}`)
    flash(status === 'published' ? '공개했어요' : '숨겼어요')
    void load()
  }

  // ── 로그인 ──
  if (!email) {
    return (
      <main className="mx-auto max-w-md px-5 py-24">
        <h1 className="h-display mb-6 text-[28px] text-ink">KOTA 관리자</h1>
        <SocialLogin lang="ko" />
        {sent ? (
          <p className="rounded-[var(--radius-card)] bg-brand-50 px-4 py-3 text-[14px] text-brand">
            메일함을 확인해 주세요. 링크를 누르면 이 화면으로 돌아옵니다.
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              const { error } = await sb.auth.signInWithOtp({
                email: loginEmail,
                options: { emailRedirectTo: window.location.href },
              })
              if (error) flash(error.message)
              else setSent(true)
            }}
            className="flex flex-col gap-2"
          >
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="관리자 이메일"
              className="rounded-full border border-line px-4 py-3 text-[15px] outline-none focus:border-brand"
            />
            <button type="submit" className="rounded-full bg-brand px-5 py-3 text-[15px] font-bold text-white">
              로그인 링크 받기
            </button>
            {msg && <p className="text-[13px] text-r">{msg}</p>}
          </form>
        )}
      </main>
    )
  }

  if (admin === false) {
    return (
      <main className="mx-auto max-w-md px-5 py-24 text-center">
        <p className="text-[15px] text-muted">
          {email} 계정에는 관리자 권한이 없어요.
        </p>
        <button onClick={() => sb.auth.signOut()} className="mt-4 text-[14px] font-bold text-brand hover:underline">
          다른 계정으로 로그인
        </button>
      </main>
    )
  }

  if (admin === null) return <main className="px-5 py-24 text-center text-muted">확인 중…</main>

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <div className="mb-10 flex items-center justify-between gap-4">
        <h1 className="h-display text-[30px] text-ink">KOTA 관리자</h1>
        <button onClick={() => sb.auth.signOut()} className="text-[13px] font-bold text-hint hover:text-ink">
          로그아웃
        </button>
      </div>

      {msg && (
        <p className="mb-6 rounded-[var(--radius-card)] bg-brand-50 px-4 py-2.5 text-[14px] font-semibold text-brand">{msg}</p>
      )}

      {/* ── 배너 ── */}
      <section className="mb-16">
        <h2 className="text-[20px] font-bold text-ink">홈 배너</h2>
        <p className="mt-1 text-[13px] text-hint">
          여기에 아무것도 없으면 이번 주말 축제가 인기순으로 자동으로 올라가요. 하나라도 넣으면 넣은 것만 보여요.
        </p>

        <div className="mt-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="축제 이름으로 검색해서 추가"
            className="w-full rounded-full border border-line px-4 py-2.5 text-[15px] outline-none focus:border-brand"
          />
          {found.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-[var(--radius-card)] border border-line">
              {found.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => addPromo(f)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-paper-2"
                  >
                    {f.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.image_url} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded bg-paper-2" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-ink">{f.name}</span>
                      <span className="block text-[12px] text-hint">
                        {f.start_date} ~ {f.end_date}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-bold text-brand">추가</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="mt-6 space-y-3">
          {promos.length === 0 && (
            <li className="rounded-[var(--radius-card)] border border-dashed border-line px-5 py-8 text-center text-[14px] text-hint">
              큐레이션 없음 — 자동으로 채워집니다
            </li>
          )}
          {promos.map((p, i) => {
            const f = names[p.festival_id]
            return (
              <li key={p.id} className="rounded-[var(--radius-card)] border border-line p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 w-5 shrink-0 text-center text-[13px] font-black text-hint">{i + 1}</span>
                  {f?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.image_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                  ) : (
                    <span className="h-14 w-14 shrink-0 rounded bg-paper-2" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold text-ink">{f?.name ?? p.festival_id}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={p.active} onChange={(e) => patch(p.id, { active: e.target.checked })} />
                        노출
                      </label>
                      <label className="flex items-center gap-1.5" title="돈을 받고 넣은 자리는 화면에 광고라고 밝힙니다">
                        <input
                          type="checkbox"
                          checked={p.sponsored}
                          onChange={(e) => patch(p.id, { sponsored: e.target.checked })}
                        />
                        광고
                      </label>
                      <label className="flex items-center gap-1.5 text-hint">
                        시작
                        <input
                          type="date"
                          value={p.starts_on ?? ''}
                          onChange={(e) => patch(p.id, { starts_on: e.target.value || null })}
                          className="rounded border border-line px-2 py-1"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-hint">
                        종료
                        <input
                          type="date"
                          value={p.ends_on ?? ''}
                          onChange={(e) => patch(p.id, { ends_on: e.target.value || null })}
                          className="rounded border border-line px-2 py-1"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex gap-1">
                      <button
                        disabled={i === 0}
                        onClick={() => {
                          void patch(p.id, { ord: p.ord - 1 })
                          void patch(promos[i - 1]!.id, { ord: p.ord })
                        }}
                        className="rounded px-2 py-1 text-[13px] text-muted hover:bg-paper-2 disabled:opacity-30"
                        aria-label="위로"
                      >
                        ↑
                      </button>
                      <button
                        disabled={i === promos.length - 1}
                        onClick={() => {
                          void patch(p.id, { ord: p.ord + 1 })
                          void patch(promos[i + 1]!.id, { ord: p.ord })
                        }}
                        className="rounded px-2 py-1 text-[13px] text-muted hover:bg-paper-2 disabled:opacity-30"
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                    </div>
                    <button onClick={() => remove(p.id)} className="text-[12px] font-bold text-r hover:underline">
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── 정보 수정 요청 ── */}
      <section className="mb-16">
        <h2 className="text-[20px] font-bold text-ink">
          정보 수정 요청
          {fixes.length > 0 && <span className="ml-2 rounded-full bg-r px-2 py-0.5 text-[12px] font-bold text-white">{fixes.length}</span>}
        </h2>
        <p className="mt-1 text-[13px] text-hint">
          방문자가 알려준 오류예요. 고친 뒤 닫으면 목록에서 사라져요.
        </p>

        <ul className="mt-5 space-y-3">
          {fixes.length === 0 && (
            <li className="rounded-[var(--radius-card)] border border-dashed border-line px-5 py-8 text-center text-[14px] text-hint">
              들어온 요청이 없어요
            </li>
          )}
          {fixes.map((c) => {
            const KIND: Record<string, string> = { dates: '날짜', place: '장소', canceled: '취소·중단', photo: '사진', link: '홈페이지', other: '기타' }
            return (
              <li key={c.id} className="rounded-[var(--radius-card)] border border-line p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="rounded-full bg-paper-2 px-2 py-0.5 font-bold text-ink">{KIND[c.kind] ?? c.kind}</span>
                  <a
                    href={`/ko/festivals/${toSlug(c.festival_id)}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand hover:underline"
                  >
                    {names[c.festival_id]?.name ?? c.festival_id}
                  </a>
                  <span className="text-hint">{c.created_at.slice(0, 10)}</span>
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{c.body}</p>
                {c.contact && <p className="mt-2 text-[13px] text-muted">답신: {c.contact}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => closeFix(c.id, 'fixed')} className="rounded-full bg-brand px-4 py-2 text-[13px] font-bold text-white">
                    고쳤어요
                  </button>
                  <button
                    onClick={() => closeFix(c.id, 'rejected')}
                    className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-muted hover:border-r hover:text-r"
                  >
                    반영 안 함
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── 리뷰 검토 ── */}
      <section>
        <h2 className="text-[20px] font-bold text-ink">검토 대기 리뷰</h2>
        <p className="mt-1 text-[13px] text-hint">
          공개하기 전까지는 쓴 사람 본인 말고 아무에게도 보이지 않아요.
        </p>

        <ul className="mt-5 space-y-3">
          {reviews.length === 0 && (
            <li className="rounded-[var(--radius-card)] border border-dashed border-line px-5 py-8 text-center text-[14px] text-hint">
              대기 중인 리뷰가 없어요
            </li>
          )}
          {reviews.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-card)] border border-line p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-hint">
                <span className="font-bold text-brand">{'★'.repeat(r.rating)}</span>
                <span>{names[r.festival_id]?.name ?? r.festival_id}</span>
                <span>{r.created_at.slice(0, 10)}</span>
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{r.body}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => judge(r.id, 'published')}
                  className="rounded-full bg-brand px-4 py-2 text-[13px] font-bold text-white"
                >
                  공개
                </button>
                <button
                  onClick={() => judge(r.id, 'hidden')}
                  className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-muted hover:border-r hover:text-r"
                >
                  숨김
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
