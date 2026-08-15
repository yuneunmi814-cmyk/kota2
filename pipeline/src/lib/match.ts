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

/** 두 기간이 겹치거나 30일 이내로 인접하면 같은 회차로 본다(소스마다 하루 이틀 어긋난다) */
export function periodsOverlap(aS: string, aE: string, bS: string, bE: string, slackDays = 30): boolean {
  const day = 86_400_000
  const s = Math.max(new Date(aS).getTime(), new Date(bS).getTime())
  const e = Math.min(new Date(aE).getTime(), new Date(bE).getTime())
  return e + slackDays * day >= s
}

/** 시·도 표기 통일 — 소스마다 '강원도'/'강원특별자치도'가 섞여 온다 */
export function canonSido(s?: string | null): string | null {
  if (!s) return null
  const t = s.trim()
  const map: Record<string, string> = {
    강원도: '강원특별자치도',
    전라북도: '전북특별자치도',
    전남광주통합특별시: '전라남도',
    서울: '서울특별시', 부산: '부산광역시', 대구: '대구광역시', 인천: '인천광역시', 광주: '광주광역시',
    대전: '대전광역시', 울산: '울산광역시', 세종: '세종특별자치시', 경기: '경기도', 강원: '강원특별자치도',
    충북: '충청북도', 충남: '충청남도', 전북: '전북특별자치도', 전남: '전라남도', 경북: '경상북도',
    경남: '경상남도', 제주: '제주특별자치도', 제주도: '제주특별자치도',
  }
  return map[t] ?? t
}
