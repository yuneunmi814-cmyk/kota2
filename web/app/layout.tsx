import type { ReactNode } from 'react'
import './globals.css'

// 루트 레이아웃은 껍데기만 — 실제 <html lang>은 [lang] 레이아웃이 정한다.
// (정적 내보내기에서 루트는 /ko/ 로 보내는 리다이렉트 역할만 한다)
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
