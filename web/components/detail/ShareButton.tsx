'use client'
import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon'
import { track } from '@/lib/track'

// 공유 — 축제는 '같이 갈래?'로 퍼진다. 그래서 공유가 부가 기능이 아니라 유입 경로다.
//
// 세 갈래를 둔다.
//  · 링크 복사 — 어디서나 되고, 무엇이 일어났는지 가장 분명하다
//  · 카카오톡 — 한국에서 '같이 갈래?'는 대부분 여기서 오간다
//  · 시스템 공유 — 모바일에서 인스타·메시지 등으로 바로 보낼 수 있다
//
// 카카오톡은 JavaScript 키가 있어야 SDK를 띄운다. 키가 없으면 버튼을 감춘다 —
// 눌렀는데 아무 일도 안 일어나는 버튼은 고장난 것으로 읽힌다.

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean
      init: (key: string) => void
      Share: { sendDefault: (o: unknown) => void }
    }
  }
}

export default function ShareButton({
  title,
  label,
  copied,
  festivalId,
  image,
  description,
  labels,
}: {
  title: string
  label: string
  copied: string
  festivalId: string
  image?: string | null
  description?: string | null
  labels: { copy: string; kakao: string; more: string }
}) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [kakaoReady, setKakaoReady] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // 카카오 SDK는 공유를 열려고 할 때만 불러온다 — 모든 방문자가 쓰지 않는 스크립트다
  useEffect(() => {
    if (!open || !KAKAO_KEY || window.Kakao?.isInitialized()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- window.Kakao는 브라우저에만 있다. 렌더 중에는 볼 수 없다.
      if (window.Kakao?.isInitialized()) setKakaoReady(true)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
    s.integrity = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka'
    s.crossOrigin = 'anonymous'
    s.onload = () => {
      if (!window.Kakao?.isInitialized()) window.Kakao?.init(KAKAO_KEY)
      setKakaoReady(true)
    }
    document.head.appendChild(s)
  }, [open])

  // 바깥을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const url = () => window.location.href

  const copy = async () => {
    await navigator.clipboard.writeText(url())
    setDone(true)
    setOpen(false)
    track('click', { festivalId, payload: { what: 'share', via: 'copy' } })
    setTimeout(() => setDone(false), 1800)
  }

  const kakao = () => {
    window.Kakao?.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description: description?.slice(0, 80) ?? '',
        imageUrl: image ?? '',
        link: { mobileWebUrl: url(), webUrl: url() },
      },
      buttons: [{ title: labels.more, link: { mobileWebUrl: url(), webUrl: url() } }],
    })
    setOpen(false)
    track('click', { festivalId, payload: { what: 'share', via: 'kakao' } })
  }

  const native = async () => {
    setOpen(false)
    try {
      await navigator.share({ title, url: url() })
      track('click', { festivalId, payload: { what: 'share', via: 'native' } })
    } catch {
      /* 사용자가 닫음 */
    }
  }

  const item = 'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-semibold text-ink hover:bg-paper-2'

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-bold text-ink transition hover:border-brand/40 hover:text-brand"
      >
        <Icon name="share" size={16} /> {done ? copied : label}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface py-1 shadow-[0_10px_30px_-12px_rgba(0,0,0,.25)]">
          <button type="button" onClick={copy} className={item}>
            <Icon name="link" size={16} className="text-muted" />
            {labels.copy}
          </button>

          {KAKAO_KEY && (
            <button type="button" onClick={kakao} disabled={!kakaoReady} className={`${item} disabled:opacity-50`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-kakao text-[9px] font-black text-kakao-ink">
                K
              </span>
              {labels.kakao}
            </button>
          )}

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button type="button" onClick={native} className={item}>
              <Icon name="share" size={16} className="text-muted" />
              {labels.more}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
