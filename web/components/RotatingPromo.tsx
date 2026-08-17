'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { toSlug } from '@/lib/slug'

// 히어로 아래 회전 배너 — 트립어드바이저 홈의 형광 초록 배너를 그대로.
//
// 그쪽은 여행자가 올린 사진 넉 장을 돌리고 사진마다 @작성자를 얹는다. 우리는 이번 주말에
// 열리는 축제를 돌리고 그 자리에 이름과 방문객 배율을 얹는다.
//
// 여기에 '이번 주말'을 놓는 이유: 여행자가 가장 먼저 묻는 게 그것이고, 화면에서 가장
// 눈에 띄는 자리가 여기다. 'KOTA's Pick'이라고 이름 붙이되 무엇을 기준으로 골랐는지는
// 부제에 밝힌다 — 고른 기준을 감추면 그건 추천이 아니라 광고로 읽힌다.
//
// 색은 이제 여기만의 것이 아니다. 이 배너의 형광 초록이 서비스 전체의 축이 되면서
// --color-brand 가 됐다(globals.css). 그래서 색을 직접 박지 않고 토큰을 쓴다 —
// 나중에 색을 조정할 때 이 파일을 잊고 여기만 옛 색으로 남는 일을 막는다.
//
// 자동으로 넘어가되 멈출 수 있어야 한다. 움직이는 것을 못 멈추는 화면은 접근성 위반이고,
// 시스템에서 '동작 줄이기'를 켠 사람에게는 처음부터 돌리지 않는다.

export interface PromoSlide {
  id: string
  name: string
  image: string
  place: string
  lift: number | null
}

const INTERVAL = 5000

export default function RotatingPromo({
  slides,
  total,
  curated = false,
  lang,
}: {
  slides: PromoSlide[]
  total: number
  curated?: boolean
  lang: Lang
}) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (slides.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (paused) return
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), INTERVAL)
    return () => clearInterval(id)
  }, [slides.length, paused])

  if (slides.length === 0) return null
  const cur = slides[i]!

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-brand">
        <div className="grid items-stretch md:grid-cols-2">
          {/* 사진 — 넘어갈 때 부드럽게 교차 */}
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[340px]">
            {slides.map((s, n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.id}
                src={s.image}
                alt=""
                loading={n === 0 ? 'eager' : 'lazy'}
                aria-hidden={n !== i}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  n === i ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            {/* 트립어드바이저가 @작성자를 놓는 자리 — 우리는 축제 이름과 배율 */}
            <Link
              href={`/${lang}/festivals/${toSlug(cur.id)}/`}
              className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] rounded-full bg-brand px-3 py-1.5 text-[12px] font-bold text-ink transition hover:bg-white"
            >
              <span className="line-clamp-1">
                {cur.lift ? `×${cur.lift.toFixed(1)} · ` : ''}
                {cur.name}
              </span>
            </Link>
          </div>

          {/* 말 — 초록 위 검정. 트립어드바이저와 같은 대비 */}
          <div className="flex flex-col justify-center p-7 sm:p-10">
            <h2 className="h-display text-[26px] leading-tight text-ink sm:text-[34px]">{t(lang, 'promo.title')}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/75">
              {curated ? t(lang, 'promo.subCurated') : t(lang, 'promo.sub', { n: total })}
            </p>
            <Link
              href={`/${lang}/festivals/?period=weekend`}
              className="mt-6 inline-flex w-fit items-center rounded-full bg-ink px-6 py-3 text-[15px] font-bold text-white transition hover:bg-ink/85"
            >
              {t(lang, 'promo.cta')}
            </Link>

            {/* 점 + 멈춤 — 트립어드바이저도 우하단에 일시정지를 둔다 */}
            {slides.length > 1 && (
              <div className="mt-7 flex items-center gap-3">
                <div className="flex gap-1.5">
                  {slides.map((s, n) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setI(n)}
                      aria-label={`${n + 1}`}
                      className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-ink' : 'w-1.5 bg-ink/30 hover:bg-ink/50'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={t(lang, paused ? 'promo.play' : 'promo.pause')}
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded-full text-ink/60 transition hover:bg-ink/10 hover:text-ink"
                >
                  {paused ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden><path d="M2 1l9 5-9 5z" /></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden><rect x="2" y="1" width="3" height="10" /><rect x="7" y="1" width="3" height="10" /></svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
