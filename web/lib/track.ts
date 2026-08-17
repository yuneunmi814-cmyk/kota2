'use client'
import { browserSupabase } from './supabase-browser'

// 행동 기록 — 무엇을 봤고 무엇을 찾았는지.
//
// 세 가지를 지킨다.
//  1) 화면을 붙잡지 않는다. 실패해도 조용히 넘어가고 await하지 않는다 —
//     로그 때문에 축제 페이지가 느려지면 본말이 뒤집힌다.
//  2) 사람을 특정하지 않는다. 방문자 ID는 브라우저가 만든 임의 문자열이고,
//     지우면 새 사람이 된다. IP나 기기 정보는 담지 않는다.
//  3) 읽지 못한다. 남기는 것만 허용돼 있어(RLS) 브라우저에서 남의 동선을 볼 수 없다.

const KEY = 'kota_visitor'

function visitorId(): string {
  try {
    let v = localStorage.getItem(KEY)
    if (!v) {
      v = crypto.randomUUID()
      localStorage.setItem(KEY, v)
    }
    return v
  } catch {
    // 시크릿 모드나 저장소 차단 — 기록은 남기되 사람 단위 구분은 포기한다
    return 'anon'
  }
}

export type EventKind = 'view' | 'search' | 'filter' | 'click' | 'outbound' | 'save'

export function track(
  kind: EventKind,
  opts: { festivalId?: string | null; payload?: Record<string, unknown>; lang?: string } = {},
) {
  if (typeof window === 'undefined') return
  try {
    const sb = browserSupabase()
    void sb.auth.getUser().then(({ data }) =>
      sb
        .from('events')
        .insert({
          visitor: visitorId(),
          user_id: data.user?.id ?? null,
          kind,
          festival_id: opts.festivalId ?? null,
          payload: opts.payload ?? null,
          lang: opts.lang ?? (document.documentElement.lang || null),
        })
        .then(() => {}),
    )
  } catch {
    /* 로그가 실패해도 화면은 계속 돌아간다 */
  }
}
