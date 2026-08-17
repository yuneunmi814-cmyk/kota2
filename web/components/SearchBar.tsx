'use client'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import Icon from './Icon'

// 검색 — 히어로의 주인공. 트립어드바이저처럼 크고 둥글게 두어 '여기서 시작한다'를 만든다.
//
// 버튼은 먹빛이다. 형광 초록이 아니라서 물러난 게 아니라, 물러나야 할 자리라서 먹빛이다 —
// 바로 아래 회전 배너가 같은 형광이면 첫 화면에서 초록이 두 번 말하고 시선이 갈라진다.
// 형광은 화면에서 한 번만 튀어야 힘이 있다. 배너 안의 CTA도 같은 이유로 먹빛이다.
export default function SearchBar({ lang }: { lang: Lang }) {
  const router = useRouter()
  const [q, setQ] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const s = q.trim()
    router.push(`/${lang}/festivals/${s ? `?q=${encodeURIComponent(s)}` : ''}`)
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-line bg-surface p-2 pl-6 shadow-[0_2px_18px_-6px_rgba(79,50,22,.18)] transition focus-within:border-brand"
    >
      <Icon name="search" size={20} className="text-hint" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, 'search.placeholder')}
        aria-label={t(lang, 'search.button')}
        className="min-w-0 flex-1 bg-transparent py-3 text-[16px] text-ink outline-none placeholder:text-hint"
      />
      <button
        type="submit"
        className="shrink-0 rounded-full bg-ink px-6 py-3 text-[15px] font-bold text-white transition hover:bg-ink/85"
      >
        {t(lang, 'search.button')}
      </button>
    </form>
  )
}
