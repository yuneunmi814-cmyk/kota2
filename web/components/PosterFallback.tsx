'use client'
import Image from 'next/image'
import { usePosterPeriod } from '@/lib/use-poster-period'

/** User-provided decorative art, never presented as an actual festival photograph. */
export default function PosterFallback({ name, pendingLabel }: { name: string; pendingLabel: string }) {
  const period = usePosterPeriod()
  return (
    <div className="absolute inset-0 flex flex-col justify-center border-b border-line bg-brand px-5 py-7">
      {period && <Image
        src={`/images/fallback/${period}.png`}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
        className="object-cover"
      />}
      <span aria-hidden="true" className="absolute inset-0 bg-black/30" />
      <span className="relative line-clamp-3 text-xl font-bold leading-snug text-white">{name}</span>
      <span className="sr-only">{pendingLabel}</span>
    </div>
  )
}
