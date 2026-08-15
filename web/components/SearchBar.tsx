'use client'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import Icon from './Icon'

// 검색 — 히어로의 주인공. 트립어드바이저처럼 크고 둥글게 두어 '여기서 시작한다'를 만든다.
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
        className="shrink-0 rounded-full bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:bg-brand-600"
      >
        {t(lang, 'search.button')}
      </button>
    </form>
  )
}
