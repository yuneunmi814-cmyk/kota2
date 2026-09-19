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

test('흡수된 원천 ID가 같으면 지역 접두사가 붙은 다른 이름도 제외한다', () => {
  const index = buildAbsorbedIndex([{
    name: '영주 풍기인삼축제', externalId: 'tourapi:506766', sigungu: '영주시',
    startDate: '2026-10-03', endDate: '2026-10-11', sources: ['tourapi', 'stdfest'],
    sourceIds: ['tourapi:506766', 'stdfest:경북영주풍기인삼축제-2026-10-03'],
  }])
  assert.equal(isAbsorbed(index, {
    externalId: 'stdfest:경북영주풍기인삼축제-2026-10-03', name: '경북영주 풍기인삼축제',
    sigungu: '영주시', startDate: '2026-10-03', endDate: '2026-10-11',
  }, 'stdfest'), true)
})

test('흡수 ID가 다른 같은 이름의 다음 회차는 제외하지 않는다', () => {
  const index = buildAbsorbedIndex([{
    name: '영주 풍기인삼축제', externalId: 'tourapi:506766', sigungu: '영주시',
    startDate: '2026-10-03', endDate: '2026-10-11', sources: ['tourapi', 'stdfest'],
    sourceIds: ['stdfest:영주풍기인삼축제-2026-10-03'],
  }])
  assert.equal(isAbsorbed(index, {
    externalId: 'stdfest:영주풍기인삼축제-2026-11-03', name: '영주 풍기인삼축제',
    sigungu: '영주시', startDate: '2026-11-03', endDate: '2026-11-11',
  }, 'stdfest'), false)
})

test('저장된 원천 ID가 있으면 겹치는 기간의 다른 원천 ID를 이름만으로 제외하지 않는다', () => {
  const index = buildAbsorbedIndex([{
    name: '주말 음악 공연', externalId: 'tourapi:series', sigungu: '서귀포시',
    startDate: '2026-04-25', endDate: '2026-10-31', sources: ['tourapi', 'stdfest'],
    sourceIds: ['stdfest:주말음악공연-2026-04-25'],
  }])
  assert.equal(isAbsorbed(index, {
    externalId: 'stdfest:주말음악공연별도회차-2026-05-02', name: '주말 음악 공연',
    sigungu: '서귀포시', startDate: '2026-05-02', endDate: '2026-10-31',
  }, 'stdfest'), false)
})
