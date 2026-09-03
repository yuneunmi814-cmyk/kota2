'use client'
import { useEffect, useRef, useState } from 'react'
import { requestPosition } from './geo'
import type { ListPeriod, ListSort } from './listData'
import type { Theme } from './themes'

// 목록 화면이 들고 다니는 상태 — 주소·스크롤·위치.
//
// 이 셋은 '무엇을 보여줄지'와 무관하다. 필터가 몇 건을 남기는지, 카드를 어떻게 그리는지와
// 별개로 브라우저와 주고받는 일이다. 그런데 FestivalList 한 파일에 함께 있어서, 카드 한 줄을
// 고치려 해도 스크롤 복원과 위치 권한 코드를 지나가야 했다. 여기로 떼어 낸다.
//
// 주석은 그대로 옮겼다. 전부 실제로 겪은 버그의 기록이라 지우면 같은 실수를 다시 한다.

export interface ListParams {
  period: ListPeriod
  region: string | null
  sido: string | null
  theme: Theme | null
  sort: ListSort
  q: string
  graded: boolean
  page: number
}

export interface ListParamsApi extends ListParams {
  setPeriod: (v: ListPeriod) => void
  setRegion: (v: string | null) => void
  setSido: (v: string | null) => void
  setTheme: (v: Theme | null) => void
  setSort: (v: ListSort) => void
  setQ: (v: string) => void
  setGraded: (v: boolean) => void
  setPage: (v: number | ((n: number) => number)) => void
  /** 주소를 읽어 상태에 반영한 뒤 true. 이 전에는 주소를 되쓰지 않는다 */
  ready: boolean
}

/**
 * 목록의 상태는 URL에 산다.
 *
 * 이전에는 전부 useState 안에만 있었다. 그래서 더보기를 세 번 눌러 96건을 펼치고 상세에
 * 들어갔다 돌아오면 24건으로 되돌아갔다 — 424건을 24개씩 보려면 17번 눌러야 하는데 상세를
 * 한 번 열면 원점이니 뒷부분 축제는 사실상 도달할 수 없었다(BUG-14). 필터도 마찬가지로
 * 주소에 안 남아 공유도 새로고침도 불가능했다(BUG-16).
 *
 * 주소를 고치는 데 next의 router가 아니라 history.replaceState를 쓴다.
 *
 * router.replace를 썼더니 이 컴포넌트가 다시 마운트되면서 방금 올린 page가 초기값으로
 * 되돌아갔다 — 더보기를 눌러도 24장 그대로였다. 라우터를 거치면 Suspense 경계가 다시
 * 걸리기 때문이다. history.replaceState는 리액트를 건드리지 않고 주소만 바꾼다.
 *
 * push가 아니라 replace인 이유는 따로다. 칩을 열 번 눌렀다고 뒤로가기를 열 번 해야
 * 목록을 빠져나가는 것은 고치려던 문제만큼이나 성가시다. replace여도 상세로 떠날 때
 * 그 시점의 주소가 히스토리에 남으므로, 돌아오면 펼친 상태 그대로 복원된다.
 */
