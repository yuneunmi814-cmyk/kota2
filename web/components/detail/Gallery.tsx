'use client'
import { useCallback, useEffect, useState } from 'react'

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

export default function Gallery({
  photos,
  title,
  sourceLabel,
  prevLabel,
  nextLabel,
  closeLabel,
}: {
  photos: Photo[]
  title: string
  sourceLabel: string
  prevLabel: string
  nextLabel: string
  closeLabel: string
}) {
  const [open, setOpen] = useState<number | null>(null)
  const many = photos.length > 1

  const go = useCallback(
    (step: number) => setOpen((i) => (i === null ? null : (i + step + photos.length) % photos.length)),
    [photos.length],
  )

  useEffect(() => {
    if (open === null) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') history.back()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }

    // 라이트박스를 방문 기록에 한 칸 얹는다.
    //
    // 왜 필요한가: 사진을 열어 둔 채로 뒤로가기를 누르면 사진만 닫히길 기대하는데,
    // 기록에 아무것도 없으니 축제 목록으로 통째로 튕겨 나갔다(BUG-18). 모바일에서는
    // 뒤로가기가 닫기보다 먼저 손에 잡히는 동작이라 더 자주 밟힌다.
    //
    // 주소는 그대로 두고 상태만 얹는다(pushState의 첫 인자). 주소를 바꾸면 그 주소가
    // 공유되거나 색인될 수 있는데, 사진 번호는 공유할 값이 아니다.
    const onPop = () => setOpen(null)
    history.pushState({ kotaLightbox: true }, '')

    window.addEventListener('keydown', onKey)
    window.addEventListener('popstate', onPop)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
      document.body.style.overflow = ''
      // 닫기 버튼이나 배경 클릭으로 닫힌 경우에는 우리가 얹은 칸이 남아 있다. 그대로 두면
      // 다음 뒤로가기가 아무 일도 일어나지 않는 것처럼 보이므로 걷어낸다.
      // popstate로 닫힌 경우에는 이미 브라우저가 걷어냈다 — 그때는 상태가 없다.
      if (history.state?.kotaLightbox) history.back()
    }
  }, [open, go])

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
          onClick={() => history.back()}
        >
          <div className="flex shrink-0 items-center justify-between text-white">
            <span className="text-[13px] font-semibold">
              {open + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => history.back()}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[22px] leading-none hover:bg-white/15"
              aria-label={closeLabel}
            >
              ×
            </button>
          </div>

          {/* 변경금지 조건 — 원본 비율 그대로 */}
          <div className="relative flex min-h-0 flex-1 items-center" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[open]!.url} alt={photos[open]!.name || title} className="mx-auto max-h-full object-contain" />

            {/* 사진이 한 장뿐이면 그리지 않는다. 누를 데가 없는 버튼은 없느니만 못하다.
                44px는 모바일 접근성 최소 탭 영역이다. */}
            {many && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={prevLabel}
                  className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-ink/60 text-[24px] leading-none text-white transition hover:bg-ink/80"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={nextLabel}
                  className="absolute right-0 flex h-12 w-12 items-center justify-center rounded-full bg-ink/60 text-[24px] leading-none text-white transition hover:bg-ink/80"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <p className="mt-3 shrink-0 text-center text-[12px] text-white/70">{sourceLabel}</p>
        </div>
      )}
    </>
  )
}
