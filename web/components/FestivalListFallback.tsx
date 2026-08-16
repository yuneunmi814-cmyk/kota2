import Link from 'next/link'
import Poster from './Poster'
import { defaultOrder, type ListItem } from '@/lib/listData'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'

// 목록의 서버 렌더 첫 화면.
//
// FestivalList는 useSearchParams를 쓰는 클라이언트 컴포넌트라, 정적 내보내기에서는
// Suspense 경계가 fallback으로 대체된다. fallback이 null이면 빌드된 HTML에 카드가 한 장도
// 없다(실측: 카드 링크 0개) — 검색엔진은 목록에서 축제를 못 보고, 느린 회선에서는 JS가
// 뜰 때까지 빈 화면이다.
//
// 그래서 첫 24장을 서버에서 같은 마크업·같은 순서로 그려 둔다. 하이드레이션되면
// 인터랙티브 목록이 자리를 넘겨받는다. 순서는 defaultOrder를 공유해 화면이 튀지 않게 한다.

const PAGE = 24
const fmt = (d: string) => d.slice(5).replace('-', '.')

export default function FestivalListFallback({ items, lang }: { items: ListItem[]; lang: Lang }) {
  const list = defaultOrder(items.filter((f) => f.st !== 'ended')).slice(0, PAGE)
  return (
    <div>
      <p className="mb-5 text-[14px] font-bold text-muted">{t(lang, 'list.total', { n: items.filter((f) => f.st !== 'ended').length })}</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {list.map((f) => (
          <Link
            key={f.k}
            href={`/${lang}/festivals/${f.k}/`}
            className="lift group block overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface hover:border-brand/40"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-surface">
              <Poster src={f.img} name={f.n} regionPhoto={f.rp} regionLabel={t(lang, 'photo.region')} />
              {f.st === 'ongoing' && !f.al && (
                <span className="sticker absolute left-3 top-3 rounded-full bg-y px-2.5 py-1 text-[11px] font-black text-on-y">
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
              <div className="mb-1.5 truncate text-[12px] font-semibold text-muted">{f.p}</div>
              <h3 className="text-[15px] font-bold leading-[1.35] text-ink">{f.n}</h3>
              <div className="mt-1.5 text-[12px] text-hint">
                {fmt(f.s)} – {fmt(f.e)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
