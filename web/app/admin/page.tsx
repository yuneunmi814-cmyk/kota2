import type { Metadata } from 'next'
import AdminBoard from '@/components/admin/AdminBoard'

// 관리자 화면 — 배너 큐레이션과 리뷰 검토.
//
// 언어판을 두지 않는다(/[lang]/ 밖에 있다). 쓰는 사람이 정해져 있고, 관리 화면까지
// 4개 언어로 옮기는 건 아무도 읽지 않을 번역을 만드는 일이다.
//
// 데이터는 전부 브라우저에서 읽고 쓴다. 서버에서 미리 그리면 관리자 세션을 서버가
// 들고 있어야 하는데, 그 복잡도를 감수할 만큼 이 화면이 빠를 필요는 없다.
// 접근 통제도 화면이 아니라 DB가 한다 — 관리자가 아니면 RLS가 조회 자체를 막는다.

export const metadata: Metadata = {
  title: 'KOTA 관리자',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminBoard />
}
