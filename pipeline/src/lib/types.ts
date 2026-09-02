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
  /** 이미지 출처 — 'past'면 같은 축제의 지난 회차 포스터(TourAPI 검색으로 보강). 화면에서 표시한다 */
  imageFrom?: 'own' | 'past' | 'scraped' | null
  /** 주최측·지자체 홈페이지에서 가져온 경우 그 출처 페이지 URL — 화면에 링크로 표기한다 */
  imageSource?: string | null
  /** 산문 개요 — kfes가 준다. 다른 소스는 '공연+체험' 같은 조각뿐 */
  summary?: string | null
  /** 프로그램·요금·예약 등 상세 — 있는 소스만 */
  program?: string | null
  /** 출연 라인업.
   *
   * 공공 API에는 없다(TourAPI·문화포털 모두). 그런데 음악 페스티벌에서 사람들이
   * 가장 먼저 찾는 게 '누가 나오는가'다. 라인업 없는 자라섬재즈 페이지는 예매처보다
   * 못하다. program 에 섞으면 묻히므로 따로 둔다. */
  lineup?: string | null
  fee?: string | null
  homepage?: string | null
  instagram?: string | null
  youtube?: string | null
  tel?: string | null
  /** 주최·주관 */
  organizer?: string | null
  /** 먹거리 부스 — kfes boothInfoList. 부스별 메뉴·가격(원). 외국인 여행자에게 '얼마인지'가 핵심 */
  booths?: { name: string; menu: { name: string; price: number | null }[] }[] | null
  /** TourAPI detailImage2 사진 갤러리. 전부 공공누리 3유형(출처표시·변경금지) */
  photos?: { url: string; thumb: string; name: string }[] | null
  /** 포스터가 없을 때 쓰는 지역 사진(관광공사 포토코리아, 공공누리 1유형). 포스터가 아님을 화면에 밝힌다 */
  regionPhoto?: { url: string; title: string; photographer: string } | null
  /** kfes 운영 메모 '먹거리 내용은 전년도 것' — 개요에서 떼어 먹거리 섹션에 표시한다 */
  boothsFromPastEdition?: boolean
  /** 관람 가능 연령·운영 시간(있는 것만) */
  ageInfo?: string | null
  hours?: string | null
  /** kfes fstvlClCd — 'MF'면 문체부 지정 문화관광축제(관광공사 인증). 그 외 유형 코드 힌트 */
  category?: string | null
}

/** 병합 후 사이트가 읽는 최종 형태 */
export interface Festival extends RawFestival {
  /** 이 축제를 구성한 소스들 — 디버깅·출처 표기용 */
  sources: string[]
  /** 병합에 참여한 모든 출처의 실제 ID. 영속 ID 재사용의 근거로 쓴다. */
  sourceIds?: string[]
  themes: string[]
  popularity: number
  /** 관광빅데이터 — 지난 회차 축제 기간 개최지 외지인 방문자 피크 ÷ 전후 4주 같은 요일 중앙값 */
  visitorLift?: number | null
  translations: { langCode: 'en' | 'ja' | 'th'; name: string; summary: string | null; placeName: string | null }[]
}
