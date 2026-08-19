import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LANGS, isLang, type Lang } from '@/lib/i18n'
import LegalPage, { legalMetadata } from '@/components/LegalPage'

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  return legalMetadata(isLang(lang) ? lang : 'ko', 'privacy')
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return <LegalPage lang={lang as Lang} kind="privacy" />
}
