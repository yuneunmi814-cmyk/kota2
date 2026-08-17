import Link from 'next/link'
import type { Festival } from '@/lib/festivals'
import { localized } from '@/lib/festivals'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'

// 홈 중앙 프로모션 띠 — 트립어드바이저 홈의 초록 배너 자리.
//
// 그 배너는 광고처럼 생겼지만 자기 서비스를 파는 자리다. 사진 한 장, 큰 문장 하나,
// 행동 버튼 하나. 목록만 이어지는 화면에서 "이 서비스가 나에게 뭘 해주는가"를
// 한 번 크게 말하는 구간이다.
//
// 우리가 여기서 말할 것은 문화관광축제다. 카드 뱃지에서는 뺐던 것인데(여행자가 아니라
// 주최자의 언어라서) 여기서는 다르다. 설명할 공간이 있으면 "국가가 고른 축제"라는
// 뜻이 전달되고, 실제로 지정 축제는 방문객 배율 중앙값이 1.32배로 비지정(1.03배)보다 높다.
//
// 색은 트립어드바이저의 형광 민트를 베끼지 않는다. 그 초록은 그들 브랜드고,
// 우리 화면에 놓으면 흰 바탕으로 정리한 팔레트가 통째로 깨진다. 구조만 가져오고
// 색은 우리 딥그린으로 간다.

export default function PromoBanner({ all, lang }: { all: Festival[]; lang: Lang }) {
  const today = new Date().toISOString().slice(0, 10)
  const graded = all.filter((f) => f.category === 'MF' && f.endDate >= today)
  if (graded.length < 3) return null

  // 얼굴이 될 축제 — 사진이 있는 것 중 가장 사람이 몰린 것
  const face = [...graded].filter((f) => f.imageUrl).sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))[0]
  if (!face) return null

  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-brand">
        <div className="grid items-center gap-0 md:grid-cols-2">
          {/* 사진 */}
          <div className="relative aspect-[16/10] md:aspect-[4/3]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={face.imageUrl!} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              {localized(face, lang).name}
            </span>
          </div>

          {/* 말 */}
          <div className="p-7 sm:p-10">
            <p className="mb-3 inline-block rounded-full border border-white/35 px-3 py-1 text-[12px] font-bold text-white/85">
              {t(lang, 'grade.mf')}
            </p>
            <h2 className="h-display text-[26px] leading-tight text-white sm:text-[32px]">{t(lang, 'graded.title')}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/80">
              {t(lang, 'graded.sub', { n: graded.length })}
            </p>
            <Link
              href={`/${lang}/festivals/?graded=1`}
              className="mt-6 inline-flex items-center rounded-full bg-white px-6 py-3 text-[15px] font-bold text-brand-deep transition hover:bg-white/90"
            >
              {t(lang, 'graded.cta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