export function useListParams(initial: {
  period: ListPeriod
  region: string | null
  theme: Theme | null
  sort: ListSort
  q: string
  graded: boolean
}): ListParamsApi {
  const [period, setPeriod] = useState<ListPeriod>(initial.period)
  const [region, setRegion] = useState<string | null>(initial.region)
  const [graded, setGraded] = useState(initial.graded)
  const [sido, setSido] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme | null>(initial.theme)
  const [sort, setSort] = useState<ListSort>(initial.sort)
  const [q, setQ] = useState(initial.q)
  const [page, setPage] = useState(1)

  // 주소는 마운트한 뒤에 읽는다.
  //
  // useSearchParams()로 초기값을 잡으려다 실패했다. 이 페이지들은 정적으로 구워져 나가는데,
  // 그때도 하이드레이션 첫 렌더에도 useSearchParams()는 빈 값을 준다(서버가 만든 HTML과
  // 맞추려고 그렇게 동작한다). 그래서 ?page=3으로 들어와도 초기값이 늘 1이었다.
  // window.location은 그런 사정이 없으므로 여기서 직접 읽는다.
  // ref가 아니라 state다.
  //
  // ref로 하면 이 효과가 자기 커밋 안에서 곧바로 true가 되어, 같은 커밋에서 뒤따라 도는
  // 효과들이 '주소를 읽었다'고 믿으면서도 아직 반영 안 된 옛 상태를 본다. 그래서 주소를
  // 되레 지워 쓰고, 필터가 바뀐 것으로 오인해 page를 1로 되돌렸다 — ?page=3&region=seoul로
  // 들어오면 region만 살고 page는 사라졌다.
  //
  // state면 setReady가 다른 값들과 한 번에 반영되므로, 뒤 효과들은 전부 반영된 뒤에 처음 돈다.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const u = new URLSearchParams(window.location.search)
    const pv = u.get('period')
    if (pv) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소는 서버에 없다. 렌더 중에 읽으면 하이드레이션이 어긋난다(위 주석 참고).
      if (pv === 'ongoing' || pv === 'upcoming' || pv === 'weekend' || pv === 'all') setPeriod(pv)
      else {
        const n = Number(pv)
        if (Number.isInteger(n) && n >= 1 && n <= 12) setPeriod(n)
      }
    }
    if (u.get('region')) setRegion(u.get('region'))
    if (u.get('sido')) setSido(u.get('sido'))
    if (u.get('theme')) setTheme(u.get('theme') as Theme)
    if (u.get('sort')) setSort(u.get('sort') as ListSort)
    if (u.get('graded') === '1') setGraded(true)
    if (u.get('q')) setQ(u.get('q')!)
    const pg = Number(u.get('page'))
    if (Number.isInteger(pg) && pg > 1) setPage(pg)
    setReady(true)
  }, [])

  // 상태 → 주소. 기본값은 적지 않는다 — 주소가 길어지면 공유할 때 겁을 준다.
  useEffect(() => {
    if (!ready) return
    const p = new URLSearchParams()
    if (period !== 'all') p.set('period', String(period))
    if (region) p.set('region', region)
    if (sido) p.set('sido', sido)
    if (theme) p.set('theme', theme)
    if (graded) p.set('graded', '1')
    if (sort !== 'date') p.set('sort', sort)
    if (q.trim()) p.set('q', q.trim())
    if (page > 1) p.set('page', String(page))
    const qs = p.toString()
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next)
  }, [ready, period, region, sido, theme, graded, sort, q, page])

  // 필터를 바꾸면 첫 장으로. 5페이지를 보다 다른 지역을 고르면 결과가 24건뿐일 수도 있다.
  //
  // 첫 렌더는 건너뛴다 — 주소에 page=4가 실려 들어온 경우(상세에서 뒤로 온 경우)를
  // 초기화해 버리면 고치려던 버그를 그대로 다시 만드는 셈이다.
  const filterSig = JSON.stringify([period, region, sido, theme, graded, q.trim(), sort])
  const lastSig = useRef<string | null>(null)
  useEffect(() => {
    // 주소에서 읽어 넣는 동안에는 초기화하지 않는다 — ?page=4&region=seoul로 들어왔을 때
    // region이 반영되는 순간 page를 1로 되돌리면, 고치려던 버그를 그대로 다시 만든다.
    if (!ready) return
    if (lastSig.current === null) {
      lastSig.current = filterSig
      return
    }
    if (lastSig.current === filterSig) return
    lastSig.current = filterSig
    setPage(1)
  }, [ready, filterSig])

  return { period, region, sido, theme, sort, q, graded, page, setPeriod, setRegion, setSido, setTheme, setSort, setQ, setGraded, setPage, ready }
}

const SCROLL_KEY = 'kota_list_scroll'

