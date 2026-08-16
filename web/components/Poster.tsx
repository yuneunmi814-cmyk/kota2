'use client'
import { useState } from 'react'

// 축제 포스터 — 없거나 로딩에 실패해도 자리를 채운다.
//
// 425건 중 142건은 어떤 경로로도 포스터를 못 구한다. 같은 아이콘 하나로 채우면
// 목록을 내릴 때 수백 번 반복돼 '만들다 만 화면'으로 읽히므로, 축제명 첫 글자를
// 브랜드 색으로 놓아 카드마다 다르게 보이게 한다. 포스터 URL은 지자체 서버에 있어
// 수시로 죽기 때문에 onError도 같은 자리채움으로 떨어뜨린다.
//
// 여기에 '포스터 준비 중'을 명시한다. 한때는 빈 자리를 그 지역 풍경 사진(포토코리아)으로
// 메웠는데 — 구례 축제에 화엄사 사진 — 그 축제와 아무 상관이 없다. '지역 사진'이라고
// 라벨을 달아도 대부분은 축제 사진으로 읽는다. 채워 보이려고 엉뚱한 사진을 놓느니
// 없다고 말하는 편이 정직하고, 여행자도 헛된 기대를 안 한다.

const PLACEHOLDER = 'bg-[#f2f2f0]'

function initial(name: string) {
  const trimmed = name.replace(/^[\s\d[\](){}'"·-]+/, '').trim()
  return [...(trimmed || name)][0] ?? '·'
}

export default function Poster({
  src,
  name,
  className = '',
  letterClass = 'text-[2.4em]',
  pendingLabel,
}: {
  src?: string | null
  name: string
  className?: string
  letterClass?: string
  /** 포스터가 아직 없을 때 자리채움 위에 얹는 안내 — 목록 카드에서만 쓴다 */
  pendingLabel?: string
}) {
  const [failed, setFailed] = useState(false)
  // 이미지가 있어도 틴트+첫 글자를 먼저 깔고 그 위에 얹는다 — 지자체 서버가 느려서
  // 로딩에 몇 초 걸리는 동안 흰 공백이 보이던 문제(실측). 로드되면 이미지가 덮는다.
  return (
    <div className={`relative flex h-full w-full items-center justify-center ${PLACEHOLDER} ${className}`}>
      <span className={`font-black leading-none text-ink/15 select-none ${letterClass}`} aria-hidden="true">
        {initial(name)}
      </span>
      {src && !failed && (
        <img
          src={src}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* 포스터가 없거나 죽은 링크일 때 — 상태를 그대로 말한다 */}
      {(!src || failed) && pendingLabel && (
        <span className="absolute bottom-2 left-2 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-ink/45">
          {pendingLabel}
        </span>
      )}
    </div>
  )
}
