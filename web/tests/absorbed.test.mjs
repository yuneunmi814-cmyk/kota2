import assert from 'node:assert/strict'
import test from 'node:test'
import { bareName, buildAbsorbedIndex, isAbsorbed } from '../lib/absorbed.ts'

test('이름에서 연도·회차·축제 접미사와 공백을 떼고 같은 열쇠로 만든다', () => {
  assert.equal(bareName('2026 한국유교문화축전'), bareName('한국유교문화축전'))
  assert.equal(bareName('강경 국가유산 야행'), bareName('강경 국가유산야행'))
  assert.equal(bareName('제38회 춘천인형극제'), bareName('춘천인형극제'))
})

// 실측 사건 고정 — 2026-09-04 라이브에서 같은 축제가 두 장 떴다.
// DB: 한국유교문화축전 09-12~09-20, 대표는 tourapi인데 sources에 stdfest가 들어 있다.
// 실시간 표준데이터: 2026 한국유교문화축전 09-12~09-13. 기간이 안 겹쳐 기간겹침 판정으론 못 잡는다.
const 유교 = {
  name: '한국유교문화축전',
  externalId: 'tourapi:3530743',
  sigungu: '논산시',
  sources: ['tourapi', 'kfes', 'stdfest'],
}

test('대표가 아닌 원천으로 흡수된 축제가 다시 들어오면 걸러낸다', () => {
  const index = buildAbsorbedIndex([유교])
  assert.equal(isAbsorbed(index, { name: '2026 한국유교문화축전', sigungu: '논산시' }, 'stdfest'), true)
})

test('대표 원천과 같은 원천은 이 규칙을 쓰지 않는다', () => {
  // tourapi는 대표라 대표 ID로 정확히 짝지을 수 있다. 여기서 걸러내면 안 된다.
  const index = buildAbsorbedIndex([유교])
  assert.equal(isAbsorbed(index, { name: '한국유교문화축전', sigungu: '논산시' }, 'tourapi'), false)
})

test('흡수한 적 없는 원천은 걸러내지 않는다', () => {
  const index = buildAbsorbedIndex([유교])
  assert.equal(isAbsorbed(index, { name: '한국유교문화축전', sigungu: '논산시' }, 'manual'), false)
})

test('지역이 다르면 이름이 같아도 다른 축제로 둔다', () => {
  const index = buildAbsorbedIndex([유교])
  assert.equal(isAbsorbed(index, { name: '한국유교문화축전', sigungu: '안동시' }, 'stdfest'), false)
})

test('지역을 모르면(실시간 TourAPI 응답) 어긋났다고 보지 않는다', () => {
  const index = buildAbsorbedIndex([유교])
  assert.equal(isAbsorbed(index, { name: '한국유교문화축전', sigungu: null }, 'stdfest'), true)
})

test('한 해에 두 번 여는 같은 원천 축제는 살아남는다', () => {
  // 무창포 신비의바닷길은 봄·가을 두 번 열리고 둘 다 표준데이터에서 온다.
  // 대표가 stdfest이므로 흡수 목록에 stdfest가 들어가지 않는다 → 두 번째 회차가 지워지지 않는다.
  const 무창포 = {
    name: '무창포 신비의바닷길 축제',
    externalId: 'stdfest:무창포신비의바닷길-2026-04-17',
    sigungu: '보령시',
    sources: ['stdfest'],
  }
  const index = buildAbsorbedIndex([무창포])
  assert.equal(isAbsorbed(index, { name: '무창포 신비의바닷길 축제', sigungu: '보령시' }, 'stdfest'), false)
})

test('출처를 모르면 걸러내지 않는다', () => {
  const index = buildAbsorbedIndex([유교])
  assert.equal(isAbsorbed(index, { name: '한국유교문화축전', sigungu: '논산시' }, ''), false)
})
