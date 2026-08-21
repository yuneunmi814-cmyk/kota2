'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { requestPosition } from '../lib/geo'
import Link from 'next/link'
import { defaultOrder, type ListItem } from '@/lib/listData'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { monthLabel, REGIONS, sidoLabel } from '@/lib/sido'
import { THEMES, themeLabel, type Theme } from '@/lib/themes'
import { distanceKm } from '@/lib/festivals'
import { track } from '@/lib/track'
import Icon from './Icon'
import Poster from './Poster'
import DayBadgeChip from './DayBadge'
import { toSlug } from '@/lib/slug'

// 축제 목록 — 시기 × 지역 × 목적 3축 필터와 3정렬.
//
// 정적 사이트라 필터는 전부 브라우저에서 돈다. 715건은 클라이언트에서 걸러도
// 체감 지연이 없고, 서버가 없으니 콜드 스타트도 없다.
//
// '시기'를 첫 축으로 둔 이유: 축제는 '언제 하느냐'가 갈 수 있냐를 결정한다.
// 지역부터 고르게 하면 이미 끝난 축제를 한참 보다가 돌아 나온다.

type Period = 'all' | 'ongoing' | 'upcoming' | 'weekend' | number // number = 월(1~12)
type Sort = 'date' | 'distance' | 'popularity'
const PAGE = 24

const fmt = (d: string) => d.slice(5).replace('-', '.')

/** 이번 주말(토·일) — 오늘이 일요일이면 오늘, 아니면 돌아오는 토·일. 홈 배너와 같은 규칙 */
function thisWeekend(): [string, string] {
  const now = Date.now()
  const day = 86_400_000
  const dow = new Date().getUTCDay()
  const off = dow === 0 ? 0 : 6 - dow
  return [
    new Date(now + off * day).toISOString().slice(0, 10),
    new Date(now + (off + (dow === 0 ? 0 : 1)) * day).toISOString().slice(0, 10),
  ]
}

