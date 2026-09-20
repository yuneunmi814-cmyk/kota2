import assert from 'node:assert/strict'
import test from 'node:test'

const { localizeAddress } = await import('../lib/address-i18n.ts')

test('도로명주소는 단위별로 옮긴다 — 영어는 좁은 곳부터', () => {
  assert.equal(localizeAddress('경기도 수원시 팔달구 정조로 825', 'en'), '825 Jeongjo-ro, Paldal-gu, Suwon-si, Gyeonggi-do')
  assert.equal(localizeAddress('경기도 수원시 팔달구 정조로 825', 'ja'), '京畿道 水原市 パルダル区 チョンジョ路 825')
  assert.equal(localizeAddress('서울특별시 중구 세종대로 99 (정동)', 'en'), '99 Sejong-daero, Jung-gu, Seoul (Jeong-dong)')
})

test('지번 주소와 숫자가 낀 길 이름', () => {
  assert.equal(localizeAddress('충청남도 당진시 석문면 장고항리 1443', 'en'), '1443 Janggohang-ri, Seongmun-myeon, Dangjin-si, Chungcheongnam-do')
  assert.equal(localizeAddress('울산광역시 울주군 상북면 알프스온천5길 103-8', 'en'), '103-8 Alpeuseuoncheon 5-gil, Sangbuk-myeon, Ulju-gun, Ulsan')
})

test('어떤 주소가 와도 외국어 화면에 한글을 남기지 않는다', () => {
  const samples = [
    '충청남도 부여군 부여읍 정림로 83 부여군 일원(부여 시가지), 공주 (금강신관공원, 미르섬, 공산성, 왕도심 일원)',
    '서울특별시 중구 정동길 3 (정동) 경향신문사 지하 1층',
    '제주특별자치도 서귀포시 성산읍 일출로 284-12',
    '행사장 일원',
    '',
  ]
  for (const a of samples) for (const l of ['en', 'ja', 'th']) assert.doesNotMatch(localizeAddress(a, l), /[가-힣]/, `${l}: ${a}`)
})
