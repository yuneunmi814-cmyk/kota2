import assert from 'node:assert/strict'
import test from 'node:test'
import { externalIdsToSlugs, festivalRoutePath, resolveFestivalRoute } from '../lib/festival-routes.ts'

const festivals = new Map([
  ['stdfest:제22회제천국제음악영화제-2026-09-03', { externalId: 'stdfest:제22회제천국제음악영화제-2026-09-03', name: '제22회 제천국제음악영화제' }],
  ['stdfest:2026년재즈페스티벌in가평-2026-10-09', { externalId: 'stdfest:2026년재즈페스티벌in가평-2026-10-09', name: '제23회 자라섬재즈페스티벌' }],
  ['tourapi:2614762', { externalId: 'tourapi:2614762', name: '거제맥주축제' }],
  ['tourapi:140911', { externalId: 'tourapi:140911', name: '홍성남당항 대하축제' }],
  ['tourapi:2751090', { externalId: 'tourapi:2751090', name: '수원화성 미디어아트' }],
  ['tourapi:3351268', { externalId: 'tourapi:3351268', name: '동대문구 맥주축제' }],
])
const find = async (externalId) => festivals.get(externalId)

// 운영 DB의 festival_route_aliases 7행을 그대로 옮긴 것(2026-09-04 실측).
// 실제 조회는 lib/route-aliases.ts가 하고, 여기서는 그 결과만 흉내 낸다.
const ALIASES = {
  'manual-jimff-2026': ['stdfest:제22회제천국제음악영화제-2026-09-03'],
  'kfes-2026-jimff': ['stdfest:제22회제천국제음악영화제-2026-09-03'],
  'manual-jarasum-jazz-2026': ['stdfest:2026년재즈페스티벌in가평-2026-10-09'],
  'stdfest-거제맥주축제-2026-08-23': ['tourapi:2614762'],
  'stdfest-홍성남당항대하축제-2026-08-21': ['tourapi:140911'],
  'stdfest-2026수원화성미디어아트-2026-10-03': ['tourapi:2751090'],
  'stdfest-맥주축제-2026-08-28': ['tourapi:3351268'],
}
const lookup = async (slug) => ALIASES[slug] ?? []

test('과거 JIMFF 주소를 현재 축제로 연결한다', async () => {
  const route = await resolveFestivalRoute('kfes-2026-jimff', find, lookup)

  assert.deepEqual(route, {
    festival: festivals.get('stdfest:제22회제천국제음악영화제-2026-09-03'),
    canonicalSlug: 'stdfest-제22회제천국제음악영화제-2026-09-03',
    isAlias: true,
  })
})

test('상담 당시 현재 주소도 지금 존재하는 축제로 연결한다', async () => {
  const route = await resolveFestivalRoute('manual-jimff-2026', find, lookup)
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
    const route = await resolveFestivalRoute(oldSlug, find, lookup)
    assert.equal(route?.canonicalSlug, currentSlug)
    assert.equal(route?.isAlias, true)
  }
})

// 손으로 적던 코드 표에는 없고 DB에만 있던 항목이다. 표를 하나로 합친 이유가 이것이다.
test('코드 표에 없던 자라섬재즈 옛 주소도 연결한다', async () => {
  const route = await resolveFestivalRoute('manual-jarasum-jazz-2026', find, lookup)
  assert.equal(route?.canonicalSlug, 'stdfest-2026년재즈페스티벌in가평-2026-10-09')
  assert.equal(route?.isAlias, true)
})

// 대장에는 '죽은 영속 ID'가 남는다 — 원천에서 내려간 축제의 출처 ID는 그대로인데
// 그 영속 ID를 가진 축제 행만 사라진다. 첫 후보가 빈손이어도 다음 후보를 봐야 한다.
// (유라리 건맥축제: tourapi가 내리고 표준데이터가 받았는데, 죽은 대장 항목이 별칭을 가로챘다)
test('첫 후보가 사라진 축제를 가리켜도 다음 후보로 이어진다', async () => {
  const lookupWithDead = async (slug) =>
    slug === 'tourapi-3001170'
      ? ['tourapi:3001170', 'tourapi:2614762'] // 앞은 이미 사라진 축제
      : []
  const route = await resolveFestivalRoute('tourapi-3001170', find, lookupWithDead)
  assert.equal(route?.canonicalSlug, 'tourapi-2614762')
  assert.equal(route?.isAlias, true)
})

test('실제로 존재하는 현재 주소는 리다이렉트하지 않는다', async () => {
  const route = await resolveFestivalRoute('tourapi-2614762', find, lookup)
  assert.equal(route?.isAlias, false)
  assert.equal(route?.canonicalSlug, 'tourapi-2614762')
})

test('정상 주소는 별칭 조회를 부르지 않는다', async () => {
  let called = 0
  const counting = async (slug) => {
    called += 1
    return ALIASES[slug] ?? []
  }
  await resolveFestivalRoute('tourapi-2614762', find, counting)
  assert.equal(called, 0)
})

test('한글이 든 현재 주소를 HTTP Location 헤더에 안전한 형태로 만든다', () => {
  assert.equal(
    festivalRoutePath('ko', 'stdfest-제22회제천국제음악영화제-2026-09-03'),
    '/ko/festivals/stdfest-%EC%A0%9C22%ED%9A%8C%EC%A0%9C%EC%B2%9C%EA%B5%AD%EC%A0%9C%EC%9D%8C%EC%95%85%EC%98%81%ED%99%94%EC%A0%9C-2026-09-03/',
  )
})

test('현재 데이터와 별칭에 모두 없는 주소는 찾지 못한다', async () => {
  assert.equal(await resolveFestivalRoute('tourapi-999999', find, lookup), null)
})

// 별칭 표가 아직 없는 환경에서는 조회가 빈 배열을 준다. 그래도 정상 주소는 살아야 한다.
test('별칭 조회를 안 넘겨도 현재 주소는 그대로 열린다', async () => {
  const route = await resolveFestivalRoute('tourapi-140911', find)
  assert.equal(route?.isAlias, false)
  assert.equal(await resolveFestivalRoute('kfes-2026-jimff', find), null)
})

test('경로 목록은 상세 데이터 없이 externalId만 slug로 바꾼다', () => {
  assert.deepEqual(externalIdsToSlugs(['tourapi:140911', 'stdfest:맥주축제-2026-08-28']), [
    'tourapi-140911',
    'stdfest-맥주축제-2026-08-28',
  ])
})
