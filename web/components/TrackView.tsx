'use client'
import { useEffect } from 'react'
import { track } from '@/lib/track'

// 상세 페이지 조회 기록 — 서버 컴포넌트인 상세에 이 한 줄만 얹으면 된다.
//
// 새로고침마다 남긴다. 사람 단위 집계는 visitor를 distinct로 세면 되고(집계 뷰가 그렇게 한다),
// 원시 로그에서 미리 줄여 놓으면 나중에 다른 질문을 던질 수 없다.

export default function TrackView({ festivalId, lang }: { festivalId: string; lang: string }) {
  useEffect(() => {
    track('view', { festivalId, lang })
  }, [festivalId, lang])
  return null
}