/**
 * 상세에 갔다 돌아오면 보던 자리로.
 *
 * 주소에 page=N을 남겨 둔 덕에 카드 수와 필터는 복원된다. 그런데 그건 마운트 뒤 효과에서
 * 읽으므로, 브라우저가 스크롤을 되돌리려 할 때 화면에는 아직 첫 24장뿐이다. 되돌릴 자리가
 * 문서 높이를 넘으니 끝까지 내려가다 만다 — 모바일에서 31250px이 3183px이 됐다(BUG-10,
 * 2026-08-23). 90%를 잃으니 사실상 맨 위다.
 *
 * 그래서 우리가 직접 기억한다. 아무 때나 되돌리면 안 된다 — 홈에서 목록으로 새로 들어온
 * 사람까지 지난번 자리로 끌어내리면 그건 다른 버그다. 카드를 눌러 상세로 떠날 때만 적고,
 * 돌아와 그 주소가 그대로일 때 한 번 쓰고 지운다.
 *
 * @param ready 주소를 다 읽은 뒤에만 되돌린다. 그 전에는 문서가 아직 짧다.
 */
export function useScrollMemory(ready: boolean): { rememberScroll: () => void; farDown: boolean } {
  const rememberScroll = () => {
    try {
      sessionStorage.setItem(
        SCROLL_KEY,
        JSON.stringify({ at: window.location.pathname + window.location.search, y: window.scrollY }),
      )
    } catch {
      // 스토리지가 막혀 있으면 그냥 위에서 시작한다
    }
  }

  const restored = useRef(false)
  useEffect(() => {
    if (!ready || restored.current) return
    restored.current = true
    let saved: { at?: string; y?: number } | null = null
    try {
      saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null')
      sessionStorage.removeItem(SCROLL_KEY) // 한 번만 쓴다
    } catch {
      return
    }
    if (!saved?.y || saved.at !== window.location.pathname + window.location.search) return
    const y = saved.y
    // 카드가 실제로 그려진 다음 프레임에 옮긴다 — 그 전에는 문서가 아직 짧다
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)))
  }, [ready])

  // 맨 위·맨 아래 — 목록이 35,000px(≈42화면)까지 길어진다.
  // 손가락으로 그만큼 쓸어 올리는 것은 이동이 아니라 노동이다.
  const [farDown, setFarDown] = useState(false)
  useEffect(() => {
    const onScroll = () => setFarDown(window.scrollY > 1200)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { rememberScroll, farDown }
}

/**
 * 거리순을 고르면 그때 위치를 묻는다 — 목록에서까지 진입 즉시 물으면 성가시다.
 *
 * 실패하면 전에는 말없이 날짜순으로 되돌렸다. 고른 것이 저 혼자 풀리는데 이유는
 * 어디에도 없어서, 쓰는 사람 눈에는 버튼이 안 먹는 것으로 보였다. 이유를 남긴다.
 *
 * @param onDeny 위치를 못 받았을 때 정렬을 되돌리는 쪽에 알린다.
 */
export function useDistanceCoords(
  sort: ListSort,
  onDeny: () => void,
): { coords: { lat: number; lng: number } | null; geoNote: string | null } {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoNote, setGeoNote] = useState<string | null>(null)

  // onDeny를 아래 효과의 의존성에 넣으면, 부모가 렌더할 때마다 새 함수가 만들어져 위치를
  // 다시 묻게 된다. ref에 최신 것만 담아 두고 효과는 sort·coords만 본다.
  // 대입은 렌더 중이 아니라 효과에서 한다 — 렌더 중에 ref를 건드리면 리액트가 화면을
  // 다시 그릴 때 값이 어긋날 수 있다.
  const deny = useRef(onDeny)
  useEffect(() => {
    deny.current = onDeny
  })

  useEffect(() => {
    if (sort !== 'distance' || coords) return
    let alive = true
    void (async () => {
      const r = await requestPosition()
      if (!alive) return
      if (r.k === 'ok') {
        setCoords(r.coords)
        setGeoNote(null)
      } else {
        deny.current()
        setGeoNote(r.k === 'blocked' ? 'list.distanceBlocked' : 'nearby.unavailable')
      }
    })()
    return () => {
      alive = false
    }
  }, [sort, coords])

  return { coords, geoNote }
}
