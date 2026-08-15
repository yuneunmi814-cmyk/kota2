import type { RawFestival } from '../lib/types.js'
import { getJson, serviceKey, sleep, todayKst } from '../lib/http.js'

// 전국문화축제표준데이터(공공데이터포털) — 지자체가 직접 등록. 소규모 축제까지 있다.
// 이미지 필드가 없어 이미지 보유율은 병합 후 kfes/TourAPI로 채워야 한다.
// 종료된 것도 다 주므로 오늘 이후로 걸러 받는다.

const BASE = 'https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api'

interface Item {
  fstvlNm?: string
  fstvlStartDate?: string
  fstvlEndDate?: string
  fstvlCo?: string // 내용
  opar?: string // 개최장소
  rdnmadr?: string
  lnmadr?: string
  latitude?: string
  longitude?: string
  phoneNumber?: string
  homepageUrl?: string
  insttNm?: string
}
// 이 API는 봉투에 response 래퍼가 없다 — { header, body } 바로 온다(실측)
interface Env {
  header?: { resultCode?: string; resultMsg?: string }
  body?: { totalCount?: number; items?: Item[] | { item?: Item[] } }
}

const SIDO_RE = /^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s*(\S+)?/

export async function fetchStdfest(): Promise<RawFestival[]> {
  const today = todayKst()
  const out: RawFestival[] = []
  const rows = 1000
  let page = 1
  let total = Infinity
  while ((page - 1) * rows < total) {
    const url = `${BASE}?serviceKey=${serviceKey()}&pageNo=${page}&numOfRows=${rows}&type=json`
    const j = await getJson<Env>(url)
    const code = j.header?.resultCode
    if (code && code !== '00') throw new Error(`표준데이터: ${j.header?.resultMsg ?? code}`)
    total = j.body?.totalCount ?? 0
    const raw = j.body?.items
    const items: Item[] = Array.isArray(raw) ? raw : (raw?.item ?? [])
    for (const it of items) {
      const name = it.fstvlNm?.trim()
      const s = it.fstvlStartDate?.slice(0, 10)
      const e = it.fstvlEndDate?.slice(0, 10)
      if (!name || !s || !e || e < today) continue
      const addr = (it.rdnmadr || it.lnmadr || '').trim()
      const m = addr.match(SIDO_RE)
      const lat = parseFloat(it.latitude ?? '')
      const lng = parseFloat(it.longitude ?? '')
      // 이 API엔 고유 id가 없다 → 이름+시작일로 안정적인 키를 만든다
      const key = `${name}-${s}`.replace(/\s+/g, '').slice(0, 80)
      out.push({
        externalId: `stdfest:${key}`,
        source: 'stdfest',
        name,
        startDate: s,
        endDate: e,
        sido: m?.[1]?.replace('강원도', '강원특별자치도').replace('전라북도', '전북특별자치도') ?? null,
        sigungu: m?.[2] ?? null,
        address: addr || null,
        lat: Number.isFinite(lat) && lat > 30 ? lat : null,
        lng: Number.isFinite(lng) && lng > 120 ? lng : null,
        summary: it.fstvlCo?.trim() || null,
        homepage: it.homepageUrl?.trim() || null,
        tel: it.phoneNumber?.trim() || null,
      })
    }
    if (items.length === 0) break
    page += 1
    await sleep(150)
  }
  return out
}
