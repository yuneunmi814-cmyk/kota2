import { katakana, romanize, thai } from './lang/romanize.ts'
import { SIDO, splitSigungu, translateSigungu } from './lang/places.ts'

// 외국어 화면의 주소 — 한국어 주소를 그대로 흘리지 않고 현지 표기로 옮긴다.
//
// 통째로 음역하면 'Ulsangwangyeoksi uljugun'처럼 읽을 수 없는 글자가 나온다(2026-09-21 실측).
// 주소는 단위가 정해져 있으니 단위별로 옮긴다: 시도·시군구는 지명 사전, 읍·면·동·로·길은
// 어간 음역 + 단위 표기(-eup, -ro / 邑, 路), 건물번호는 그대로, 그 뒤 시설명은 음역.
// 한국어 원문 주소는 화면에서 따로 보여 준다 — 택시·지도 앱에는 그쪽이 필요하다.

export type ForeignLang = 'en' | 'ja' | 'th'

const UNITS: Array<[string, Record<ForeignLang, string>]> = [
  ['대로', { en: '-daero', ja: '大路', th: 'แทโร' }],
  ['로', { en: '-ro', ja: '路', th: 'โร' }],
  ['길', { en: '-gil', ja: 'ギル', th: 'กิล' }],
  ['읍', { en: '-eup', ja: '邑', th: 'อึบ' }],
  ['면', { en: '-myeon', ja: '面', th: 'มย็อน' }],
  ['동', { en: '-dong', ja: '洞', th: 'ดง' }],
  ['리', { en: '-ri', ja: '里', th: 'รี' }],
  ['가', { en: '-ga', ja: '街', th: 'กา' }],
]

const WORDS: Record<string, Record<ForeignLang, string>> = {
  일원: { en: 'area', ja: '一帯', th: 'และบริเวณใกล้เคียง' },
  일대: { en: 'area', ja: '一帯', th: 'และบริเวณใกล้เคียง' },
  층: { en: 'F', ja: '階', th: 'ชั้น' },
  지하: { en: 'B', ja: '地下', th: 'ชั้นใต้ดิน' },
  번지: { en: '', ja: '', th: '' },
}

const HANGUL = /[가-힣]/
const say = (s: string, lang: ForeignLang) => (lang === 'en' ? romanize(s) : lang === 'ja' ? katakana(s) : thai(s))

/** 한글 덩어리 하나를 단위 규칙으로. '정림로' → Jeongnim-ro, '길' → -gil(앞 숫자에 붙는다) */
function unitWord(run: string, lang: ForeignLang): string {
  if (WORDS[run]) return WORDS[run][lang]
  for (const [suffix, out] of UNITS) {
    if (run === suffix) return lang === 'en' ? out.en : out[lang]
    if (run.length > suffix.length && run.endsWith(suffix)) return say(run.slice(0, -suffix.length), lang) + out[lang]
  }
  return say(run, lang)
}

/** 토큰 하나 — 한글/비한글 덩어리로 갈라 각각 옮긴다. '알프스온천5길' → Alpeuseuoncheon 5-gil */
function token(tok: string, lang: ForeignLang, useUnits: boolean): string {
  const runs = tok.match(/[가-힣]+|[^가-힣]+/g) ?? []
  let out = ''
  runs.forEach((run, i) => {
    if (!HANGUL.test(run)) { out += lang === 'en' && /[A-Za-z]$/.test(out) && /^\d/.test(run) ? ` ${run}` : run; return }
    const piece = useUnits ? unitWord(run, lang) : (WORDS[run]?.[lang] ?? say(run, lang))
    // 영어는 숫자와 글자 사이를 띄운다(5-gil은 붙인다)
    if (lang === 'en' && i > 0 && /\d$/.test(out) && !piece.startsWith('-') && piece !== 'F') out += ' '
    if (lang === 'en' && /[A-Za-z]$/.test(out) === false && piece.startsWith('-') && !/\d$/.test(out)) { out += piece.slice(1); return }
    out += piece
  })
  return out
}

