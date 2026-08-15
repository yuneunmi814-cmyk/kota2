// 소스에서 막 긁어온 원본 한 건 — 병합 전 형태.
// 소스마다 필드 이름이 다르므로 여기서 한 번 통일하고, 없는 값은 null로 둔다.
export interface RawFestival {
  /** 예: 'kfes:4098571' — 소스 접두사 + 그 소스의 고유 id */
  externalId: string
  source: 'kfes' | 'tourapi' | 'mcst' | 'stdfest' | 'manual'
  /** 다른 소스와 이어 붙일 열쇠 — TourAPI contentid가 있으면 채운다 */
  tourapiId?: string | null
  name: string
  startDate: string // YYYY-MM-DD
  endDate: string
  sido?: string | null
  sigungu?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  imageUrl?: string | null
  /** 산문 개요 — kfes가 준다. 다른 소스는 '공연+체험' 같은 조각뿐 */
  summary?: string | null
  /** 프로그램·요금·예약 등 상세 — 있는 소스만 */
  program?: string | null
  fee?: string | null
  homepage?: string | null
  instagram?: string | null
  youtube?: string | null
  tel?: string | null
  /** 문체부 유형 코드 등 — 테마 분류 힌트 */
  category?: string | null
}

/** 병합 후 사이트가 읽는 최종 형태 */
export interface Festival extends RawFestival {
  /** 이 축제를 구성한 소스들 — 디버깅·출처 표기용 */
  sources: string[]
  themes: string[]
  popularity: number
  translations: { langCode: 'en' | 'ja' | 'th'; name: string; summary: string | null; placeName: string | null }[]
}
