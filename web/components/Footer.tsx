import Link from 'next/link'
import { t } from '@/lib/ui'
import type { Lang } from '@/lib/i18n'
import { legalDoc, LEGAL_KINDS } from '@/lib/legal'

// 운영자 표시 — 누가 만든 곳인지 모르는 사이트의 정보는 믿기 어렵다.
//
// 법이 요구해서 넣은 것은 아니다. 전자상거래법 제10조의 표시 의무는 '전자상거래를 하는 사이버몰'에
// 붙는데, KOTA는 아무것도 팔지 않는다. 그래서 그 조문이 요구하는 주소·전화번호는 넣지 않았다 —
// 1인 사업자에게 그것은 집 주소와 개인 번호다. 상호·대표·사업자등록번호·문의 주소면 신원 확인에 충분하다.
export const OPERATOR_EMAIL = 'hello@projectyoon.com'
const BIZ_NO = '227-21-21925'
const OPERATOR: Record<Lang, string> = {
  ko: `운영 프로젝트윤 · 대표 윤은미 · 사업자등록번호 ${BIZ_NO}`,
  en: `Operated by Project Yoon (프로젝트윤) · Representative Yoon Eunmi · Business registration no. ${BIZ_NO}`,
  ja: `運営 プロジェクトユン(Project Yoon) · 代表 ユン・ウンミ · 事業者登録番号 ${BIZ_NO}`,
  th: `ดำเนินการโดย Project Yoon (프로젝트윤) · ผู้แทน Yoon Eunmi · เลขทะเบียนธุรกิจ ${BIZ_NO}`,
}

export default function Footer({ lang, band = true }: { lang: Lang; band?: boolean }) {
  return (
    <footer className="border-t border-line bg-paper-2/60">
      {band && <div aria-hidden className="pattern-changsal-band border-b border-line" />}
      <div className="mx-auto max-w-6xl space-y-3 px-5 py-10 text-[13px] text-hint">
        {/* 법적고지는 모든 화면에서 두 번 안에 닿아야 한다 — 푸터가 그 자리다 */}
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_KINDS.map((k) => (
            <Link key={k} href={`/${lang}/${k}/`} className="font-semibold text-muted underline underline-offset-4 hover:text-ink">
              {legalDoc(lang, k).title}
            </Link>
          ))}
        </nav>
        <p>{t(lang, 'foot.disclaimer')}</p>
        <p>{t(lang, 'foot.source')} · © 2026 KOTA</p>
        <p>
          {OPERATOR[lang]} ·{' '}
          <a href={`mailto:${OPERATOR_EMAIL}`} className="underline underline-offset-4 hover:text-ink">{OPERATOR_EMAIL}</a>
        </p>
      </div>
    </footer>
  )
}
