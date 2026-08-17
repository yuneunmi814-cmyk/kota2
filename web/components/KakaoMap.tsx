'use client'
import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { track } from '@/lib/track'

// 축제장 위치.
//
// 지도를 페이지 안에 그리려면 카카오맵 API가 켜져 있어야 하는데, 무료 쿼터가 계정당 앱 하나에만
// 붙고 그 자리를 다른 앱이 이미 차지했다(카카오는 이 배정을 옮겨주지 않는다). 그래서 기본은
// '카카오맵으로 넘기기'다.
//
// 이게 손해만은 아니다. 축제장은 결국 지도 앱을 열어야 갈 수 있고, 우리 페이지 안의 작은
// 지도로 실제 길을 찾는 사람은 드물다. 넘겨주는 편이 한 걸음 빠르다.
//
// 나중에 유료로 켜면 NEXT_PUBLIC_KAKAO_MAP=1 만 세우면 된다 — 그때는 지도를 직접 그린다.

const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
const EMBED = process.env.NEXT_PUBLIC_KAKAO_MAP === '1'

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void
        LatLng: new (lat: number, lng: number) => object
        Map: new (el: HTMLElement, o: object) => { setCenter: (p: object) => void }
        Marker: new (o: object) => { setMap: (m: object) => void }
      }
    }
  }
}

let loading: Promise<void> | null = null

function loadSdk(): Promise<void> {
  if (!KEY) return Promise.reject(new Error('no key'))
  if (window.kakao?.maps) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KEY}&autoload=false`
    s.async = true
    s.onload = () => window.kakao!.maps.load(() => resolve())
    s.onerror = () => reject(new Error('sdk blocked'))
    document.head.appendChild(s)
  })
  return loading
}

export default function KakaoMap({
  lat,
  lng,
  label,
  festivalId,
  linkLabel,
}: {
  lat: number
  lng: number
  label: string
  festivalId?: string
  linkLabel: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    if (!EMBED || !box.current) return
    let dead = false
    const io = new IntersectionObserver(
      (e) => {
        if (!e[0]?.isIntersecting) return
        io.disconnect()
        loadSdk()
          .then(() => {
            if (dead || !box.current) return
            const c = new window.kakao!.maps.LatLng(lat, lng)
            const map = new window.kakao!.maps.Map(box.current, { center: c, level: 5 })
            new window.kakao!.maps.Marker({ position: c }).setMap(map)
            setDrawn(true)
          })
          .catch(() => setDrawn(false))
      },
      { rootMargin: '200px' },
    )
    io.observe(box.current)
    return () => {
      dead = true
      io.disconnect()
    }
  }, [lat, lng])

  const href = `https://map.kakao.com/link/to/${encodeURIComponent(label)},${lat},${lng}`

  if (EMBED) {
    return (
      <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line">
        <div ref={box} className="aspect-[16/9] w-full bg-[#f2f2f0]" />
        <figcaption className="flex items-center justify-between gap-3 px-3 py-2 text-[12px] text-hint">
          <span className="truncate">{label}</span>
          <a href={href} target="_blank" rel="noopener noreferrer" className="shrink-0 font-bold text-brand hover:underline">
            {linkLabel}
          </a>
        </figcaption>
        {!drawn && <span className="sr-only">지도를 불러오는 중</span>}
      </figure>
    )
  }

  // 기본 — 지도를 그리지 않고 카카오맵으로 넘긴다.
  // 회색 빈 상자를 두지 않고 주소와 버튼이 있는 카드로 만든다. 자리를 메우려고 놓은 것이 아니라
  // 이 카드 자체가 할 일을 한다: 어디인지 읽고, 누르면 길이 열린다.
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => festivalId && track('outbound', { festivalId, payload: { to: 'kakaomap' } })}
      className="lift group flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 hover:border-brand/40"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
        <Icon name="pin" size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-ink group-hover:text-brand">{label}</span>
        <span className="mt-0.5 block text-[13px] text-hint">{linkLabel}</span>
      </span>
      <span className="shrink-0 text-hint transition group-hover:translate-x-0.5 group-hover:text-brand">
        <Icon name="arrow" size={18} />
      </span>
    </a>
  )
}
