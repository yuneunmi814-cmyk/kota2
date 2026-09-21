import { festivalContacts, HELPLINE_URL } from '@/lib/contact'
import { menuLabel, menuHints, menuTranslationUrl } from '@/lib/menu'
import { operatingDaysLabel } from '@/lib/operating-days'
import { editorialField } from '@/lib/editorial'
import { feeKind, isAlwaysOn, isLongRun, isPublicData, type Festival } from '@/lib/festivals'
import { localized } from '@/lib/festival-fields'
import { localizeAddress } from '@/lib/address-i18n'
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
  const contacts = festivalContacts(f)
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
            <p className="mb-3 text-[13px] leading-relaxed text-muted">{t(l, 'menu.note')}</p>
            <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
              {f.booths!.map((b, i) => (
                <details key={`${b.name}-${i}`} className="group px-4 py-3" open={boothCount <= 3}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                    <span>{b.name}</span><span className="shrink-0 text-[12px] font-semibold text-hint">{t(l, 'detail.menu.n', { n: b.menu.length })}</span>
                  </summary>
                  {b.menu.length > 0 && <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2">
                    {b.menu.map((m, j) => { const translated = menuLabel(m.name, l); return <li key={`${m.name}-${j}`} className="flex items-baseline justify-between gap-3 border-b border-dotted border-line pb-1">
                      <span className="min-w-0 text-ink/85">
                        <span>{translated.label}</span>
                        {l !== 'ko' && translated.label !== m.name && <span lang="ko" className="mt-0.5 block select-all text-xs text-muted">{m.name}</span>}
                        {l !== 'ko' && translated.partial && <a href={menuTranslationUrl(m.name, l)} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold text-brand underline">{t(l, 'menu.partial')}</a>}
                        <span className="mt-1 flex flex-wrap gap-1">{menuHints(m.name).map(hint => <span key={hint} className="rounded border border-line px-1.5 py-0.5 text-xs">{t(l, `menu.${hint}`)}</span>)}</span>
                      </span>
                      {m.price != null && <span className="shrink-0 tabular-nums font-bold text-brand">{t(l, 'detail.won', { n: m.price.toLocaleString(l === 'ko' ? 'ko-KR' : 'en-US') })}</span>}
                    </li> })}
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
        {/* 외국어 화면: 위에는 현지 표기 주소, 아래에는 한국어 주소를 '왜 있는지' 밝혀서 둔다.
            한국어 주소는 택시 기사에게 보여 주거나 한국 지도 앱에 붙여 넣을 때 필요하다 */}
        {l === 'ko' || !f.address ? (
          (f.address || L.placeName) && <p className="mb-4 text-[15px] font-semibold text-ink">{f.address ?? L.placeName}</p>
        ) : (
          <div className="mb-4">
            <p className="text-[15px] font-semibold text-ink">{localizeAddress(f.address, l)}</p>
            <div className="mt-2 rounded-lg border border-line bg-paper-2/60 px-3 py-2">
              <p className="text-[12px] leading-snug text-muted">{t(l, 'detail.koAddress')}</p>
              <p lang="ko" className="mt-0.5 select-all text-[15px] font-semibold text-ink">{f.address}</p>
              <details className="mt-3">
                <summary className="cursor-pointer font-bold text-brand">{t(l, 'detail.showAddress')}</summary>
                <div lang="ko" className="mt-3 select-all rounded-lg bg-paper p-5 text-xl font-bold leading-relaxed text-ink"><p>{f.name}</p><p className="mt-3">{f.address}</p></div>
              </details>
            </div>
          </div>
        )}
        {hasCoords ? <KakaoMap lat={f.lat as number} lng={f.lng as number} label={f.address ?? L.placeName ?? L.name} displayLabel={l !== 'ko' && f.address ? localizeAddress(f.address, l) : undefined} festivalId={f.externalId} linkLabel={t(l, 'map.open')} loadingLabel={t(l, 'map.loading')} /> : <p className="text-[15px] text-muted">{t(l, 'detail.noLocation')}</p>}
        {mapHref && <a href={mapHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-kakao px-5 py-2.5 text-[14px] font-bold text-kakao-ink hover:brightness-95"><Icon name="pin" size={16} />{t(l, 'detail.directions')}</a>}
      </section>

      <section id="contact" className={sectionClass}>
        <h2 className={headingClass}>{t(l, 'detail.contact')}</h2>
        {f.organizer && <dl className="mb-4 border-t border-line"><Fact label={t(l, 'detail.organizer')}>{f.organizer}{l !== 'ko' && /[가-힣]/.test(f.organizer) && <p className="mt-1 text-[13px] leading-relaxed text-muted">{t(l, 'detail.koOrganizer')}</p>}</Fact></dl>}
        {(contacts.homepage || contacts.instagram || contacts.email || f.tel) ? <>
          <p className="mb-4 text-[13px] leading-relaxed text-muted">{t(l, 'official.sub')}</p>
          <div className="flex flex-wrap gap-2">
            {contacts.homepage && <a href={contacts.homepage} target="_blank" rel="noopener noreferrer" className="rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold text-white hover:bg-brand-600">{t(l, 'official.visit')}</a>}
            {contacts.instagram && <a href={contacts.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-5 py-2.5 text-[14px] font-bold text-ink hover:text-insta">{t(l, 'official.insta')}</a>}
            {contacts.email && <a href={`mailto:${contacts.email}`} className="break-all rounded-full border border-line px-5 py-2.5 text-[14px] font-bold text-ink">{contacts.email}</a>}
          </div>
          {f.tel && <div className="mt-4 text-[14px] text-muted">
            <p className="mb-2 text-xs">{t(l, 'official.telKo')}</p>
            <p>{f.tel}</p>
            <div className="mt-2 flex flex-wrap gap-2">{contacts.phones.map(phone => <a key={phone.href} href={phone.href} className="rounded-full border border-line px-4 py-2 font-bold text-ink hover:text-brand">{phone.label}</a>)}</div>
          </div>}
        </> : <p className="text-[15px] text-muted">{t(l, 'detail.noContact')}</p>}
        <div className="mt-5 rounded-lg border border-line bg-paper-2/60 p-4 text-[13px] leading-relaxed text-muted">
          <p>{t(l, 'official.helpline')}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 font-bold text-brand">
            <a href="tel:1330" className="underline">{t(l, 'contact.korea')}</a>
            <a href="tel:+8221330" className="underline">{t(l, 'contact.overseas')}</a>
            <a href={HELPLINE_URL} target="_blank" rel="noopener noreferrer" className="underline">{t(l, 'contact.chat')}</a>
          </div>
        </div>
        <p className="mt-6 text-[12px] leading-relaxed text-hint">{t(l, isPublicData(f) ? 'detail.source' : 'detail.source.manual')}</p>

      </section>
    </div>
  )
}
