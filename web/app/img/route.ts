import type { NextRequest } from 'next/server'

// 포스터 중계 — http로만 열리는 주최측 이미지를 우리 도메인에서 https로 내보낸다.
//
// 왜 필요한가: 우리 페이지는 https라 브라우저가 http 이미지를 혼합 콘텐츠로 차단한다.
// 그래서 https를 지원하지 않는 지자체·재단 사이트의 포스터가 통째로 버려지고 있었다 —
// 노을동요제는 A4 300dpi 원본이 버젓이 올라와 있는데 화면에는 자리채움만 나왔다.
//
// 왜 next/image가 아닌가: Vercel 이미지 최적화기를 먼저 붙여 봤는데 원격 주소를 전부
// INVALID_IMAGE_OPTIMIZE_REQUEST로 되돌려 보냈다(로컬 이미지는 200). remotePatterns의
// '**' 와일드카드가 임의 호스트를 받아주지 않는 것으로 보인다. 호스트를 하나씩 적어
// 유지하느니 스무 줄짜리 중계를 두는 편이 낫다 — 새 축제가 들어올 때마다 설정을 고쳐야
// 하는 구조는 언젠가 반드시 빠뜨린다.
//
// 복제가 아니다. 요청이 올 때 가져다 흘려보낼 뿐 우리 저장소에 남기지 않으므로
// 저작권 취급은 핫링크와 같다. 출처는 화면에 그대로 표기한다.

export const runtime = 'edge'

/** 이 중계로 통과시킬 이미지 형식 */
const OK_TYPE = /^image\/(jpeg|png|gif|webp|avif)$/i

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('u')
  if (!raw) return new Response('missing u', { status: 400 })

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return new Response('bad url', { status: 400 })
  }

  // http/https 외에는 받지 않는다. data:·file: 같은 것을 흘려보내면 이 창구가
  // 남의 서버를 긁는 도구가 된다.
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return new Response('bad protocol', { status: 400 })
  }

  try {
    const upstream = await fetch(target, {
      // Referer를 우리 주소로 보내야 핫링크 차단을 덜 맞는다. 안 보내면 아예 막는 곳도 있다.
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KOTA/1.0; +https://ko-ta.co.kr)',
        Referer: target.origin + '/',
        Accept: 'image/*',
      },
      signal: AbortSignal.timeout(12_000),
    })

    const type = upstream.headers.get('content-type') ?? ''
    if (!upstream.ok || !OK_TYPE.test(type)) {
      // 차단 안내 페이지나 HTML이 오면 이미지가 아니다. 화면에서는 Poster의 onError가
      // 자리채움으로 떨어뜨린다.
      return new Response('not an image', { status: 404 })
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': type,
        // 한 번 가져온 것은 오래 들고 있는다. 포스터는 바뀌지 않고, 매번 주최측 서버를
        // 두드리면 그쪽에 폐가 된다.
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new Response('upstream failed', { status: 504 })
  }
}
