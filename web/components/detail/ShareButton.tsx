'use client'
import { useState } from 'react'
import Icon from '../Icon'

// 공유 — 모바일은 시스템 공유 시트, 데스크톱은 링크 복사. 축제는 '같이 갈래?'로 퍼진다.
export default function ShareButton({ title, label, copied }: { title: string; label: string; copied: string }) {
  const [done, setDone] = useState(false)
  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        /* 사용자가 닫음 */
      }
    }
    await navigator.clipboard.writeText(url)
    setDone(true)
    setTimeout(() => setDone(false), 1800)
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-bold text-ink transition hover:border-brand/40 hover:text-brand"
    >
      <Icon name="share" size={16} /> {done ? copied : label}
    </button>
  )
}
