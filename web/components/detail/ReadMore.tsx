'use client'
import { useState } from 'react'

// 개요 더보기 — 트립어드바이저·구석구석 둘 다 소개를 4~5줄에서 접는다.
// 300자 넘는 kfes 산문을 다 펼쳐두면 정보 카드가 화면 밖으로 밀린다.
export default function ReadMore({ text, more, less }: { text: string; more: string; less: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 220
  return (
    <div>
      <p className={`whitespace-pre-line text-[16px] leading-[1.75] text-ink/85 ${!open && long ? 'line-clamp-5' : ''}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-[14px] font-bold text-brand underline-offset-4 hover:underline">
          {open ? less : more}
        </button>
      )}
    </div>
  )
}
