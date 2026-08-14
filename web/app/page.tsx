import { redirect } from 'next/navigation'
import { DEFAULT_LANG } from '@/lib/i18n'

// 루트(/)로 들어오면 기본 언어로 보낸다.
// 정적 내보내기에서는 이 페이지가 /index.html 로 나가며 클라이언트에서 이동한다.
export default function RootPage() {
  redirect(`/${DEFAULT_LANG}/`)
}
