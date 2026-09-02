import assert from 'node:assert/strict'
import test from 'node:test'
import { externalIdsToSlugs, festivalRoutePath, resolveFestivalRoute } from '../lib/festival-routes.ts'

const festivals = new Map([
  ['stdfest:제22회제천국제음악영화제-2026-09-03', { externalId: 'stdfest:제22회제천국제음악영화제-2026-09-03', name: '제22회 제천국제음악영화제' }],
  ['tourapi:2614762', { externalId: 'tourapi:2614762', name: '거제맥주축제' }],
  ['tourapi:140911', { externalId: 'tourapi:140911', name: '홍성남당항 대하축제' }],
  ['tourapi:2751090', { externalId: 'tourapi:2751090', name: '수원화성 미디어아트' }],
  ['tourapi:3351268', { externalId: 'tourapi:3351268', name: '동대문구 맥주축제' }],
])
const find = async (externalId) => festivals.get(externalId)

test('과거 JIMFF 주소를 현재 축제로 연결한다', async () => {
  const route = await resolveFestivalRoute('kfes-2026-jimff', find)

  assert.deepEqual(route, {
    festival: festivals.get('stdfest:제22회제천국제음악영화제-2026-09-03'),
    canonicalSlug: 'stdfest-제22회제천국제음악영화제-2026-09-03',
    isAlias: true,
  })
})

test('상담 당시 현재 주소도 지금 존재하는 축제로 연결한다', async () => {
  const route = await resolveFestivalRoute('manual-jimff-2026', find)
  assert.equal(route?.canonicalSlug, 'stdfest-제22회제천국제음악영화제-2026-09-03')
  assert.equal(route?.isAlias, true)
})

test('공식 자료로 확인한 과거 ID 네 개를 현재 축제로 연결한다', async () => {
  const cases = [
    ['stdfest-거제맥주축제-2026-08-23', 'tourapi-2614762'],
    ['stdfest-홍성남당항대하축제-2026-08-21', 'tourapi-140911'],
    ['stdfest-2026수원화성미디어아트-2026-10-03', 'tourapi-2751090'],
    ['stdfest-맥주축제-2026-08-28', 'tourapi-3351268'],
  ]

  for (const [oldSlug, currentSlug] of cases) {
    const route = await resolveFestivalRoute(oldSlug, find)
    assert.equal(route?.canonicalSlug, currentSlug)
    assert.equal(route?.isAlias, true)
  }
})

test('실제로 존재하는 현재 주소는 리다이렉트하지 않는다', async () => {
  const route = await resolveFestivalRoute('stdfest-제22회제천국제음악영화제-2026-09-03', find)
  assert.equal(route?.isAlias, false)
})

test('한글이 든 현재 주소를 HTTP Location 헤더에 안전한 형태로 만든다', () => {
  assert.equal(
    festivalRoutePath('ko', 'stdfest-제22회제천국제음악영화제-2026-09-03'),
    '/ko/festivals/stdfest-%EC%A0%9C22%ED%9A%8C%EC%A0%9C%EC%B2%9C%EA%B5%AD%EC%A0%9C%EC%9D%8C%EC%95%85%EC%98%81%ED%99%94%EC%A0%9C-2026-09-03/',
  )
})

test('현재 데이터와 별칭에 모두 없는 주소는 찾지 못한다', async () => {
  assert.equal(await resolveFestivalRoute('kfes-does-not-exist', find), null)
})

test('경로 목록은 상세 데이터 없이 externalId만 slug로 바꾼다', () => {
  assert.deepEqual(
    externalIdsToSlugs(['tourapi:506523', 'manual:jimff-2026']),
    ['tourapi-506523', 'manual-jimff-2026'],
  )
})
