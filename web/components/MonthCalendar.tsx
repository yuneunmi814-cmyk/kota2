'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { ListItem } from '@/lib/listData'
import type { Lang } from '@/lib/i18n'
import { toSlug } from '@/lib/slug'
import Poster from './Poster'
import Icon from './Icon'

// 축제 달력 — 월간 그리드.
//
// 전에는 12개월치를 목록으로 죽 이어 붙였다. 세로 28,736px이었다(QA F-10) — 11월 축제를
// 보려면 스크롤을 스물몇 번 굴려야 했고, '언제쯤 갈까'를 훑는다는 이 화면의 목적이
// 사라졌다. 달력은 한 달이 한 화면에 들어와야 달력이다.
//
// 골격은 구석구석 축제달력에서, 외양은 구글 캘린더에서 가져왔다(8/18 회의 결정).
// 구석구석은 날짜마다 「37개 축제 ▼」를 접어 두는데 그 구조는 옳다 — 성수기에는 하루에
// 마흔 개가 열리므로 셀 안에 다 못 넣는다. 다만 그쪽 화면은 촌스럽다는 게 팀 의견이라
// 색과 여백은 구글 캘린더 쪽을 따랐다: 흰 바탕, 가는 회색 격자, 작은 날짜, 오늘만 원.
//
// 셀에 무엇을 넣을지가 이 화면의 전부다.
//
// '그날 열려 있는 축제'를 다 넣으면 마흔 개가 들어가 아무것도 안 읽힌다. 그렇다고 개수만
// 적으면 어느 축제인지 몰라 클릭할 이유가 안 생긴다. 그래서 둘로 나눴다 —
//   · 그날 '시작하는' 축제는 이름을 띄운다. 대개 하루 두세 개고, 계획을 세울 때 실제로
//     찾는 것이 이것이다("이번 주에 새로 뭐 시작하지").
//   · 그날 '열려 있는' 축제는 수만 적는다. 눌러야 보인다.
// 좁은 화면에서는 이름이 들어갈 자리가 없어 점으로 바꾼다. 구글 캘린더 모바일과 같다.

type Day = {
  iso: string
  day: number
  inMonth: boolean
  starting: ListItem[]
  running: ListItem[]
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

const DOW: Record<Lang, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  th: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'],
}

function monthTitle(y: number, m: number, lang: Lang) {
  if (lang === 'ko') return `${y}년 ${m}월`
  if (lang === 'ja') return `${y}年${m}月`
  if (lang === 'th') return `${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1]} ${y}`
  return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`
}

const fmt = (d: string) => d.slice(5).replace('-', '.')

/** 다른 달의 1일 — 구글 캘린더의 'Sep 1' 자리 */
function monthDayLabel(isoDate: string, lang: Lang) {
  const m = Number(isoDate.slice(5, 7))
  if (lang === 'ko') return `${m}월 1`
  if (lang === 'ja') return `${m}月1`
  if (lang === 'th') return `${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][m - 1]} 1`
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} 1`
}

