// 공공 API 호출 공통 — 쿼터 소진을 '정상처럼 보이는 빈 응답'으로 넘기지 않는다.
//
// TourAPI는 일일 한도를 넘기면 200 OK로 XML 오류나 JSON 게이트 봉투(코드 22)를 준다.
// 이걸 빈 결과로 처리하면 그날 수집이 0건인데 성공한 것처럼 보인다(이전에 실제로 겪었다).

export class QuotaError extends Error {}

export async function getJson<T>(url: string, opts: { headers?: Record<string, string> } = {}): Promise<T> {
  const res = await fetch(url, { headers: opts.headers })
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    // XML 오류 봉투 — 서비스키 오류·쿼터 소진
    const code = text.match(/<returnReasonCode>(\d+)<\/returnReasonCode>/)?.[1]
    const msg = text.match(/<returnAuthMsg>([^<]+)</)?.[1] ?? text.match(/<errMsg>([^<]+)</)?.[1] ?? ''
    if (code === '22' || /LIMITED/i.test(msg)) throw new QuotaError(`쿼터 소진: ${msg}`)
    throw new Error(`XML 오류 응답 (${code ?? res.status}): ${msg || text.slice(0, 120)}`)
  }
  let j: unknown
  try {
    j = JSON.parse(text)
  } catch {
    throw new Error(`JSON 아님 (${res.status}): ${text.slice(0, 120)}`)
  }
  // JSON 게이트 봉투 — { OpenAPI_ServiceResponse: { cmmMsgHeader: { returnReasonCode: '22' } } }
  const gate = (j as { OpenAPI_ServiceResponse?: { cmmMsgHeader?: { returnReasonCode?: string; errMsg?: string } } })
    .OpenAPI_ServiceResponse?.cmmMsgHeader
  if (gate) {
    if (gate.returnReasonCode === '22') throw new QuotaError(`쿼터 소진: ${gate.errMsg ?? ''}`)
    throw new Error(`게이트 오류 (${gate.returnReasonCode}): ${gate.errMsg ?? ''}`)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`)
  return j as T
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function serviceKey(): string {
  const k = process.env.TOURAPI_SERVICE_KEY
  if (!k) throw new Error('TOURAPI_SERVICE_KEY 없음 — pipeline/.env 확인')
  return k
}

/** YYYYMMDD → YYYY-MM-DD */
export const ymd = (s?: string | null) =>
  s && /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : (s ?? '')

/** 오늘(KST) YYYY-MM-DD */
export const todayKst = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
