import type { Lang } from './i18n'

// 시·도 표기 — 데이터의 정식 명칭(festivals.sido)을 키로 쓴다.
//
// 화면에는 짧은 이름을 쓴다: '강원특별자치도'를 그대로 칩에 넣으면 줄이 밀린다.
// 외국어는 로마자·한자·태국문자 관용 표기를 따른다(현지에서 길을 물을 수 있어야 한다).
//
// ⚠ 줄이는 것은 한국어에서만 한다. 일본어 '慶尚南'은 그 자체로 없는 말이라
//   빵부스러기가 '慶尚南の祭り'로 나갔다 — 한국어 '경남'을 그대로 옮긴 탓이다(2026-08-23 점검).
//   한자권은 道까지 붙여야 말이 된다.

const M: Record<string, Record<Lang, string>> = {
  서울특별시: { ko: '서울', en: 'Seoul', ja: 'ソウル', th: 'โซล' },
  부산광역시: { ko: '부산', en: 'Busan', ja: '釜山', th: 'ปูซาน' },
  대구광역시: { ko: '대구', en: 'Daegu', ja: '大邱', th: 'แทกู' },
  인천광역시: { ko: '인천', en: 'Incheon', ja: '仁川', th: 'อินชอน' },
  광주광역시: { ko: '광주', en: 'Gwangju', ja: '光州', th: 'ควังจู' },
  대전광역시: { ko: '대전', en: 'Daejeon', ja: '大田', th: 'แทจอน' },
  울산광역시: { ko: '울산', en: 'Ulsan', ja: '蔚山', th: 'อุลซาน' },
  세종특별자치시: { ko: '세종', en: 'Sejong', ja: '世宗', th: 'เซจง' },
  경기도: { ko: '경기', en: 'Gyeonggi', ja: '京畿道', th: 'คยองกี' },
  강원특별자치도: { ko: '강원', en: 'Gangwon', ja: '江原道', th: 'คังวอน' },
  충청북도: { ko: '충북', en: 'Chungbuk', ja: '忠清北道', th: 'ชุงบุก' },
  충청남도: { ko: '충남', en: 'Chungnam', ja: '忠清南道', th: 'ชุงนัม' },
  전북특별자치도: { ko: '전북', en: 'Jeonbuk', ja: '全羅北道', th: 'ชอนบุก' },
  전라남도: { ko: '전남', en: 'Jeonnam', ja: '全羅南道', th: 'ชอนนัม' },
  경상북도: { ko: '경북', en: 'Gyeongbuk', ja: '慶尚北道', th: 'คยองบุก' },
  경상남도: { ko: '경남', en: 'Gyeongnam', ja: '慶尚南道', th: 'คยองนัม' },
  제주특별자치도: { ko: '제주', en: 'Jeju', ja: '済州', th: 'เชจู' },
}

export const sidoLabel = (sido: string, lang: Lang) => M[sido]?.[lang] ?? sido

// 권역 — 17개 시·도를 7권역으로 묶는다.
//
// 425건에 시·도 칩 17개는 잘게 쪼갠 것이다. 하위 5개는 2~7건뿐이라 칩 하나를 차지할 값을
// 못 하고, 가로 스크롤이 길어져 오른쪽 끝의 제주는 아예 눈에 띄지 않는다.
//
// 다만 권역만 남기면 부산·제주가 '경상'·'제주' 안에 묻힌다. 외국인 여행자에게 이 둘은
// 서울 다음으로 인지도가 높은 목적지라, 권역을 고르면 그 안의 시·도가 두 번째 줄로 펼쳐지게 했다.
// 인천은 별도 권역으로 두기엔 12건이라 수도권(경기)에 붙인다 — 여행 동선도 실제로 붙어 있다.
export interface Region {
  key: string
  sidos: string[]
  label: Record<Lang, string>
}

export const REGIONS: Region[] = [
  { key: 'seoul', sidos: ['서울특별시'], label: { ko: '서울', en: 'Seoul', ja: 'ソウル', th: 'โซล' } },
  {
    key: 'gyeonggi',
    sidos: ['경기도', '인천광역시'],
    label: { ko: '경기·인천', en: 'Gyeonggi & Incheon', ja: '京畿・仁川', th: 'คยองกี·อินชอน' },
  },
  { key: 'gangwon', sidos: ['강원특별자치도'], label: { ko: '강원', en: 'Gangwon', ja: '江原', th: 'คังวอน' } },
  {
    key: 'chungcheong',
    sidos: ['충청북도', '충청남도', '대전광역시', '세종특별자치시'],
    label: { ko: '충청', en: 'Chungcheong', ja: '忠清', th: 'ชุงชอง' },
  },
  {
    key: 'jeolla',
    sidos: ['전북특별자치도', '전라남도', '광주광역시'],
    label: { ko: '전라', en: 'Jeolla', ja: '全羅', th: 'ชอลลา' },
  },
  {
    key: 'gyeongsang',
    sidos: ['경상북도', '경상남도', '부산광역시', '대구광역시', '울산광역시'],
    label: { ko: '경상', en: 'Gyeongsang', ja: '慶尚', th: 'คยองซัง' },
  },
  { key: 'jeju', sidos: ['제주특별자치도'], label: { ko: '제주', en: 'Jeju', ja: '済州', th: 'เชจู' } },
]

export const regionOf = (sido?: string | null) => (sido ? (REGIONS.find((r) => r.sidos.includes(sido)) ?? null) : null)

/** 월 표기 — 태국어·일본어는 숫자+단위가 자연스럽다 */
export function monthLabel(m: number, lang: Lang): string {
  if (lang === 'ko') return `${m}월`
  if (lang === 'ja') return `${m}月`
  // 태국어는 관용 약칭을 쓴다.
  //
  // 'เดือน N'(=「달 1」)은 태국어에서 날짜를 부르는 방식이 아니고, 글자도 길어
  // 1280px에서 칩 줄이 267px 넘쳐 10·11·12월을 누를 방법이 없었다(2026-08-23 점검).
  if (lang === 'th') return ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1] ?? String(m)
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? String(m)
}
