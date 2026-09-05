import assert from 'node:assert/strict'
import test from 'node:test'
import { detailMetadata } from '../lib/detail-metadata.ts'

test('metadata keeps official domain, externalId trailing-slash URLs and four language alternates', () => {
  const f = { externalId: 'tourapi:fixture', name: '한국 축제', startDate: '2026-09-15', endDate: '2026-09-20', translations: [{ langCode: 'th', name: 'เทศกาล' }] }
  for (const lang of ['ko', 'en', 'ja', 'th']) {
    const result = detailMetadata(f, lang)
    assert.equal(result.alternates.canonical, `https://ko-ta.co.kr/${lang}/festivals/tourapi-fixture/`)
    assert.equal(Object.keys(result.alternates.languages).length, 4)
    assert.equal(result.title, lang === 'th' ? 'เทศกาล · KOTA' : '한국 축제 · KOTA')
  }
})
