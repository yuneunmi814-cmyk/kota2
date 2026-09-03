'use client'
import { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { filterListItems, sortListItems, type ListItem, type ListPeriod, type ListSort } from '@/lib/listData'
import { useListParams, useScrollMemory, useDistanceCoords } from '@/lib/list-state'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import { monthLabel, REGIONS, sidoLabel } from '@/lib/sido'
import { THEMES, themeLabel, type Theme } from '@/lib/themes'
import { track } from '@/lib/track'
import Icon from './Icon'
import Poster from './Poster'
import DayBadgeChip from './DayBadge'
import { toSlug } from '@/lib/slug'
import { weekendRange } from '@/lib/date'

// 축제 목록 — 시기 × 지역 × 목적 3축 필터와 3정렬.
//
// 정적 사이트라 필터는 전부 브라우저에서 돈다. 715건은 클라이언트에서 걸러도
// 체감 지연이 없고, 서버가 없으니 콜드 스타트도 없다.
//
// '시기'를 첫 축으로 둔 이유: 축제는 '언제 하느냐'가 갈 수 있냐를 결정한다.
// 지역부터 고르게 하면 이미 끝난 축제를 한참 보다가 돌아 나온다.

type Period = ListPeriod // number = 월(1~12)
type Sort = ListSort
const PAGE = 24

const fmt = (d: string) => d.slice(5).replace('-', '.')

/** 이번 주말(토·일) — 오늘이 일요일이면 오늘, 아니면 돌아오는 토·일. 홈 배너와 같은 규칙 */
function thisWeekend(): [string, string] {
  return weekendRange()
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
  // 주소·스크롤·위치 상태는 lib/list-state.ts에 있다. 여기서는 쓰기만 한다 —
  // 그 셋은 '무엇을 보여줄지'와 무관한데도 이 파일에 섞여 있어, 카드 한 줄을 고치려 해도
  // 스크롤 복원과 위치 권한 코드를 지나가야 했다.
  const {
    period, region, sido, theme, sort, q, graded, page,
    setPeriod, setRegion, setSido, setTheme, setSort, setQ, setPage,
    ready,
  } = useListParams({ period: initialPeriod, region: initialRegion, theme: initialTheme, sort: initialSort, q: initialQuery, graded: initialGraded })
  const { rememberScroll, farDown } = useScrollMemory(ready)
  const { coords, geoNote } = useDistanceCoords(sort, () => setSort('date'))

  const weekend = useMemo(() => thisWeekend(), [])
  const shown = page * PAGE

  const list = useMemo(() => {
    const filtered = filterListItems(items, { period, region, sido, theme, graded, query: q, weekend })
    return sortListItems(filtered, sort, coords)
  }, [items, period, region, sido, theme, graded, q, sort, coords, weekend])

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
    const base = filterListItems(items, {
      period,
      region: null,
      sido: null,
      theme: null,
      graded: false,
      query: q,
      weekend,
    })
    // 검색어도 반영한다.
    //
    // 전에는 시기만 보고 세서, 검색 결과가 0건인데도 지역 칩은 「서울 82」를 그대로 달고
    // 있었다. 바로 위에 「축제 0곳」이 떠 있는데 아래에서 82를 약속하니 어느 쪽을 믿어야
    // 할지 알 수 없었다. 테마 칩(baseForTheme)은 이미 검색어를 반영하고 있어 두 줄이
    // 서로 다른 규칙을 따르고 있었다(2026-08-23 점검).
    const m = new Map<string, number>()
    for (const f of base) if (f.sd) m.set(f.sd, (m.get(f.sd) ?? 0) + 1)
    return [...m.entries()].map(([sido, count]) => ({ sido, count })).sort((a, b) => b.count - a.count)
  }, [items, period, q, weekend])

  // 테마 칩의 근거가 되는 목록 — 테마만 빼고 지금 걸린 조건을 전부 적용한 것.
  const baseForTheme = useMemo(() => {
    return filterListItems(items, {
      period,
      region,
      sido,
      theme: null,
      graded,
      query: q,
      weekend,
    })
  }, [items, period, region, sido, graded, q, weekend])

  const subSidos = useMemo(() => {
    const rs = REGIONS.find((r) => r.key === region)?.sidos
    return rs ? countBySido.filter((x) => rs.includes(x.sido)) : []
  }, [countBySido, region])

  // ── 고른 칩을 화면 안으로 ──────────────────────────────────────
  //
  // 칩 줄은 가로로 길다. 시기 줄만 16개고, 390px 화면에는 다섯 개쯤 들어간다. 오른쪽 페이드로
  // '더 있다'는 알렸지만(BUG-24, 8/18), 고른 칩 자체가 화면 밖이면 지금 뭐가 걸려 있는지
  // 보이지 않는다 — 9월을 고르고 돌아오면 화면에는 '전체·진행중·이번주말'만 있고 어디에도
  // 9월이 없다(BUG-08, 2026-08-23). 주소로 들어온 필터도 마찬가지다.
  //
  // 세로로는 건드리지 않는다(block:'nearest') — 칩을 보이려다 페이지가 위아래로 튀면
  // 방금 고친 스크롤 복원과 싸운다.
  const rowsRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!ready) return
    const host = rowsRef.current
    if (!host) return
    for (const row of host.querySelectorAll<HTMLElement>('[data-chip-row]')) {
      const on = row.querySelector<HTMLElement>('[data-chip-on="1"]')
      if (!on) continue
      if (row.scrollWidth <= row.clientWidth) continue // 다 들어오는 줄은 건드릴 것이 없다
      on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'auto' })
    }
  }, [ready, period, region, sido, theme])

  // 걸어둔 필터가 하나라도 있는가 — 0건 안내 문구를 고르는 데 쓴다
  const hasFilters = period !== 'all' || !!region || !!sido || !!theme || graded

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
    <div ref={rowsRef}>
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

      {/* 1축 — 시기. 축제는 '언제'가 먼저다.
          넓은 화면에서는 줄을 감싼다. 칩이 16개(전체·진행중·주말 + 12달)라 한 줄에 안 들어가는데,
          no-scrollbar가 붙어 있어 마우스로는 밀 수단이 없었다 — 마지막 달을 아예 누를 수 없었다.
          영어 'Dec'는 59px 중 58px이 가려졌고 태국어는 약칭으로 줄인 뒤에도 12월이 안 잡혔다
          (2026-08-25 실측). 좁은 화면은 원래 가로로 넘기는 UI라 그대로 둔다. */}
      <div data-chip-row className="-mx-5 mb-3 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <button data-chip-on={period === 'all' ? '1' : undefined} className={chip(period === 'all')} onClick={() => setPeriod('all')}>
          {lang === 'ko' ? '전체' : lang === 'ja' ? 'すべて' : lang === 'th' ? 'ทั้งหมด' : 'All'}
        </button>
        <button data-chip-on={period === 'ongoing' ? '1' : undefined} className={chip(period === 'ongoing')} onClick={() => setPeriod('ongoing')}>
          {t(lang, 'status.ongoing')}
        </button>
        <button data-chip-on={period === 'upcoming' ? '1' : undefined} className={chip(period === 'upcoming')} onClick={() => setPeriod('upcoming')}>
          {t(lang, 'status.upcoming')}
        </button>
        <button data-chip-on={period === 'weekend' ? '1' : undefined} className={chip(period === 'weekend')} onClick={() => setPeriod('weekend')}>
          {t(lang, 'row.weekend')}
        </button>
        <span className="mx-1 w-px shrink-0 self-stretch bg-line" />
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <button key={m} data-chip-on={period === m ? '1' : undefined} className={chip(period === m)} onClick={() => setPeriod(m)}>
            {monthLabel(m, lang)}
          </button>
        ))}
      </div>

      {/* 2축 — 지역. 권역을 먼저 고르고, 고른 권역 안에서만 시·도로 좁힌다 */}
      <div data-chip-row className="-mx-5 mb-3 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        <button
          data-chip-on={!region ? '1' : undefined}
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
              data-chip-on={region === r.key ? '1' : undefined}
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
        <div data-chip-row className="-mx-5 mb-3 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
          <button data-chip-on={!sido ? '1' : undefined} className={subChip(!sido)} onClick={() => setSido(null)}>
            {lang === 'ko' ? '전체' : lang === 'ja' ? 'すべて' : lang === 'th' ? 'ทั้งหมด' : 'All'}
          </button>
          {subSidos.map(({ sido: s, count }) => (
            <button key={s} data-chip-on={sido === s ? '1' : undefined} className={subChip(sido === s)} onClick={() => setSido(sido === s ? null : s)}>
              {sidoLabel(s, lang)} <span className="ml-1 font-normal opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* 3축 — 목적 */}
      <div data-chip-row className="-mx-5 mb-6 chip-row flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {/* 테마를 푸는 칩. 시기·지역 줄에는 '전체'가 있는데 여기만 없어서, 한 번 고르면
            같은 칩을 다시 누르는 것 말고는 해제할 방법이 화면에 없었다(BUG-16) */}
        <button data-chip-on={!theme ? '1' : undefined} className={chip(!theme)} onClick={() => setTheme(null)}>
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
            <button key={k} data-chip-on={theme === k ? '1' : undefined} className={chip(theme === k)} onClick={() => setTheme(theme === k ? null : k)} disabled={n === 0}>
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
          {/* 왜 0건인지에 따라 다른 말을 한다.
              검색어만 넣어 0건이 된 사람에게 "필터를 풀어보라"고 하면, 풀 필터가 없어서
              무엇을 하라는 말인지 알 수 없다(2026-08-23 점검). */}
          {q.trim() && !hasFilters
            ? lang === 'ko'
              ? `'${q.trim()}'에 맞는 축제가 없어요. 다른 말로 찾아보시겠어요?`
              : lang === 'ja'
                ? `「${q.trim()}」に一致する祭りがありません。別の言葉で探してみてください。`
                : lang === 'th'
                  ? `ไม่พบเทศกาลที่ตรงกับ "${q.trim()}" ลองใช้คำอื่นดูไหม`
                  : `No festivals match "${q.trim()}". Try another word?`
            : lang === 'ko'
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
                onClick={rememberScroll}
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
                  {/* 두 줄 자리를 늘 확보 — FestivalCard와 같은 이유(밑선 어긋남 방지) */}
                  <div className="mb-1.5 flex min-h-[2.7em] items-start gap-2 text-[12px] font-semibold leading-[1.35] text-muted">
                    {/* 지역 줄 두 줄 — FestivalCard와 같은 규칙.
                        목록은 카드 컴포넌트를 쓰지 않고 마크업이 여기 따로 있어서,
                        8/25 수정이 홈·상세에만 닿고 정작 카드가 제일 많은 이 화면은
                        그대로였다(2026-08-25 2차 검증에서 네 언어 모두 지적). */}
                    <span className="line-clamp-2 min-w-0 flex-1 leading-[1.35]">{f.p}</span>
                    {km != null && (
                      <span className="shrink-0 font-bold text-brand-400">
                        {km < 10 ? km.toFixed(1) : Math.round(km)}km
                      </span>
                    )}
                  </div>
                  <h3 className="mb-1.5 line-clamp-3 break-keep text-[16px] font-bold leading-snug text-ink">{f.n}</h3>
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

          {/* 맨 위·맨 아래 — 한참 내려간 뒤에만 나온다. 처음부터 떠 있으면 카드를 가릴 뿐이다.
              '맨 아래'는 지금 펼쳐 놓은 만큼의 끝으로 간다(더 보기 자리) — 거기가 다음 행동이 있는 곳이다.
              데스크톱에서도 목록은 길지만 마우스 휠과 스크롤바가 있어 급하지 않다. 좁은 화면만 띄운다. */}
          {farDown && (
            <div className="fixed bottom-5 right-4 z-30 flex flex-col gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label={t(lang, 'list.toTop')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/95 text-brand shadow-[0_6px_20px_-8px_rgba(79,50,22,.5)] backdrop-blur transition hover:border-brand/40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                aria-label={t(lang, 'list.toBottom')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/95 text-brand shadow-[0_6px_20px_-8px_rgba(79,50,22,.5)] backdrop-blur transition hover:border-brand/40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