export default function FestivalList({
  items,
  lang,
  initialSort = 'date',
  initialTheme = null,
  initialQuery = '',
  initialRegion = null,
  initialGraded = false,
  initialPeriod = 'all',
}: {
  items: ListItem[]
  lang: Lang
  initialSort?: Sort
  initialTheme?: Theme | null
  initialQuery?: string
  initialRegion?: string | null
  initialGraded?: boolean
  initialPeriod?: Period
}) {
  // 목록의 상태는 URL에 산다.
  //
  // 이전에는 전부 useState 안에만 있었다. 그래서 더보기를 세 번 눌러 96건을 펼치고 상세에
  // 들어갔다 돌아오면 24건으로 되돌아갔다 — 424건을 24개씩 보려면 17번 눌러야 하는데 상세를
  // 한 번 열면 원점이니 뒷부분 축제는 사실상 도달할 수 없었다(BUG-14). 필터도 마찬가지로
  // 주소에 안 남아 공유도 새로고침도 불가능했다(BUG-16).
  //
  // 주소를 고치는 데 next의 router가 아니라 history.replaceState를 쓴다.
  //
  // router.replace를 썼더니 이 컴포넌트가 다시 마운트되면서 방금 올린 page가 초기값으로
  // 되돌아갔다 — 더보기를 눌러도 24장 그대로였다. 라우터를 거치면 Suspense 경계가 다시
  // 걸리기 때문이다. history.replaceState는 리액트를 건드리지 않고 주소만 바꾼다.
  //
  // push가 아니라 replace인 이유는 따로다. 칩을 열 번 눌렀다고 뒤로가기를 열 번 해야
  // 목록을 빠져나가는 것은 고치려던 문제만큼이나 성가시다. replace여도 상세로 떠날 때
  // 그 시점의 주소가 히스토리에 남으므로, 돌아오면 펼친 상태 그대로 복원된다.
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [region, setRegion] = useState<string | null>(initialRegion)
  const [graded, setGraded] = useState(initialGraded)
  const [sido, setSido] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme | null>(initialTheme)
  const [sort, setSort] = useState<Sort>(initialSort)
  const [q, setQ] = useState(initialQuery)
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
      if (pv === 'ongoing' || pv === 'upcoming' || pv === 'weekend' || pv === 'all') setPeriod(pv)
      else {
        const n = Number(pv)
        if (Number.isInteger(n) && n >= 1 && n <= 12) setPeriod(n)
      }
    }
    if (u.get('region')) setRegion(u.get('region'))
    if (u.get('sido')) setSido(u.get('sido'))
    if (u.get('theme')) setTheme(u.get('theme') as Theme)
    if (u.get('sort')) setSort(u.get('sort') as Sort)
    if (u.get('graded') === '1') setGraded(true)
    if (u.get('q')) setQ(u.get('q')!)
    const pg = Number(u.get('page'))
    if (Number.isInteger(pg) && pg > 1) setPage(pg)
    setReady(true)
  }, [])
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const shown = page * PAGE

  // 거리순을 고르면 그때 위치를 묻는다 — 목록에서까지 진입 즉시 물으면 성가시다.
  //
  // 실패하면 전에는 말없이 날짜순으로 되돌렸다. 고른 것이 저 혼자 풀리는데 이유는
  // 어디에도 없어서, 쓰는 사람 눈에는 버튼이 안 먹는 것으로 보였다. 이유를 남긴다.
  const [geoNote, setGeoNote] = useState<string | null>(null)
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
        setSort('date')
        setGeoNote(r.k === 'blocked' ? 'list.distanceBlocked' : 'nearby.unavailable')
      }
    })()
    return () => {
      alive = false
    }
  }, [sort, coords])

  const list = useMemo(() => {
    let out = items.filter((f) => f.st !== 'ended')

    if (period === 'ongoing') out = out.filter((f) => f.st === 'ongoing' && !f.al)
    else if (period === 'upcoming') out = out.filter((f) => f.st === 'upcoming')
    else if (period === 'weekend') {
      const [sat, sun] = thisWeekend()
      out = out.filter((f) => f.s <= sun && f.e >= sat && !f.al)
    } else if (typeof period === 'number') out = out.filter((f) => f.m.includes(period) && !f.al)

    if (sido) out = out.filter((f) => f.sd === sido)
    else if (region) {
      const rs = REGIONS.find((r) => r.key === region)?.sidos ?? []
      out = out.filter((f) => f.sd != null && rs.includes(f.sd))
    }
    if (theme) out = out.filter((f) => f.th.includes(theme))
    if (graded) out = out.filter((f) => f.mf)

    const needle = q.trim().toLowerCase()
    if (needle) out = out.filter((f) => `${f.n} ${f.p ?? ''}`.toLowerCase().includes(needle))

    const withKm =
      sort === 'distance' && coords
        ? out.map((f) => ({
            f,
            km: f.lat != null && f.lng != null ? distanceKm(coords, { lat: f.lat, lng: f.lng }) : null,
          }))
        : out.map((f) => ({ f, km: null as number | null }))

    if (sort === 'distance' && coords) withKm.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity))
    else if (sort === 'popularity') withKm.sort((a, b) => b.f.pop - a.f.pop)
    // 날짜순 — '가까운 날짜' 순(lib/listData의 defaultOrder와 같은 규칙, 서버 fallback과 일치시킨다)
    else {
      const order = new Map(defaultOrder(withKm.map((x) => x.f)).map((f, i) => [f.k, i]))
      withKm.sort((a, b) => (order.get(a.f.k) ?? 0) - (order.get(b.f.k) ?? 0))
    }

    return withKm
  }, [items, period, region, sido, theme, graded, q, sort, coords])

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

  // 검색어 — 타이핑이 멎고 800ms 뒤에 한 번만 남긴다. 글자마다 남기면 '강','강릉','강릉불'이
  // 전부 쌓여 무엇을 찾았는지 알 수 없게 된다. 결과 수도 함께 남겨서 '찾았는데 없더라'를 본다.
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) return
    const id = setTimeout(() => track('search', { payload: { q: needle, results: list.length }, lang }), 800)
    return () => clearTimeout(id)
  }, [q, list.length, lang])

  // 필터 — 무엇으로 좁히는지. 아무것도 안 걸린 기본 상태는 남기지 않는다.
  useEffect(() => {
    if (!region && !sido && !theme && period === 'all') return
    track('filter', { payload: { region, sido, theme, period }, lang })
  }, [region, sido, theme, period, lang])

  // 시기 필터가 걸리면 지역 개수도 따라 줄어야 한다 — 눌렀을 때 나오는 건수와 칩의 숫자가 어긋나면
  // 사용자는 숫자를 못 믿는다
  const countBySido = useMemo(() => {
    let base = items.filter((f) => f.st !== 'ended')
    if (period === 'ongoing') base = base.filter((f) => f.st === 'ongoing' && !f.al)
    else if (period === 'upcoming') base = base.filter((f) => f.st === 'upcoming')
    else if (period === 'weekend') {
      const [sat, sun] = thisWeekend()
      base = base.filter((f) => f.s <= sun && f.e >= sat && !f.al)
    } else if (typeof period === 'number') base = base.filter((f) => f.m.includes(period) && !f.al)
    const m = new Map<string, number>()
    for (const f of base) if (f.sd) m.set(f.sd, (m.get(f.sd) ?? 0) + 1)
    return [...m.entries()].map(([sido, count]) => ({ sido, count })).sort((a, b) => b.count - a.count)
  }, [items, period])

  // 테마 칩의 근거가 되는 목록 — 테마만 빼고 지금 걸린 조건을 전부 적용한 것.
  const baseForTheme = useMemo(() => {
    let out = items.filter((f) => f.st !== 'ended')
    if (period === 'ongoing') out = out.filter((f) => f.st === 'ongoing' && !f.al)
    else if (period === 'upcoming') out = out.filter((f) => f.st === 'upcoming')
    else if (period === 'weekend') {
      const [sat, sun] = thisWeekend()
      out = out.filter((f) => f.s <= sun && f.e >= sat && !f.al)
    } else if (typeof period === 'number') out = out.filter((f) => f.m.includes(period) && !f.al)
    if (sido) out = out.filter((f) => f.sd === sido)
    else if (region) {
      const rs = REGIONS.find((r) => r.key === region)?.sidos ?? []
      out = out.filter((f) => f.sd != null && rs.includes(f.sd))
    }
    if (graded) out = out.filter((f) => f.mf)
    const needle = q.trim().toLowerCase()
    if (needle) out = out.filter((f) => `${f.n} ${f.p ?? ''}`.toLowerCase().includes(needle))
    return out
  }, [items, period, region, sido, graded, q])

  const subSidos = useMemo(() => {
    const rs = REGIONS.find((r) => r.key === region)?.sidos
    return rs ? countBySido.filter((x) => rs.includes(x.sido)) : []
  }, [countBySido, region])

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition ${
      on ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:border-brand/40 hover:text-brand'
    }`

  // 하위 칩은 한 단 낮은 위계로 — 권역 칩과 같은 무게면 어느 줄이 상위인지 읽히지 않는다
  const subChip = (on: boolean) =>
    `shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition ${
      on ? 'bg-brand-50 text-brand' : 'text-hint hover:text-brand'
    }`

  return (
    <div>
      {/* 검색 */}
      <div className="mb-5 flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-1 focus-within:border-brand">
        <Icon name="search" size={18} className="text-hint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(lang, 'search.placeholder')}
          className="min-w-0 flex-1 bg-transparent py-3 text-[15px] outline-none placeholder:text-hint"
        />
      </div>

      {/* 1축 — 시기. 축제는 '언제'가 먼저다 */}
      <div className="-mx-5 mb-3 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        <button className={chip(period === 'all')} onClick={() => setPeriod('all')}>
          {lang === 'ko' ? '전체' : lang === 'ja' ? 'すべて' : lang === 'th' ? 'ทั้งหมด' : 'All'}
        </button>
        <button className={chip(period === 'ongoing')} onClick={() => setPeriod('ongoing')}>
          {t(lang, 'status.ongoing')}
        </button>
        <button className={chip(period === 'upcoming')} onClick={() => setPeriod('upcoming')}>
          {t(lang, 'status.upcoming')}
        </button>
        <button className={chip(period === 'weekend')} onClick={() => setPeriod('weekend')}>
          {t(lang, 'row.weekend')}
        </button>
        <span className="mx-1 w-px shrink-0 self-stretch bg-line" />
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <button key={m} className={chip(period === m)} onClick={() => setPeriod(m)}>
            {monthLabel(m, lang)}
          </button>
        ))}
      </div>

      {/* 2축 — 지역. 권역을 먼저 고르고, 고른 권역 안에서만 시·도로 좁힌다 */}
      <div className="-mx-5 mb-3 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        <button
          className={chip(!region)}
          onClick={() => {
            setRegion(null)
            setSido(null)
          }}
        >
          {lang === 'ko' ? '전국' : lang === 'ja' ? '全国' : lang === 'th' ? 'ทั่วประเทศ' : 'Nationwide'}
        </button>
        {REGIONS.map((r) => {
          const n = countBySido.filter((x) => r.sidos.includes(x.sido)).reduce((s, x) => s + x.count, 0)
          if (n === 0) return null
          return (
            <button
              key={r.key}
              className={chip(region === r.key)}
              onClick={() => {
                setRegion(region === r.key ? null : r.key)
                setSido(null) // 권역을 바꾸면 이전 권역의 시·도 선택은 무의미하다
              }}
            >
              {r.label[lang]} <span className="ml-1 font-normal opacity-60">{n}</span>
            </button>
          )
        })}
      </div>

      {/* 고른 권역 안의 시·도 — 부산·제주처럼 그 자체가 목적지인 곳이 권역에 묻히지 않게 */}
      {subSidos.length > 1 && (
        <div className="-mx-5 mb-3 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
          <button className={subChip(!sido)} onClick={() => setSido(null)}>
            {lang === 'ko' ? '전체' : lang === 'ja' ? 'すべて' : lang === 'th' ? 'ทั้งหมด' : 'All'}
          </button>
          {subSidos.map(({ sido: s, count }) => (
            <button key={s} className={subChip(sido === s)} onClick={() => setSido(sido === s ? null : s)}>
              {sidoLabel(s, lang)} <span className="ml-1 font-normal opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* 3축 — 목적 */}
      <div className="-mx-5 mb-6 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {/* 테마를 푸는 칩. 시기·지역 줄에는 '전체'가 있는데 여기만 없어서, 한 번 고르면
            같은 칩을 다시 누르는 것 말고는 해제할 방법이 화면에 없었다(BUG-16) */}
        <button className={chip(!theme)} onClick={() => setTheme(null)}>
          {lang === 'ko' ? '전체' : lang === 'ja' ? 'すべて' : lang === 'th' ? 'ทั้งหมด' : 'All'}
          <span className="ml-1 font-normal opacity-60">{baseForTheme.length}</span>
        </button>
        {THEMES.map((k) => {
          // 개수는 '테마만 뺀 지금 조건'으로 센다 — 눌렀을 때 나오는 건수와 같아야 한다.
          //
          // 예전에는 지역만 반영하고 시기·등급·검색어를 빼먹어서, 결과가 1곳인데 하위 테마
          // 숫자의 합이 88로 나왔다(BUG-15). 숫자가 한 번 어긋나면 그다음부터는 아무도 안 믿는다.
          const n = baseForTheme.filter((f) => f.th.includes(k)).length
          return (
            <button key={k} className={chip(theme === k)} onClick={() => setTheme(theme === k ? null : k)} disabled={n === 0}>
              <Icon name={k} size={14} className="mr-1 -mt-0.5" />
              {themeLabel(k, lang)}
              <span className="ml-1 font-normal opacity-60">{n}</span>
            </button>
          )
        })}
      </div>

      {/* 거리순이 풀린 이유 — 말없이 되돌리면 버튼이 고장난 것으로 보인다 */}
      {geoNote && (
        <div className="mb-4 rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-muted">
          {t(lang, geoNote)}
          {geoNote === 'list.distanceBlocked' && (
            <span className="mt-1 block text-hint">{t(lang, 'nearby.blockedHow')}</span>
          )}
        </div>
      )}

      {/* 결과 수 + 정렬 */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-[14px] font-bold text-muted">{t(lang, 'list.total', { n: list.length })}</p>
        <div className="flex gap-1">
          {(['date', 'distance', 'popularity'] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-bold transition ${
                sort === s ? 'bg-paper-2 text-brand' : 'text-hint hover:text-muted'
              }`}
            >
              {s === 'date'
                ? lang === 'ko' ? '날짜순' : lang === 'ja' ? '日付順' : lang === 'th' ? 'ตามวันที่' : 'By date'
                : s === 'distance'
                  ? lang === 'ko' ? '거리순' : lang === 'ja' ? '近い順' : lang === 'th' ? 'ตามระยะทาง' : 'By distance'
                  : lang === 'ko' ? '인기순' : lang === 'ja' ? '人気順' : lang === 'th' ? 'ยอดนิยม' : 'Popular'}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface px-6 py-16 text-center text-[15px] text-muted">
          {lang === 'ko'
            ? '조건에 맞는 축제가 없어요. 필터를 하나 풀어보세요.'
            : lang === 'ja'
              ? '条件に合う祭りがありません。条件を一つ外してみてください。'
              : lang === 'th'
                ? 'ไม่พบเทศกาลตามเงื่อนไข ลองปลดตัวกรองสักหนึ่งข้อ'
                : 'Nothing matches. Try removing one filter.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {list.slice(0, shown).map(({ f, km }) => (
              <Link
                key={f.k}
                href={`/${lang}/festivals/${toSlug(f.k)}/`}
                className="lift group block overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface hover:border-brand/40 hover:shadow-[0_10px_28px_-14px_rgba(79,50,22,.35)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                  <Poster
                    src={f.img}
                    name={f.n}
                    pendingLabel={t(lang, 'photo.pending')}
                    className="transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <DayBadgeChip badge={f.db} lang={lang} />
                  {f.ip && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      {t(lang, 'poster.past')}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-muted">
                    <span className="truncate">{f.p}</span>
                    {km != null && (
                      <span className="shrink-0 font-bold text-brand-400">
                        {km < 10 ? km.toFixed(1) : Math.round(km)}km
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1.5 line-clamp-2 text-[16px] font-bold leading-snug text-ink">{f.n}</h3>
                  <p className="text-[13px] tabular-nums text-hint">
                    {f.al ? t(lang, 'status.always') : `${fmt(f.s)} – ${fmt(f.e)}`}
                  </p>
                  {!f.al && f.lr && <p className="mt-0.5 text-[12px] text-hint/80">{t(lang, 'status.selectDates')}</p>}
                </div>
              </Link>
            ))}
          </div>

          {shown < list.length && (
            <div className="mt-10 text-center">
              <button
                onClick={() => setPage((n) => n + 1)}
                className="rounded-full border border-line px-8 py-3 text-[15px] font-bold text-brand transition hover:border-brand hover:bg-brand-50"
              >
                {lang === 'ko' ? '더 보기' : lang === 'ja' ? 'もっと見る' : lang === 'th' ? 'ดูเพิ่ม' : 'Show more'}{' '}
                <span className="font-normal text-hint">
                  {shown}/{list.length}
                </span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
