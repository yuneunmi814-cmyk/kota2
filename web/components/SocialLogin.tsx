'use client'
import { useState } from 'react'
import { browserSupabase } from '@/lib/supabase-browser'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'

// 소셜 로그인 — 카카오와 구글.
//
// 둘을 나눠 둔 이유는 쓰는 사람이 다르기 때문이다. 한국 이용자는 카카오가 아니면
// 가입 자체를 안 하고, 외국인은 카카오 계정이 없다. 4개 언어 서비스라 둘 다 필요하다.
//
// Supabase Auth에서 해당 제공자를 켜지 않으면 버튼을 눌러도 에러가 난다. 그래서 켜져 있는
// 것만 보여준다 — 눌리는데 안 되는 버튼은 없느니만 못하다. 어느 것이 켜졌는지는
// 빌드 시점 환경변수로 알려준다(제공자 목록을 물어보는 공개 API가 없다).

const ENABLED = {
  kakao: process.env.NEXT_PUBLIC_AUTH_KAKAO === '1',
  google: process.env.NEXT_PUBLIC_AUTH_GOOGLE === '1',
}

export default function SocialLogin({ lang, redirectTo }: { lang: Lang; redirectTo?: string }) {
  const [busy, setBusy] = useState<string | null>(null)
  if (!ENABLED.kakao && !ENABLED.google) return null

  // 카카오는 요청할 동의항목을 직접 적는다.
  //
  // 안 적으면 Supabase 기본값이 나가는데 거기에 프로필 사진(profile_image)이 들어 있다.
  // 우리는 후기에 프로필 사진을 그리지 않는다 — 이름과 별점만 보여준다. 쓰지도 않을
  // 사진을 달라고 하다가 카카오 콘솔에서 「사용 안 함」인 항목을 요청한 꼴이 되어
  // 로그인 자체가 KOE205로 막혔다(2026-08-19).
  //
  // 콘솔에서 사진을 열어 주는 대신 요청을 지운 이유는, 안 쓰는 개인정보는 처음부터
  // 받지 않는 게 맞아서다. 나중에 후기에 프로필 사진을 넣게 되면 그때
  // 'profile_image'를 여기 더하고 콘솔에서도 함께 열면 된다.
  const SCOPES: Record<string, string | undefined> = {
    kakao: 'profile_nickname account_email',
    google: undefined,
  }

  async function go(provider: 'kakao' | 'google') {
    setBusy(provider)
    const { error } = await browserSupabase().auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo ?? window.location.href, scopes: SCOPES[provider] },
    })
    if (error) setBusy(null)
  }

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        {ENABLED.kakao && (
          <button
            type="button"
            onClick={() => go('kakao')}
            disabled={!!busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-kakao px-5 py-3 text-[15px] font-bold text-kakao-ink transition hover:brightness-95 disabled:opacity-60"
          >
            <svg width="18" height="17" viewBox="0 0 18 17" aria-hidden fill="currentColor">
              <path d="M9 0C4.03 0 0 3.13 0 6.99c0 2.5 1.68 4.69 4.2 5.92-.18.65-.67 2.42-.77 2.8-.12.47.17.46.36.34.15-.1 2.37-1.6 3.33-2.25.61.09 1.24.14 1.88.14 4.97 0 9-3.13 9-6.99C18 3.13 13.97 0 9 0Z" />
            </svg>
            {t(lang, 'login.kakao')}
          </button>
        )}
        {ENABLED.google && (
          <button
            type="button"
            onClick={() => go('google')}
            disabled={!!busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-[15px] font-bold text-ink transition hover:border-ink/30 disabled:opacity-60"
          >
            <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
            </svg>
            {t(lang, 'login.google')}
          </button>
        )}
      </div>
      <div className="my-4 flex items-center gap-3 text-[12px] text-hint">
        <span className="h-px flex-1 bg-line" />
        {t(lang, 'login.or')}
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  )
}
