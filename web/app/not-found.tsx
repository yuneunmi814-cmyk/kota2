import Link from 'next/link'

// 없는 주소일 때 보여줄 화면.
//
// 이게 없어서 지금까지 없는 주소가 홈을 200으로 돌려주고 있었다(BUG-20). 404를 제대로
// 돌려주는 것은 사람보다 검색엔진에 더 중요하다 — 200이면 없는 주소가 전부 색인된다.
//
// 언어를 모르는 자리라(경로가 깨진 상태다) 한국어와 영어를 나란히 둔다.

export default function NotFound() {
  return (
    <html lang="ko">
      <body className="bg-paper text-ink antialiased">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
          <p className="text-[13px] font-bold tracking-[0.14em] text-hint">404</p>
          <h1 className="mt-3 text-[22px] font-bold tracking-tight">페이지를 찾을 수 없습니다</h1>
          <p className="mt-1 text-[15px] text-muted">This page could not be found.</p>
          <p className="mt-5 text-[14px] leading-[1.7] text-hint">
            주소가 바뀌었거나 잘못 입력되었을 수 있습니다.
          </p>
          <div className="mt-7 flex gap-3">
            <Link href="/ko/" className="rounded-full bg-ink px-5 py-3 text-[15px] font-bold text-paper">
              축제 보러 가기
            </Link>
            <Link href="/en/" className="rounded-full border border-line px-5 py-3 text-[15px] font-bold text-ink">
              Browse festivals
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
