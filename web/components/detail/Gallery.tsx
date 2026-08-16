'use client'
import { useEffect, useState } from 'react'

// 축제 사진 갤러리 — TourAPI detailImage2로 받은 사진들.
//
// ⚠ 저작권: 전부 공공누리 3유형(출처표시 + **변경금지**)이다. 크롭·리사이즈·오버레이는
// 2차적저작물 작성으로 볼 소지가 있어 라이트박스에서는 원본 비율을 유지한다(object-contain).
// 썸네일 격자는 CSS로 표시 영역만 자르고 원본 파일은 건드리지 않는다.
// 출처(한국관광공사 TourAPI)는 화면에 명시한다.

export interface Photo {
  url: string
  thumb: string
  name: string
}

export default function Gallery({ photos, title, sourceLabel }: { photos: Photo[]; title: string; sourceLabel: string }) {
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? null : (i + 1) % photos.length))
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, photos.length])

  if (photos.length === 0) return null

  return (
    <>
      <div className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
        {photos.map((p, i) => (
          <button
            key={p.url}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative aspect-[4/3] w-[132px] shrink-0 snap-start overflow-hidden rounded-xl bg-surface sm:w-auto"
            aria-label={`${title} ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.04]" />
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-hint">{sourceLabel}</p>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink/92 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
        >
          <div className="flex shrink-0 items-center justify-between text-white">
            <span className="text-[13px] font-semibold">
              {open + 1} / {photos.length}
            </span>
            <button type="button" onClick={() => setOpen(null)} className="rounded-full px-3 py-1 text-[20px] leading-none hover:bg-white/15" aria-label="close">
              ×
            </button>
          </div>
          {/* 변경금지 조건 — 원본 비율 그대로 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[open]!.url}
            alt={photos[open]!.name || title}
            className="mx-auto min-h-0 flex-1 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="mt-3 shrink-0 text-center text-[12px] text-white/70">{sourceLabel}</p>
        </div>
      )}
    </>
  )
}
