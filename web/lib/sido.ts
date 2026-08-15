import type { Lang } from './i18n'

// 시·도 표기 — 데이터의 정식 명칭(festivals.sido)을 키로 쓴다.
//
// 화면에는 짧은 이름을 쓴다: '강원특별자치도'를 그대로 칩에 넣으면 줄이 밀린다.
// 외국어는 로마자·한자·태국문자 관용 표기를 따른다(현지에서 길을 물을 수 있어야 한다).

const M: Record<string, Record<Lang, string>> = {
  서울특별시: { ko: '서울', en: 'Seoul', ja: 'ソウル', th: 'โซล' },
  부산광역시: { ko: '부산', en: 'Busan', ja: '釜山', th: 'ปูซาน' },
  대구광역시: { ko: '대구', en: 'Daegu', ja: '大邱', th: 'แทกู' },
  인천광역시: { ko: '인천', en: 'Incheon', ja: '仁川', th: 'อินชอน' },
  광주광역시: { ko: '광주', en: 'Gwangju', ja: '光州', th: 'ควังจู' },
  대전광역시: { ko: '대전', en: 'Daejeon', ja: '大田', th: 'แทจอน' },
  울산광역시: { ko: '울산', en: 'Ulsan', ja: '蔚山', th: 'อุลซาน' },
  세종특별자치시: { ko: '세종', en: 'Sejong', ja: '世宗', th: 'เซจง' },
  경기도: { ko: '경기', en: 'Gyeonggi', ja: '京畿', th: 'คยองกี' },
  강원특별자치도: { ko: '강원', en: 'Gangwon', ja: '江原', th: 'คังวอน' },
  충청북도: { ko: '충북', en: 'Chungbuk', ja: '忠清北', th: 'ชุงบุก' },
  충청남도: { ko: '충남', en: 'Chungnam', ja: '忠清南', th: 'ชุงนัม' },
  전북특별자치도: { ko: '전북', en: 'Jeonbuk', ja: '全羅北', th: 'ชอนบุก' },
  전라남도: { ko: '전남', en: 'Jeonnam', ja: '全羅南', th: 'ชอนนัม' },
  경상북도: { ko: '경북', en: 'Gyeongbuk', ja: '慶尚北', th: 'คยองบุก' },
  경상남도: { ko: '경남', en: 'Gyeongnam', ja: '慶尚南', th: 'คยองนัม' },
  제주특별자치도: { ko: '제주', en: 'Jeju', ja: '済州', th: 'เชจู' },
}

export const sidoLabel = (sido: string, lang: Lang) => M[sido]?.[lang] ?? sido

/** 월 표기 — 태국어·일본어는 숫자+단위가 자연스럽다 */
export function monthLabel(m: number, lang: Lang): string {
  if (lang === 'ko') return `${m}월`
  if (lang === 'ja') return `${m}月`
  if (lang === 'th') return `เดือน ${m}`
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] ?? String(m)
}
