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

// http:// 로만 열리는 포스터는 우리 중계(app/img)를 거쳐 부른다.
//
// 우리 페이지는 https라 브라우저가 http 이미지를 혼합 콘텐츠로 차단한다. 그래서 주최측
// 사이트가 https를 지원하지 않으면 포스터가 있어도 못 썼다 — 노을동요제가 그랬다.
// A4 300dpi 원본이 버젓이 올라와 있는데 화면에는 자리채움만 나왔다.
//
// 중계를 거치면 서버가 http로 가져와 우리 도메인에서 https로 내보낸다. 브라우저는
// 우리 주소만 보므로 차단할 이유가 없다. 원본을 우리 서버에 복제해 두는 것이 아니라
// 요청이 올 때 거쳐 가는 것이라 저작권 취급도 핫링크와 같다.
//
// next/image를 먼저 붙여 봤지만 원격 주소를 전부 거절했다(app/img/route.ts 머리말 참고).
//
// https 주소는 그대로 둔다. 굳이 중계를 태우면 그만큼 우리 대역폭을 쓴다.
function proxied(url: string) {
  if (!url.startsWith('http://')) return url
  // 끝의 빗금을 붙여 부른다 — next.config의 trailingSlash 때문에 /img 는 308로 한 번
  // 튕긴다. 목록 한 화면에 스무 장이면 스무 번의 왕복이 그냥 늘어난다.
  return `/img/?u=${encodeURIComponent(url)}`
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
          src={proxied(src)}
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
