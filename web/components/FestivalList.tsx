'use client'
import { useEffect, useMemo, useState } from 'react'
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
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [region, setRegion] = useState<string | null>(initialRegion)
  const [graded, setGraded] = useState(initialGraded)
  const [sido, setSido] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme | null>(initialTheme)
  const [sort, setSort] = useState<Sort>(initialSort)
  const [q, setQ] = useState(initialQuery)
  const [shown, setShown] = useState(PAGE)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // 거리순을 고르면 그때 위치를 묻는다 — 목록에서까지 진입 즉시 물으면 성가시다
  useEffect(() => {
    if (sort !== 'distance' || coords || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setSort('date'),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    )
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

  useEffect(() => setShown(PAGE), [period, region, sido, theme, graded, q, sort])

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
      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
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
      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
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
        <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
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
      <div className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {THEMES.map((k) => {
          // 개수는 '지금 걸린 다른 필터 기준'으로 센다 — 눌렀을 때 몇 건이 나오는지와 일치해야 한다
          const rs = region ? (REGIONS.find((r) => r.key === region)?.sidos ?? []) : null
          const n = items.filter(
            (f) =>
              f.st !== 'ended' &&
              f.th.includes(k) &&
              (sido ? f.sd === sido : !rs || (f.sd != null && rs.includes(f.sd))),
          ).length
          return (
            <button key={k} className={chip(theme === k)} onClick={() => setTheme(theme === k ? null : k)} disabled={n === 0}>
              <Icon name={k} size={14} className="mr-1 -mt-0.5" />
              {themeLabel(k, lang)}
              <span className="ml-1 font-normal opacity-60">{n}</span>
            </button>
          )
        })}
      </div>

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
                onClick={() => setShown((n) => n + PAGE)}
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
