'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { defaultOrder, type ListItem } from '@/lib/listData'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { monthLabel, sidoLabel } from '@/lib/sido'
import { THEMES, themeLabel, type Theme } from '@/lib/themes'
import { distanceKm } from '@/lib/festivals'
import Icon from './Icon'
import Poster from './Poster'

// 축제 목록 — 시기 × 지역 × 목적 3축 필터와 3정렬.
//
// 정적 사이트라 필터는 전부 브라우저에서 돈다. 715건은 클라이언트에서 걸러도
// 체감 지연이 없고, 서버가 없으니 콜드 스타트도 없다.
//
// '시기'를 첫 축으로 둔 이유: 축제는 '언제 하느냐'가 갈 수 있냐를 결정한다.
// 지역부터 고르게 하면 이미 끝난 축제를 한참 보다가 돌아 나온다.

type Period = 'all' | 'ongoing' | 'upcoming' | number // number = 월(1~12)
type Sort = 'date' | 'distance' | 'popularity'
const PAGE = 24

const fmt = (d: string) => d.slice(5).replace('-', '.')

export default function FestivalList({
  items,
  lang,
  sidos,
  initialSort = 'date',
  initialTheme = null,
  initialQuery = '',
}: {
  items: ListItem[]
  lang: Lang
  sidos: { sido: string; count: number }[]
  initialSort?: Sort
  initialTheme?: Theme | null
  initialQuery?: string
}) {
  const [period, setPeriod] = useState<Period>('all')
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
    else if (typeof period === 'number') out = out.filter((f) => f.m.includes(period) && !f.al)

    if (sido) out = out.filter((f) => f.sd === sido)
    if (theme) out = out.filter((f) => f.th.includes(theme))

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
  }, [items, period, sido, theme, q, sort, coords])

  useEffect(() => setShown(PAGE), [period, sido, theme, q, sort])

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition ${
      on ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:border-brand/40 hover:text-brand'
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
        <span className="mx-1 w-px shrink-0 self-stretch bg-line" />
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <button key={m} className={chip(period === m)} onClick={() => setPeriod(m)}>
            {monthLabel(m, lang)}
          </button>
        ))}
      </div>

      {/* 2축 — 지역 */}
      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        <button className={chip(!sido)} onClick={() => setSido(null)}>
          {lang === 'ko' ? '전국' : lang === 'ja' ? '全国' : lang === 'th' ? 'ทั่วประเทศ' : 'Nationwide'}
        </button>
        {sidos.map(({ sido: s, count }) => (
          <button key={s} className={chip(sido === s)} onClick={() => setSido(sido === s ? null : s)}>
            {sidoLabel(s, lang)} <span className="ml-1 font-normal opacity-60">{count}</span>
          </button>
        ))}
      </div>

      {/* 3축 — 목적 */}
      <div className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {THEMES.map((k) => {
          // 개수는 '지금 걸린 다른 필터 기준'으로 센다 — 눌렀을 때 몇 건이 나오는지와 일치해야 한다
          const n = items.filter(
            (f) => f.st !== 'ended' && f.th.includes(k) && (!sido || f.sd === sido),
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
                href={`/${lang}/festivals/${f.k}/`}
                className="lift group block overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface hover:border-brand/40 hover:shadow-[0_10px_28px_-14px_rgba(79,50,22,.35)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                  <Poster
                    src={f.img}
                    name={f.n}
                    regionPhoto={f.rp}
                    regionLabel={t(lang, 'photo.region')}
                    className="transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  {f.st === 'ongoing' && !f.al && (
                    <span className="absolute left-3 top-3 sticker rounded-full bg-y px-2.5 py-1 text-[11px] font-black text-on-y">
                      {t(lang, 'status.ongoing')}
                    </span>
                  )}
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
