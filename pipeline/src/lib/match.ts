// 소스 간 같은 축제 찾기.
//
// 두 단계로 판정한다.
//  1) 확실한 열쇠 — kfes.cmsCntntsId == tourapi.contentid (같은 CMS). 100% 신뢰.
//  2) 이름 정규화 + 같은 시·도 + 기간 겹침. 대형 축제는 여러 소스에 이름이 조금씩 다르게
//     들어온다('제65회 통영한산대첩축제' vs '통영한산대첩축제'). 회차·연도·'축제' 같은
//     접미사를 벗겨 비교하고, 시·도가 다르거나 기간이 안 겹치면 다른 축제로 본다
//     (같은 이름의 축제가 다른 도시에서 열리는 일이 실제로 있다).

export function normalizeName(s: string): string {
  return s
    .replace(/[\(（\[].*?[\)）\]]/g, '') // 괄호 안
    .replace(/제?\s*\d+\s*회/g, '') // 제65회
    .replace(/20\d{2}\s*년?/g, '') // 2026년
    .replace(/축제|페스티벌|페스타|한마당|문화제|축전|대축제|大祭/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '') // 공백·기호 전부
    .toLowerCase()
}

/**
 * 이름이 한쪽이 다른 쪽을 품는가 — 표준데이터는 축제명을 지자체가 줄여 적는다.
 * ('맥주축제' ⊂ '동대문구 맥주축제', '황토갯벌축제' ⊂ '무안 황토 갯벌축제')
 * 완전일치보다 훨씬 헐거우므로 호출부에서 반드시 같은 시군구 + 기간 실제 겹침을 함께 걸어야 한다.
 *
 * `forbidden`은 짧은 쪽이 이것과 같으면 판정을 거부하는 낱말들 — 지역명을 넘긴다.
 * '페스티벌 광명'은 정규화하면 '광명'만 남아 같은 시의 '광명동굴 빛 축제'·'광명마당극축제'에
 * 전부 걸린다(실측 오탐). 지역명만 남은 이름은 축제를 식별하지 못한다.
 */
export function nameContains(a: string, b: string, forbidden: (string | null | undefined)[] = []): boolean {
  const x = normalizeName(a)
  const y = normalizeName(b)
  if (!x || !y) return false
  if (x === y) return true
  const [s, l] = x.length <= y.length ? [x, y] : [y, x]
  if (s.length < 2 || !l.includes(s)) return false
  const bad = new Set(forbidden.filter(Boolean).map((v) => normalizeName(v!)))
  return !bad.has(s)
}

/** 화면에 쓸 이름 다듬기 — 앞머리 연도는 목록에서 잡음이다('2026 함평 물놀이 페스타' → '함평 물놀이 페스타') */
export function displayName(s: string): string {
  const t = s.replace(/^\s*20\d{2}\s*년?\s*/, '').trim()
  return t.length >= 2 ? t : s.trim()
}

/** 두 기간이 겹치거나 30일 이내로 인접하면 같은 회차로 본다(소스마다 하루 이틀 어긋난다) */
export function periodsOverlap(aS: string, aE: string, bS: string, bE: string, slackDays = 30): boolean {
  const day = 86_400_000
  const s = Math.max(new Date(aS).getTime(), new Date(bS).getTime())
  const e = Math.min(new Date(aE).getTime(), new Date(bE).getTime())
  return e + slackDays * day >= s
}

/** 시·도 표기 통일 — 소스마다 '강원도'/'강원특별자치도'가 섞여 온다 */
// 「전남광주통합특별시」는 여기서 풀지 않는다.
//
// 이 표기는 광주광역시와 전라남도 둘 다를 가리킨다. 한쪽으로 매핑하면 나머지 절반이
// 통째로 틀린다 — 실제로 전라남도로 보내 두었더니 광주 축제 4건(ACE Fair·충장축제·
// 버스킹월드컵·김치축제)이 전라남도로 분류돼 지역 필터에서 엉뚱한 곳에 잡혔다
// (2026-08-19 발견). 시군구를 같이 봐야 갈라지므로 resolveSido()에서 처리한다.
export function canonSido(s?: string | null): string | null {
  if (!s) return null
  const t = s.trim()
  const map: Record<string, string> = {
    강원도: '강원특별자치도',
    전라북도: '전북특별자치도',
    서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시', 광주: '광주광역시',
    대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시', 경기: '경기도', 강원: '강원특별자치도',
    충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도',
    경남: '경상남도', 제주: '제주특별자치도', 제주도: '제주특별자치도',
  }
  return map[t] ?? t
}

/** 광주광역시의 자치구 5 — 전라남도에는 '구'가 없어 이것만으로 갈린다 */
const GWANGJU_GU = new Set(['동구', '서구', '남구', '북구', '광산구'])

/**
 * 시·도를 정한다. 시군구가 필요한 경우(전남광주통합특별시)까지 여기서 판정한다.
 *
 * 통합 표기는 시군구로 가른다 — 광주는 전부 자치'구'이고 전라남도는 시·군뿐이라
 * 접미사만으로 확실히 갈린다. 시군구가 없으면 판단을 미루고 원문을 그대로 둔다.
 * 반반짜리 근거로 찍는 것보다 모른다고 두는 편이 낫다.
 */
export function resolveSido(sido?: string | null, sigungu?: string | null, address?: string | null): string | null {
  const t = (sido ?? '').trim()
  if (t === '전남광주통합특별시') {
    const gu = (sigungu ?? '').trim() || (address ?? '').replace(t, '').trim().split(/\s+/)[0] || ''
    if (GWANGJU_GU.has(gu)) return '광주광역시'
    if (/(시|군)$/.test(gu)) return '전라남도'
    return t
  }
  return canonSido(sido)
}
