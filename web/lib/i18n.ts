// 언어 — URL의 첫 조각으로 쓴다(/ko/festivals/..., /ja/festivals/...).
//
// 이전 구현의 가장 큰 결함이 여기였다: 언어를 localStorage에만 두어 URL 하나가
// 상황에 따라 한국어도 되고 일본어도 됐다. 그래서 715건 × 3언어 = 2,145건을
// 번역해 놓고도 검색엔진에는 한국어 한 벌만 보였고, 일본어 링크를 공유해도
// 상대는 한국어로 열었다. 언어를 URL에 넣는 것이 이 재구현의 첫 번째 이유다.

export const LANGS = ['ko', 'en', 'ja', 'th'] as const
export type Lang = (typeof LANGS)[number]
export const DEFAULT_LANG: Lang = 'ko'

export const isLang = (v: string): v is Lang => (LANGS as readonly string[]).includes(v)

/** <html lang="..."> 과 hreflang에 쓰는 BCP 47 코드 */
export const HTML_LANG: Record<Lang, string> = {
  ko: 'ko-KR',
  en: 'en',
  ja: 'ja-JP',
  th: 'th-TH',
}

/** 언어 전환 UI에 쓰는 이름 — 각 언어를 그 언어로 적는다(외국인이 자기 말을 찾을 수 있게) */
export const LANG_NAME: Record<Lang, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  th: 'ไทย',
}

/** basePath를 포함한 경로 — 링크와 sitemap이 같은 규칙을 쓰게 한다 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

// 기본값은 반드시 '지금 서비스 중인 주소'여야 한다.
//
// 여기 GitHub Pages 주소(yuneunmi814-cmyk.github.io/kota2)가 남아 있었다. 정적 사이트
// 시절의 잔재인데, Vercel에 NEXT_PUBLIC_SITE_URL을 안 넣어 둔 탓에 그 기본값이 그대로
// 나갔다. 결과적으로 모든 페이지의 canonical과 sitemap 전체가 "내 진짜 주소는 저기다"라고
// 죽은 주소를 가리키고 있었다(2026-08-18 확인). 검색엔진에는 색인하지 말라는 말과 같다.
//
// 화면으로는 절대 안 보이는 종류의 사고다. 도메인이 정해지면 Vercel 환경변수만 바꾸면 된다.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kota2.vercel.app'

/** 언어별 절대 URL — hreflang·canonical·OG에 쓴다 */
export function absUrl(lang: Lang, path = ''): string {
  const clean = path.replace(/^\/+|\/+$/g, '')
  return `${SITE_URL}/${lang}${clean ? `/${clean}` : ''}/`.replace(/([^:]);\/+/g, '$1/')
}
