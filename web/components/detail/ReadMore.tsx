'use client'
import { useState } from 'react'
import { detailTextBlocks } from '@/lib/detail-text'

// 개요 더보기 — 트립어드바이저·구석구석 둘 다 소개를 4~5줄에서 접는다.
// 300자 넘는 kfes 산문을 다 펼쳐두면 정보 카드가 화면 밖으로 밀린다.
export default function ReadMore({ text, more, less }: { text: string; more: string; less: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 220
  const blocks = detailTextBlocks(text)
  return (
    <div>
      <div className={`space-y-4 text-[16px] leading-[1.75] text-ink/85 ${!open && long ? 'max-h-[9rem] overflow-hidden' : ''}`}>
        {blocks.map((block, i) => block.kind === 'paragraph' ? (
          <p key={i}>{block.lines.map((line, j) => <span key={j}>{j > 0 && <br />}{line}</span>)}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">{block.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
        ))}
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-[14px] font-bold text-brand underline-offset-4 hover:underline">
          {open ? less : more}
        </button>
      )}
    </div>
  )
}
