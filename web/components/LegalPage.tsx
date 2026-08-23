import Link from 'next/link'
import { LANGS, SITE_URL, type Lang } from '@/lib/i18n'
import { legalDoc, LEGAL_KINDS, type LegalKind } from '@/lib/legal'
import { t } from '@/lib/ui'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// 법적고지 세 문서가 같은 껍데기를 쓴다.
//
// 세 페이지를 따로 만들지 않은 이유: 이 화면들은 서로를 오가야 한다(처리방침을 읽다가
// 약관으로). 한 컴포넌트에 두면 그 이동 링크가 저절로 세 곳 모두에서 같게 나온다.

export function legalMetadata(l: Lang, kind: LegalKind) {
  const doc = legalDoc(l, kind)
  return {
    title: `${doc.title} · KOTA`,
    alternates: {
      canonical: `${SITE_URL}/${l}/${kind}/`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/${kind}/`])),
    },
  }
}

export default function LegalPage({ lang, kind }: { lang: Lang; kind: LegalKind }) {
  const doc = legalDoc(lang, kind)
  return (
    <>
      {/* kind가 곧 주소 조각이다("terms"·"privacy"·"disclaimer"). 이걸 안 넘기면
          언어를 바꿀 때 읽던 약관을 잃고 그 언어 홈으로 떨어진다. 바로 위
          legalMetadata()는 이미 /{l}/{kind}/ 로 hreflang을 만들고 있어서,
          검색엔진에 알리는 주소와 화면 링크가 서로 달랐다. */}
      <Header lang={lang} path={kind} />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">{doc.title}</h1>
        <p className="mt-2 text-[13px] text-hint">
          {t(lang, 'legal.updated')} {doc.updated}
        </p>
        <p className="mt-5 text-[15px] leading-[1.75] text-muted">{doc.intro}</p>

        <div className="mt-9 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[17px] font-bold text-ink">{s.h}</h2>
              {s.p?.map((line) => (
                <p key={line} className="mt-3 text-[15px] leading-[1.75] text-muted">
                  {line}
                </p>
              ))}
              {s.ul && (
                <ul className="mt-3 space-y-2">
                  {s.ul.map((line) => (
                    <li key={line} className="flex gap-2 text-[15px] leading-[1.75] text-muted">
                      <span aria-hidden className="mt-[9px] h-[3px] w-[3px] shrink-0 rounded-full bg-hint" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-[14px]">
          {LEGAL_KINDS.filter((k) => k !== kind).map((k) => (
            <Link key={k} href={`/${lang}/${k}/`} className="font-semibold text-brand underline underline-offset-4">
              {legalDoc(lang, k).title}
            </Link>
          ))}
        </nav>
      </main>
      <Footer lang={lang} />
    </>
  )
}