export default function MonthCalendar({
  items,
  lang,
  today,
}: {
  items: ListItem[]
  lang: Lang
  /** 오늘 날짜는 서버가 정해 넘긴다 — 클라이언트 시계로 잡으면 첫 렌더가 서버와 어긋난다 */
  today: string
}) {
  const [y0, m0] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))]
  const [cursor, setCursor] = useState({ y: y0, m: m0 })
  const [picked, setPicked] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // 어느 달을 보고 있었는지는 주소에 남긴다 — 축제를 열어 보고 돌아왔을 때 그 달이어야 한다
  useEffect(() => {
    const u = new URLSearchParams(window.location.search)
    const m = u.get('m')
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 주소는 서버에 없다. 정적으로 구운 HTML과 맞추려면 마운트 뒤에 읽어야 한다.
    if (m && /^\d{4}-\d{2}$/.test(m)) setCursor({ y: Number(m.slice(0, 4)), m: Number(m.slice(5, 7)) })
    const d = u.get('d')
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setPicked(d)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const p = new URLSearchParams()
    const cur = `${cursor.y}-${String(cursor.m).padStart(2, '0')}`
    if (cur !== `${y0}-${String(m0).padStart(2, '0')}`) p.set('m', cur)
    if (picked) p.set('d', picked)
    const qs = p.toString()
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next)
  }, [ready, cursor, picked, y0, m0])

  const weeks = useMemo<Day[][]>(() => {
    const { y, m } = cursor
    const first = new Date(Date.UTC(y, m - 1, 1))
    const lead = first.getUTCDay()
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const cells: Day[] = []

    const push = (dy: number, dm: number, dd: number, inMonth: boolean) => {
      const s = iso(dy, dm, dd)
      cells.push({
        iso: s,
        day: dd,
        inMonth,
        starting: items.filter((f) => f.s === s),
        running: items.filter((f) => f.s <= s && f.e >= s),
      })
    }

    // 앞뒤 달의 자투리도 채운다. 빈 칸으로 두면 격자가 뜯어져 보인다.
    const prevDays = new Date(Date.UTC(y, m - 1, 0)).getUTCDate()
    for (let i = lead - 1; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(y, m - 2, prevDays - i))
      push(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), false)
    }
    for (let d = 1; d <= days; d += 1) push(y, m, d, true)
    while (cells.length % 7 !== 0) {
      const n = cells.length - lead - days + 1
      const d = new Date(Date.UTC(y, m, n))
      push(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), false)
    }
    return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  }, [cursor, items])

  const move = (delta: number) => {
    const d = new Date(Date.UTC(cursor.y, cursor.m - 1 + delta, 1))
    setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 })
    setPicked(null)
  }

  const pickedDay = picked ? weeks.flat().find((d) => d.iso === picked) : null
  const monthCount = weeks.flat().filter((d) => d.inMonth).reduce((n, d) => n + d.starting.length, 0)

  return (
    <div>
      {/* 머리 — 구글 캘린더 배치를 그대로: 오늘 → 화살표 → 달 이름 순으로 왼쪽부터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setCursor({ y: y0, m: m0 })
            setPicked(null)
          }}
          className="rounded-lg border border-line px-4 py-1.5 text-[14px] font-semibold text-ink transition hover:bg-paper-2"
        >
          {lang === 'ko' ? '오늘' : lang === 'ja' ? '今日' : lang === 'th' ? 'วันนี้' : 'Today'}
        </button>
        <button
          type="button"
          onClick={() => move(-1)}
          aria-label={lang === 'ko' ? '이전 달' : lang === 'ja' ? '前の月' : lang === 'th' ? 'เดือนก่อน' : 'Previous month'}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          aria-label={lang === 'ko' ? '다음 달' : lang === 'ja' ? '次の月' : lang === 'th' ? 'เดือนหน้า' : 'Next month'}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:bg-paper-2 hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 className="ml-1 text-[20px] font-normal text-ink sm:text-[22px]">{monthTitle(cursor.y, cursor.m, lang)}</h2>
        <span className="ml-auto text-[13px] text-hint">
          {lang === 'ko' ? `${monthCount}개 시작` : lang === 'ja' ? `${monthCount}件 開始` : lang === 'th' ? `เริ่ม ${monthCount}` : `${monthCount} starting`}
        </span>
      </div>

      {/* 격자 — 테두리는 한 겹만. 셀마다 두르면 표처럼 보인다 */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <div className="grid grid-cols-7 border-b border-line">
          {/* 구글 캘린더는 요일에 색을 안 준다. 주말을 빨강·파랑으로 물들이면 달력이
              시끄러워지고, 어차피 날짜 칸이 이미 정보를 잔뜩 이고 있다. */}
          {DOW[lang].map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-hint">
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 ${wi ? 'border-t border-line' : ''}`}>
            {week.map((d) => {
              const isToday = d.iso === today
              const isPicked = d.iso === picked
              const has = d.running.length > 0
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => {
                    setPicked(isPicked ? null : d.iso)
                    setShowAll(false)
                  }}
                  disabled={!has}
                  aria-pressed={isPicked}
                  className={`min-h-[72px] border-l border-line px-1.5 py-1.5 text-left align-top transition first:border-l-0 sm:min-h-[104px] sm:px-2 sm:py-2 ${
                    isPicked ? 'bg-brand-50' : has ? 'hover:bg-paper-2' : ''
                  } ${has ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* 날짜는 셀 상단 가운데. 구글 캘린더가 그렇고, 왼쪽에 붙이면
                      그 아래 칩들과 세로줄이 겹쳐 보인다.
                      다른 달의 1일에는 월 이름을 붙인다 — 격자 끝에서 달이 바뀐 것을
                      숫자만으로는 알 수 없다(구글도 'Sep 1'로 적는다). */}
                  <span className="flex justify-center">
                    <span
                      className={`inline-flex h-[22px] items-center justify-center rounded-full px-[7px] text-[12px] tabular-nums ${
                        isToday
                          ? 'bg-brand font-bold text-white'
                          : !d.inMonth
                            ? 'text-hint/50'
                            : 'text-muted'
                      }`}
                    >
                      {!d.inMonth && d.day === 1 ? monthDayLabel(d.iso, lang) : d.day}
                    </span>
                  </span>

                  {/* 넓은 화면 — 그날 시작하는 축제의 이름 */}
                  {/* 구글 캘린더의 이벤트 막대 — 셀 폭을 꽉 채운다. '더 있음'은 +N.
                      한 줄로 자르던 것을 두 줄까지 허용한다. 칸이 123px인데 영어 이름은
                      그보다 훨씬 길어 8월 20개 칸이 전부 잘렸다 — 달력에서 어떤 축제인지
                      하나도 못 읽었다(2026-08-23 점검). 그래도 넘치면 title로 전체를 본다. */}
                  <span className="mt-1 hidden flex-col gap-[2px] sm:flex">
                    {d.starting.slice(0, 2).map((f) => (
                      <span
                        key={f.k}
                        title={f.n}
                        className="line-clamp-2 break-keep rounded-[4px] bg-brand px-1.5 py-[3px] text-[11px] font-semibold leading-[1.3] text-white"
                      >
                        {f.n}
                      </span>
                    ))}
                    {d.starting.length > 2 && (
                      <span className="px-1.5 text-[11px] font-semibold text-muted">
                        +{d.starting.length - 2}
                      </span>
                    )}
                    {has && d.starting.length === 0 && (
                      <span className={`px-1.5 text-[11px] tabular-nums ${d.inMonth ? 'text-hint' : 'text-hint/45'}`}>
                        {lang === 'ko' ? `${d.running.length}개 진행` : lang === 'ja' ? `${d.running.length}件` : lang === 'th' ? `${d.running.length}` : `${d.running.length} on`}
                      </span>
                    )}
                  </span>

                  {/* 좁은 화면 — 이름이 들어갈 자리가 없다. 점으로 있고 없고만 */}
                  <span className="mt-1 flex justify-center gap-[3px] sm:hidden">
                    {d.starting.slice(0, 3).map((f) => (
                      <span key={f.k} className="h-1.5 w-1.5 rounded-full bg-brand" />
                    ))}
                    {d.starting.length === 0 && has && <span className="h-1.5 w-1.5 rounded-full bg-line" />}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* 고른 날 — 격자 아래에 편다. 옆에 두면 좁은 화면에서 갈 곳이 없다 */}
      {pickedDay && (() => {
        // 그날 시작하는 것과 이미 하고 있는 것을 나눈다.
        //
        // 성수기에는 하루에 마흔여덟 개가 열린다. 한 줄로 죽 늘어놓으면 4,400px이 되어,
        // 방금 줄인 스크롤이 여기서 되살아난다. 그런데 그 마흔여덟 개가 같은 무게는 아니다 —
        // 그날 시작하는 서넛이 '오늘의 소식'이고 나머지는 어제도 하던 것이다.
        // 시작하는 것은 다 펴고, 하고 있는 것은 여섯 개만 보이고 접어 둔다.
        const starts = pickedDay.starting
        const going = pickedDay.running.filter((f) => f.s !== pickedDay.iso).sort((a, b) => a.e.localeCompare(b.e))
        const goingShown = showAll ? going : going.slice(0, 6)
        const row = (f: ListItem, isStart: boolean) => (
          <li key={f.k}>
            <Link
              href={`/${lang}/festivals/${toSlug(f.k)}/`}
              className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface sm:px-4 sm:py-3"
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                <Poster src={f.img} name={f.n} letterClass="text-[1.3em]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink">{f.n}</span>
                <span className="block truncate text-[13px] text-muted">
                  {f.p} · {fmt(f.s)}
                  {f.s !== f.e ? `–${fmt(f.e)}` : ''}
                </span>
              </span>
              {isStart && (
                <span className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white">
                  {lang === 'ko' ? '시작' : lang === 'ja' ? '開始' : lang === 'th' ? 'เริ่ม' : 'Starts'}
                </span>
              )}
            </Link>
          </li>
        )
        return (
          <section className="mt-6">
            <h3 className="mb-3 flex items-baseline gap-2 text-[17px] font-bold text-ink">
              {lang === 'ko' ? `${Number(pickedDay.iso.slice(5, 7))}월 ${pickedDay.day}일` : pickedDay.iso}
              <span className="text-[13px] font-bold text-hint">
                {lang === 'ko' ? `${pickedDay.running.length}곳` : pickedDay.running.length}
              </span>
            </h3>

            {starts.length > 0 && (
              <>
                <p className="mb-2 text-[13px] font-bold text-brand">
                  {lang === 'ko' ? `이날 시작 ${starts.length}` : lang === 'ja' ? `この日開始 ${starts.length}` : lang === 'th' ? `เริ่มวันนี้ ${starts.length}` : `Starting ${starts.length}`}
                </p>
                <ul className="mb-5 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-brand/30">
                  {starts.map((f) => row(f, true))}
                </ul>
              </>
            )}

            {going.length > 0 && (
              <>
                <p className="mb-2 text-[13px] font-bold text-muted">
                  {lang === 'ko' ? `진행 중 ${going.length}` : lang === 'ja' ? `開催中 ${going.length}` : lang === 'th' ? `กำลังจัด ${going.length}` : `Already on ${going.length}`}
                </p>
                <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line">
                  {goingShown.map((f) => row(f, false))}
                </ul>
                {going.length > goingShown.length && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="rounded-full border border-line px-6 py-2.5 text-[14px] font-bold text-brand transition hover:border-brand hover:bg-brand-50"
                    >
                      {lang === 'ko' ? '모두 보기' : lang === 'ja' ? 'すべて見る' : lang === 'th' ? 'ดูทั้งหมด' : 'Show all'}{' '}
                      <span className="font-normal text-hint">{goingShown.length}/{going.length}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )
      })()}

      {!pickedDay && (
        <p className="mt-5 flex items-center gap-2 text-[14px] text-hint">
          <Icon name="calendar" size={16} />
          {lang === 'ko'
            ? '날짜를 누르면 그날 열리는 축제를 볼 수 있어요.'
            : lang === 'ja'
              ? '日付を押すと、その日に開かれる祭りが見られます。'
              : lang === 'th'
                ? 'แตะวันที่เพื่อดูเทศกาลที่จัดในวันนั้น'
                : 'Tap a date to see what is on that day.'}
        </p>
      )}
    </div>
  )
}
