import { operatingDaysLabel } from '@/lib/operating-days'
import { todayKst } from '@/lib/date'
import { editorialField } from '@/lib/editorial'
import { feeKind, isAlwaysOn, isLongRun, isPublicData, type Festival } from '@/lib/festivals'
import { localized } from '@/lib/festival-fields'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/ui'
import KakaoMap from '@/components/KakaoMap'
import Icon from '@/components/Icon'
import Gallery from './Gallery'
import ReadMore from './ReadMore'
import YouTube from './YouTube'

type LocalizedFestival = ReturnType<typeof localized>

const sectionClass = 'scroll-mt-32 border-t border-line py-8 sm:py-10'
const headingClass = 'mb-5 text-[21px] font-black leading-snug text-ink sm:text-[24px]'

function OriginalNote({ lang, text }: { lang: Lang; text?: string | null }) {
  if (lang === 'ko' || (text !== undefined && !/[가-힣]/.test(text ?? ''))) return null
  return <p className="mb-3 text-[13px] leading-relaxed text-muted">{t(lang, 'detail.original')}</p>
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[145px_1fr] sm:gap-4">
      <dt className="text-[13px] font-bold text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-[15px] leading-relaxed text-ink">{children}</dd>
    </div>
  )
}

export default function FestivalBody({ f, L, lang, ytId, mapHref, ended }: {
  f: Festival
  L: LocalizedFestival
  lang: Lang
  ytId: string | null
  mapHref: string | null
  ended: boolean
}) {
  const l = lang
  const hasCoords = f.lat != null && f.lng != null
  const hours = editorialField(f, l, 'hours')
  const program = editorialField(f, l, 'program')
  const fee = feeKind(f)
  const boothCount = f.booths?.length ?? 0
  const menuCount = f.booths?.reduce((n, b) => n + b.menu.length, 0) ?? 0
  const hasNotes = ended || isLongRun(f) || isAlwaysOn(f) || Boolean(f.imageNotice)

  return (
    <div className="mx-auto max-w-3xl">
      <section id="about" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.about')}</h2>
        {L.summary ? (
          <>
            {L.summaryIsOriginal && <OriginalNote lang={l} />}
            <ReadMore text={L.summary} more={t(l, 'detail.more')} less={t(l, 'detail.less')} />
          </>
        ) : <p className="text-[15px] text-muted">{t(l, 'detail.noOverview')}</p>}
        {f.photos && f.photos.length > 0 && (
          <div className="mt-7">
            <h3 className="mb-3 text-[17px] font-bold text-ink">{t(l, 'detail.photos')}</h3>
            <Gallery
              photos={f.photos}
              title={L.name}
              sourceLabel={t(l, f.photos.every((p) => /(^|\.)visitkorea\.or\.kr\//.test(p.url)) ? 'detail.photos.src' : 'detail.photos.srcOrganizer')}
              prevLabel={t(l, 'gallery.prev')}
              nextLabel={t(l, 'gallery.next')}
              closeLabel={t(l, 'gallery.close')}
            />
          </div>
        )}
      </section>

      <section id="program" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.program')}</h2>
        {!program && !f.lineup && boothCount === 0 && <p className="text-[15px] text-muted">{t(l, 'detail.noProgram')}</p>}
        {program && <><OriginalNote lang={l} text={program} /><ReadMore text={program} more={t(l, 'detail.more')} less={t(l, 'detail.less')} /></>}
        {f.lineup && (
          <div className="mt-6">
            <h3 className="mb-2 text-[17px] font-bold text-ink">{t(l, 'detail.lineup')}</h3>
            <OriginalNote lang={l} text={f.lineup} />
            <ReadMore text={f.lineup} more={t(l, 'detail.more')} less={t(l, 'detail.less')} />
          </div>
        )}
        {boothCount > 0 && (
          <div className="mt-7">
            <h3 className="mb-2 text-[17px] font-bold text-ink">
              <Icon name="utensils" size={18} className="-mt-1 mr-1 inline text-brand" />
              {t(l, 'detail.food')} <span className="text-[13px] font-medium text-hint">· {t(l, boothCount === 1 ? 'detail.booth.n1' : 'detail.booth.n', { n: boothCount })} · {t(l, menuCount === 1 ? 'detail.menu.n1' : 'detail.menu.n', { n: menuCount })}</span>
            </h3>
            {f.boothsFromPastEdition && <p className="mb-3 text-[13px] text-muted">{t(l, 'detail.booth.past')}</p>}
            <OriginalNote lang={l} text={f.booths?.map((b) => `${b.name} ${b.menu.map((m) => m.name).join(' ')}`).join(' ')} />
            <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
              {f.booths!.map((b, i) => (
                <details key={`${b.name}-${i}`} className="group px-4 py-3" open={boothCount <= 3}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                    <span>{b.name}</span><span className="shrink-0 text-[12px] font-semibold text-hint">{t(l, 'detail.menu.n', { n: b.menu.length })}</span>
                  </summary>
                  {b.menu.length > 0 && <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2">
                    {b.menu.map((m, j) => <li key={`${m.name}-${j}`} className="flex items-baseline justify-between gap-3 border-b border-dotted border-line pb-1">
                      <span className="text-ink/85">{m.name}</span>
                      {m.price != null && <span className="shrink-0 tabular-nums font-bold text-brand">{t(l, 'detail.won', { n: m.price.toLocaleString(l === 'ko' ? 'ko-KR' : 'en-US') })}</span>}
                    </li>)}
                  </ul>}
                </details>
              ))}
            </div>
          </div>
        )}
        {f.youtube && ytId && <div id="video" className="mt-7 scroll-mt-32"><h3 className="mb-3 text-[17px] font-bold text-ink">{t(l, 'detail.video')}</h3><YouTube url={f.youtube} title={L.name} /></div>}
      </section>

      <section id="schedule" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.schedule')}</h2>
        <dl className="border-t border-line">
          <Fact label={t(l, 'detail.period')}><span className="tabular-nums">{f.startDate.replace(/-/g, '.')} – {f.endDate.replace(/-/g, '.')}</span></Fact>
          {f.operatingWeekdays?.length ? <Fact label={t(l, 'detail.days')}>{operatingDaysLabel(f.operatingWeekdays, l)}</Fact> : null}
          <Fact label={t(l, 'detail.hours')}>{hours ? <>{hours}<OriginalNote lang={l} text={hours} /></> : <span className="text-muted">{t(l, 'detail.noHours')}</span>}</Fact>
        </dl>
      </section>

      <section id="admission" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.admission')}</h2>
        <dl className="border-t border-line">
          <Fact label={t(l, 'detail.fee')}>{fee === 'unknown' ? <span className="text-muted">{t(l, 'detail.feeUnknown')}</span> : <>{L.fee}{L.feeIsOriginal && <OriginalNote lang={l} />}</>}</Fact>
          {f.ageInfo && <Fact label={t(l, 'detail.age')}>{f.ageInfo}<OriginalNote lang={l} text={f.ageInfo} /></Fact>}
        </dl>
        {f.homepage && <p className="mt-4 text-[13px] text-muted">{t(l, 'detail.attendNote')} <a href={f.homepage} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline underline-offset-4">{t(l, 'official.visit')}</a></p>}
      </section>

      <section id="notes" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.notes')}</h2>
        {!hasNotes && <p className="text-[15px] text-muted">{t(l, 'detail.noNotes')}</p>}
        <ul className="space-y-2 text-[15px] leading-relaxed text-ink/85">
          {ended && <li>• {t(l, 'detail.endedNote')}</li>}
          {(isLongRun(f) || isAlwaysOn(f)) && <li>• {t(l, 'detail.scheduleNote')}</li>}
          {f.imageNotice === 'registration-closed' && <li>• {t(l, 'poster.registrationClosed')}</li>}
          {f.imageNotice && f.imageNotice !== 'registration-closed' && <li>• {f.imageNotice}<OriginalNote lang={l} text={f.imageNotice} /></li>}
        </ul>
      </section>

      <section id="location" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.location')}</h2>
        {(f.address || L.placeName) && <p className="mb-4 text-[15px] font-semibold text-ink">{f.address ?? L.placeName}</p>}
        {hasCoords ? <KakaoMap lat={f.lat as number} lng={f.lng as number} label={f.address ?? L.placeName ?? L.name} festivalId={f.externalId} linkLabel={t(l, 'map.open')} loadingLabel={t(l, 'map.loading')} /> : <p className="text-[15px] text-muted">{t(l, 'detail.noLocation')}</p>}
        {mapHref && <a href={mapHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-kakao px-5 py-2.5 text-[14px] font-bold text-kakao-ink hover:brightness-95"><Icon name="pin" size={16} />{t(l, 'detail.directions')}</a>}
      </section>

      <section id="contact" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.contact')}</h2>
        {f.organizer && <dl className="mb-4 border-t border-line"><Fact label={t(l, 'detail.organizer')}>{f.organizer}<OriginalNote lang={l} text={f.organizer} /></Fact></dl>}
        {(f.homepage || f.instagram || f.tel) ? <>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">{t(l, 'official.sub')}</p>
          <div className="flex flex-wrap gap-2">
            {f.homepage && <a href={f.homepage} target="_blank" rel="noopener noreferrer" className="rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-600">{t(l, 'official.visit')}</a>}
            {f.instagram && <a href={f.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-bold text-ink hover:text-insta">{t(l, 'official.insta')}</a>}
            {f.tel && <a href={`tel:${f.tel}`} className="rounded-full border border-line px-5 py-2.5 text-[14px] font-bold text-ink hover:text-brand">{f.tel}{l !== 'ko' && <span className="ml-2 text-[11px] text-hint">{t(l, 'official.telKo')}</span>}</a>}
          </div>
          {l !== 'ko' && <p className="mt-4 text-[13px] leading-relaxed text-muted">{t(l, 'official.helpline')} <a href="tel:1330" className="font-bold text-brand underline">1330</a></p>}
        </> : <p className="text-[15px] text-muted">{t(l, 'detail.noContact')}</p>}
        <p className="mt-6 text-[12px] leading-relaxed text-hint">{t(l, isPublicData(f) ? 'detail.source' : 'detail.source.manual')}</p>
        {/* 공공데이터 동기화 시각이다. 주최 측 확인 날짜(아래 verifiedAt)와 구별한다. */}
        {isPublicData(f) && f.syncedAt && <p className="mt-1 text-[12px] tabular-nums text-hint">{t(l, 'detail.checked', { d: todayKst(new Date(f.syncedAt)) })}</p>}
        {f.verifiedAt && f.verificationSource && <a href={f.verificationSource} target="_blank" rel="noopener noreferrer" className="mt-2 block text-[12px] text-hint underline underline-offset-2">{{ ko: '운영 안내·공식 링크 확인', en: 'Programme and official link checked', ja: '運営案内・公式リンク確認', th: 'ตรวจสอบกำหนดการและลิงก์ทางการ' }[l]} · {f.verifiedAt}</a>}
      </section>
    </div>
  )
}
