'use client'
import { useEffect, useState } from 'react'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'

// 상세 페이지 목차 — 누르면 그 자리로 미끄러져 내려간다.
//
// T맵 축제 상세는 13,000px이 넘고 우리도 사진·소개·먹거리·프로그램·영상·위치·리뷰·근처가
// 차례로 이어진다. 「위치가 어디지」 하나만 보려는 사람이 전부 스크롤할 이유는 없다.
// 리뷰가 쌓이면 더 절실해진다 — 리뷰 수십 개 아래의 '근처 축제'까지 내려갈 사람은 없다.
//
// 스크롤을 따라 현재 위치를 표시한다. 목차가 어디에 있는지 알려주지 않으면
// 길잡이가 아니라 버튼 묶음일 뿐이다.

export interface Anchor {
  id: string
  label: string
}

export default function AnchorTabs({ anchors, lang }: { anchors: Anchor[]; lang: Lang }) {
  const [active, setActive] = useState<string | null>(anchors[0]?.id ?? null)

  useEffect(() => {
    const targets = anchors.map((a) => document.getElementById(a.id)).filter((el): el is HTMLElement => !!el)
    if (targets.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        // 화면 위쪽에 걸린 것 중 가장 아래 것이 '지금 보고 있는 섹션'이다
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // 헤더 높이만큼 위를 잘라내고, 화면 아래 절반은 무시한다
      { rootMargin: '-88px 0px -55% 0px', threshold: 0 },
    )
    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [anchors])

  if (anchors.length < 3) return null // 두 개짜리 목차는 목차가 아니다

  return (
    <nav
      aria-label={t(lang, 'detail.contents')}
      className="sticky top-0 z-30 -mx-5 mb-6 border-b border-line bg-paper/95 px-5 backdrop-blur"
    >
      <div className="no-scrollbar flex gap-1 overflow-x-auto">
        {anchors.map((a) => (
          <a
            key={a.id}
            href={`#${a.id}`}
            className={`shrink-0 border-b-2 px-3 py-3 text-[14px] font-bold transition ${
              active === a.id ? 'border-brand text-brand-deep' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {a.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
