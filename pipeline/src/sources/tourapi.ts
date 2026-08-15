import type { RawFestival } from '../lib/types.js'
import { getJson, serviceKey, sleep, ymd, todayKst } from '../lib/http.js'

// TourAPI searchFestival2 — 공식 API. 이미지 100%, 좌표 100%.
//
// kfes와 같은 CMS라 contentid == kfes.cmsCntntsId. kfes가 615건을 큐레이션으로 고른 것이고,
// 이쪽은 등록된 축제 전부라 커버리지가 다르다. 둘 다 받아 병합 단계에서 합친다.
//
// eventStartDate는 '이 날짜 이후 개최·진행'이라 오늘로 넣으면 지금 하는 것과 앞으로 할 것이 온다.
// 이전 구현 메모: 구형 areaCode 파라미터는 결과가 크게 빠진다(서울 2건 vs 99건). 안 쓴다.

const BASE = 'https://apis.data.go.kr/B551011/KorService2'

interface Item {
  contentid: string
  title: string
  eventstartdate?: string
  eventenddate?: string
  addr1?: string
  addr2?: string
  areacode?: string
  sigungucode?: string
  firstimage?: string
  firstimage2?: string
  mapx?: string
  mapy?: string
  tel?: string
}

interface Env {
  response?: { body?: { totalCount?: number; items?: '' | { item?: Item | Item[] } } }
}

// 지역 코드 → 시·도명. TourAPI areacode 기준(정식 명칭은 병합 단계에서 맞춘다)
const AREA: Record<string, string> = {
  '1': '서울특별시', '2': '인천광역시', '3': '대전광역시', '4': '대구광역시', '5': '광주광역시',
  '6': '부산광역시', '7': '울산광역시', '8': '세종특별자치시', '31': '경기도', '32': '강원특별자치도',
  '33': '충청북도', '34': '충청남도', '35': '경상북도', '36': '경상남도', '37': '전북특별자치도',
  '38': '전라남도', '39': '제주특별자치도',
}

export async function fetchTourapi(): Promise<RawFestival[]> {
  const from = todayKst().replace(/-/g, '')
  const out: RawFestival[] = []
  const seen = new Set<string>()
  const rows = 100
  let page = 1
  let total = Infinity
  while ((page - 1) * rows < total) {
    const url =
      `${BASE}/searchFestival2?serviceKey=${serviceKey()}&MobileOS=ETC&MobileApp=KOTA&_type=json` +
      `&eventStartDate=${from}&arrange=A&numOfRows=${rows}&pageNo=${page}`
    const j = await getJson<Env>(url)
    total = j.response?.body?.totalCount ?? 0
    const raw = j.response?.body?.items
    const items = raw && typeof raw === 'object' ? (Array.isArray(raw.item) ? raw.item : raw.item ? [raw.item] : []) : []
    for (const it of items) {
      if (!it.contentid || seen.has(it.contentid)) continue
      seen.add(it.contentid)
      const lat = parseFloat(it.mapy ?? '')
      const lng = parseFloat(it.mapx ?? '')
      out.push({
        externalId: `tourapi:${it.contentid}`,
        source: 'tourapi',
        tourapiId: it.contentid,
        name: it.title.trim(),
        startDate: ymd(it.eventstartdate),
        endDate: ymd(it.eventenddate),
        sido: it.areacode ? (AREA[it.areacode] ?? null) : null,
        sigungu: null, // addr1에서 병합 단계가 뽑는다
        address: [it.addr1, it.addr2].filter(Boolean).join(' ').trim() || null,
        lat: Number.isFinite(lat) && lat > 30 ? lat : null,
        lng: Number.isFinite(lng) && lng > 120 ? lng : null,
        imageUrl: it.firstimage || it.firstimage2 || null,
        tel: it.tel?.trim() || null,
      })
    }
    if (items.length === 0) break
    page += 1
    await sleep(150)
  }
  return out
}