function sigunguOut(name: string, lang: ForeignLang): string {
  if (lang !== 'en') return translateSigungu(name)[lang]
  const { stem, kind } = splitSigungu(name)
  const tail = kind === '시' ? '-si' : kind === '군' ? '-gun' : kind === '구' ? '-gu' : ''
  return tail ? `${romanize(stem)}${tail}` : translateSigungu(name).en
}

/**
 * 한국어 주소 → 현지 표기. 결과에 한글이 남지 않는다.
 * en은 한국 도로명주소 영문 표기 순서(좁은 곳 → 넓은 곳), ja·th는 원래 순서.
 */
export function localizeAddress(address: string, lang: ForeignLang): string {
  const src = address.replace(/\s+/g, ' ').trim()
    .replace(/(지하\s*)?(\d+)층/g, (_m, b, n) => (lang === 'en' ? `${b ? 'B' : ''}${n}F` : lang === 'ja' ? `${b ? '地下' : ''}${n}階` : `ชั้น${b ? 'ใต้ดิน' : ''} ${n}`))
  if (!src) return ''
  // 첫 괄호·쉼표 앞까지가 행정 주소, 그 뒤는 시설·부연 설명
  const cut = src.search(/[,(]/)
  const headSrc = (cut === -1 ? src : src.slice(0, cut)).trim()
  const restSrc = cut === -1 ? '' : src.slice(cut).trim()

  const toks = headSrc.split(' ').filter(Boolean)
  const admin: string[] = []   // 시도·시군구·읍면동
  const street: string[] = []  // 도로명 + 건물번호 (또는 리 + 번지)
  const extra: string[] = []   // 번호 뒤에 붙은 시설명
  let seenNumber = false
  toks.forEach((tk, i) => {
    if (seenNumber) { extra.push(token(tk, lang, false)); return }
    if (/^[\d-]+(번지)?$/.test(tk)) { street.push(tk.replace('번지', '')); seenNumber = true; return }
    if (i === 0 && SIDO[tk]) { admin.push(SIDO[tk][lang]); return }
    if (i <= 2 && /^[가-힣]+(시|군|구)$/.test(tk) && tk.length >= 2 && street.length === 0) { admin.push(sigunguOut(tk, lang)); return }
    if (/(대로|로|길)$/.test(tk) || /\d+길$/.test(tk)) { street.push(token(tk, lang, true)); return }
    if (/(읍|면|동|리|가)$/.test(tk) && street.length === 0) { admin.push(token(tk, lang, true)); return }
    // 단위를 알 수 없는 낱말(장소 이름 등)
    ;(street.length ? street : admin).push(token(tk, lang, false))
  })

  let head: string
  if (lang === 'en' && street.length === 1 && /^[\d-]+$/.test(street[0]) && admin.length > 1) street.unshift(admin.pop() as string)
  if (lang === 'en') {
    // 83 Jeongnim-ro, Buyeo-eup, Buyeo-gun, Chungcheongnam-do
    const st = street.length > 1 && /^[\d-]+$/.test(street[street.length - 1])
      ? [street[street.length - 1], ...street.slice(0, -1)].join(' ')
      : street.join(' ')
    head = [st, ...admin.reverse()].filter(Boolean).join(', ')
    if (extra.length) head += ` (${extra.join(' ')})`
  } else {
    head = [...admin, ...street, ...extra].filter(Boolean).join(' ')
  }

  // 괄호·쉼표 뒤: '(정동)' 같은 법정동은 단위 규칙, 나머지는 음역
  const rest = restSrc
    .split(/(\s+|[(),·])/)
    .map((part) => (HANGUL.test(part) ? token(part, lang, /^[가-힣0-9]+(동|가|리)$/.test(part)) : part))
    .join('')
  const out = [head, rest].filter(Boolean).join(rest.startsWith(',') ? '' : ' ')
  // 안전망 — 어떤 경로로든 한글이 남으면 음역해서 내보낸다
  return out.replace(/[가-힣]+/g, (m) => say(m, lang)).replace(/\s+/g, ' ').trim()
}
