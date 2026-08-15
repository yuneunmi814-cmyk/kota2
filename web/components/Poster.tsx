'use client'
import { useState } from 'react'

// 축제 포스터 — 없거나 로딩에 실패해도 자리를 채운다.
//
// 715건 중 460건 남짓은 공공 API에 이미지가 없다. 같은 아이콘 하나로 채우면
// 목록을 내릴 때 수백 번 반복돼 '만들다 만 화면'으로 읽히므로, 축제명 첫 글자를
// 브랜드 색으로 놓아 카드마다 다르게 보이게 한다. 포스터 URL은 지자체 서버에 있어
// 수시로 죽기 때문에 onError도 같은 자리채움으로 떨어뜨린다.

const TINTS = ['bg-tint-y', 'bg-tint-s', 'bg-tint-g', 'bg-tint-r']

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initial(name: string) {
  const trimmed = name.replace(/^[\s\d[\](){}'"·-]+/, '').trim()
  return [...(trimmed || name)][0] ?? '·'
}

export default function Poster({
  src,
  name,
  className = '',
  letterClass = 'text-[2.4em]',
}: {
  src?: string | null
  name: string
  className?: string
  letterClass?: string
}) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${TINTS[hash(name) % TINTS.length]} ${className}`}
      aria-hidden="true"
    >
      <span className={`font-black leading-none text-ink/45 select-none ${letterClass}`}>{initial(name)}</span>
    </div>
  )
}
