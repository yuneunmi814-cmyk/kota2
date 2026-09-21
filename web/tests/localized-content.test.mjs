import assert from 'node:assert/strict'
import test from 'node:test'
import { localized } from '../lib/festival-fields.ts'

const festival = { externalId: 'tourapi:589386', name: '부천국제만화축제', summary: '한국어 소개', fee: '유료 5,000원 (사전신청 3,000원)', translations: [] }

test('missing or blank translated summary is explicitly marked as Korean original', () => {
  assert.equal(localized(festival, 'ja').summaryIsOriginal, true)
  assert.equal(localized({ ...festival, translations: [{ langCode: 'ja', summary: '   ' }] }, 'ja').summaryIsOriginal, true)
  assert.equal(localized(festival, 'ko').summaryIsOriginal, false)
  assert.equal(localized({ ...festival, summary: null }, 'ja').summaryIsOriginal, false)
})

test('translated summary is retained and not marked as Korean fallback', () => {
  const out = localized({ ...festival, translations: [{ langCode: 'ja', summary: '漫画のお祭りです。' }] }, 'ja')
  assert.equal(out.summary, '漫画のお祭りです。')
  assert.equal(out.summaryIsOriginal, false)
})

test('known admission fee pattern preserves both normal and advance amounts in Japanese', () => {
  const out = localized(festival, 'ja')
  assert.equal(out.fee, '有料 5,000ウォン (事前申込 3,000ウォン)')
  assert.equal(out.feeIsOriginal, false)
})

test('simple free admission is localized in all supported visitor languages', () => {
  for (const [lang, fee] of [['en', 'Free'], ['ja', '無料'], ['th', 'ฟรี']]) {
    const out = localized({ ...festival, fee: '무료' }, lang)
    assert.equal(out.fee, fee)
    assert.equal(out.feeIsOriginal, false)
  }
})

test('unrecognized conditions remain intact and clearly marked instead of guessed', () => {
  const fee = '무료 (특별 체험비 별도, 사전 예약 필수)'
  const out = localized({ ...festival, fee }, 'ja')
  assert.equal(out.fee, fee)
  assert.equal(out.feeIsOriginal, true)
  assert.equal(localized({ ...festival, fee: null }, 'ja').fee, null)
  assert.equal(localized(festival, 'ko').fee, festival.fee)
})

test('free entry with paid activities preserves the charge qualification', () => {
 const out=localized({...festival,fee:'무료 (체험부스 일부 유료)'},'ja')
 assert.equal(out.fee,'無料 (一部の体験は有料)')
 assert.equal(out.feeIsOriginal,false)
 assert.equal(localized({...festival,fee:'유료(8,000원)'},'en').fee,'Paid admission 8,000 KRW')
})
