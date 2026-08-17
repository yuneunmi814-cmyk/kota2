import Link from 'next/link'
import type { Festival } from '@/lib/festivals'
import { localized } from '@/lib/festivals'
import type { Lang } from '@/lib/i18n'

// 히어로 사진 띠 — 트립어드바이저 홈이 여행 사진 콜라주로 문을 여는 자리.
//
// 글로만 여는 화면은 '또 하나의 정보 사이트'로 읽힌다. 축제는 눈으로 파는 것이라
// 첫 화면에서 실제 축제 사진을 보여주는 편이 백 마디보다 낫다.
//
// 다만 장식으로 쓰지 않는다 — 네 장 모두 지금 열리고 있거나 곧 열리는 진짜 축제이고,
// 누르면 그 축제로 간다. 이름을 사진 위에 얹어서 어떤 축제인지도 밝힌다.
// 사진이 넉 장이 안 되면 아예 띠를 그리지 않는다(반쯤 빈 콜라주가 더 어설프다).

export default function HeroBand({ items, lang }: { items: Festival[]; lang: Lang }) {
  const four = items.filter((f) => f.imageUrl).slice(0, 4)
  if (four.length < 4) return null

  return (
    <div className="mx-auto max-w-6xl px-5 pb-14">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        {four.map((f, i) => (
          <Link
            key={f.externalId}
            href={`/${lang}/festivals/${f.externalId}/`}
            className={`group relative overflow-hidden rounded-[var(--radius-card)] bg-[#f2f2f0] ${
              // 첫 장을 크게 — 넉 장이 같은 크기면 나열로만 보이고 시선이 머물 데가 없다
              i === 0 ? 'col-span-2 aspect-[16/10] md:col-span-2 md:row-span-2 md:aspect-auto' : 'aspect-[4/3]'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.imageUrl!}
              alt=""
              loading={i === 0 ? 'eager' : 'lazy'}
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <span className="line-clamp-2 text-[13px] font-bold leading-snug text-white drop-shadow sm:text-[15px]">
                {localized(f, lang).name}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
