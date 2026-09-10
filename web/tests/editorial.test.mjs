import assert from 'node:assert/strict'
import test from 'node:test'
import { applyEditorial, editorialField } from '../lib/editorial.ts'

const festival = (patch = {}) => ({
  id: 1, externalId: 'tourapi:3113583', name: '차 없는 잠수교 뚜벅뚜벅축제',
  startDate: '2026-09-06', endDate: '2026-10-25',
  translations: [{ langCode: 'en', name: 'Cha Eomneun Jamsugyo Walking Festival', summary: 'Retain existing description.', placeName: 'Seoul' }],
  ...patch,
})

test('autumn Jamsugyo carries its Sunday-only schedule and reviewed names without mutating input', () => {
  const input = festival()
  const snapshot = structuredClone(input)
  const [out] = applyEditorial([input])
  assert.match(out.hours, /매주 일요일 14:00~22:00/)
  assert.equal(out.translations.find(t => t.langCode === 'en').name, 'Car-free Jamsugyo Walking Festival')
  assert.equal(out.translations[0].summary, 'Retain existing description.')
  assert.equal(out.translations[0].placeName, 'Seoul')
  assert.equal(out.verifiedAt, '2026-09-11')
  assert.deepEqual(input, snapshot)
  assert.deepEqual(applyEditorial([out]), [out])
})

test('reused ID in 2027 never receives the previous edition’s editorial data', () => {
  const input = festival({ startDate: '2027-09-06', endDate: '2027-10-25' })
  assert.equal(applyEditorial([input])[0], input)
})

test('spring edition and changed dates do not acquire autumn operating details', () => {
  for (const patch of [
    { startDate: '2026-04-26', endDate: '2026-06-14' },
    { endDate: '2026-10-18' },
  ]) {
    const [out] = applyEditorial([festival(patch)])
    assert.equal(out.hours, undefined)
    assert.equal(out.verifiedAt, undefined)
  }
})

test('verified source alias and exact name plus dates work without fragile numeric DB IDs', () => {
  for (const patch of [
    { externalId: 'festival:uuid', sourceIds: ['tourapi:3113583'], name: '차 없는 잠수교 뚜벅뚜벅축제' },
    { externalId: 'another-source:1' },
  ]) assert.match(applyEditorial([festival(patch)])[0].hours, /매주 일요일/)
})

test('partial names never match and name-only changes do not imply official verification', () => {
  const unrelated = festival({ externalId: 'another-source:1', name: '차 없는 잠수교 뚜벅뚜벅축제 전야제' })
  assert.equal(applyEditorial([unrelated])[0], unrelated)
  const [crafts] = applyEditorial([festival({
    externalId: 'stdfest:청주전통공예페스티벌-2026-09-17', name: '청주전통공예페스티벌',
    startDate: '2026-09-17', endDate: '2026-09-27', translations: [],
  })])
  assert.equal(crafts.translations.find(t => t.langCode === 'en').name, 'Cheongju Traditional Crafts Festival')
  assert.equal(crafts.verifiedAt, undefined)
})

test('Heunghae detail only applies once its official dates have been corrected', () => {
  const input = festival({ externalId: 'stdfest:포항흥해국가유산야행-2026-06-12', name: '포항 흥해 국가유산야행', startDate: '2026-06-12', endDate: '2026-10-04' })
  assert.equal(applyEditorial([input])[0].hours, undefined)
  const [corrected] = applyEditorial([{ ...input, startDate: '2026-09-11', endDate: '2026-09-12' }])
  assert.equal(corrected.hours, '16:00~22:00')
  assert.match(corrected.program, /암각화/)
})


test('reviewed programmes and Sunday-only hours read in each supported language', () => {
  const [out] = applyEditorial([festival()])
  assert.match(editorialField(out, 'en', 'hours'), /Sundays only/)
  assert.match(editorialField(out, 'ja', 'hours'), /日曜日のみ/)
  assert.match(editorialField(out, 'th', 'hours'), /เฉพาะวันอาทิตย์/)
  for (const lang of ['en', 'ja', 'th']) {
    assert.ok(editorialField(out, lang, 'program'))
    assert.doesNotMatch(editorialField(out, lang, 'program'), /[가-힣]/)
    assert.notEqual(editorialField(out, lang, 'program'), out.program)
  }
  assert.equal(editorialField(out, 'ko', 'program'), out.program)
  assert.equal(editorialField(out, 'fr', 'program'), out.program)
})

test('all four verified events get programme translations without losing existing descriptions', () => {
  const cases = [
    ['stdfest:포항흥해국가유산야행-2026-06-12', '포항 흥해 국가유산야행', '2026-09-11', '2026-09-12'],
    ['tourapi:3113583', '차 없는 잠수교 뚜벅뚜벅축제', '2026-09-06', '2026-10-25'],
    ['tourapi:2640874', '서울라이트 DDP 가을', '2026-09-03', '2026-09-13'],
    ['tourapi:1018469', '서울국제작가축제', '2026-09-11', '2026-09-16'],
  ]
  for (const [externalId, name, startDate, endDate] of cases) {
    const [out] = applyEditorial([festival({ externalId, name, startDate, endDate })])
    for (const lang of ['en', 'ja', 'th']) {
      assert.ok(out.translations.find(t => t.langCode === lang)?.program)
      assert.doesNotMatch(editorialField(out, lang, 'program'), /[가-힣]/)
    }
    assert.equal(out.translations[0].summary, 'Retain existing description.')
    assert.deepEqual(applyEditorial([out]), [out])
  }
})

test('date guard also prevents translated event details from leaking into another season', () => {
  const [out] = applyEditorial([festival({ startDate: '2026-04-26', endDate: '2026-06-14' })])
  assert.equal(editorialField(out, 'en', 'hours'), undefined)
  assert.equal(out.translations.find(t => t.langCode === 'en').program, undefined)
})
