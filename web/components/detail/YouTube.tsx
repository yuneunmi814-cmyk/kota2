'use client'
import { useState } from 'react'

// 유튜브 — 클릭 전엔 썸네일만(iframe 200KB를 미리 안 싣는다). 클릭하면 그 자리에서 재생.
function idOf(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m?.[1] ?? null
}
export default function YouTube({ url, title }: { url: string; title: string }) {
  const [play, setPlay] = useState(false)
  const id = idOf(url)
  if (!id) return null
  return (
    <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} className="group relative h-full w-full" aria-label={title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-r text-white shadow-lg transition group-hover:scale-105">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}
    </div>
  )
}
