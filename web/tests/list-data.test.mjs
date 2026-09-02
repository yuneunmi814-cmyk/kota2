import assert from 'node:assert/strict'
import test from 'node:test'

// listData가 서버 데이터 모듈의 타입과 변환 함수를 같이 쓴다.
// 이 테스트는 DB를 호출하지 않지만 모듈 로드에 필요한 형식의 가짜 값을 둔다.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-publishable-key'

const { filterListItems, sortListItems } = await import('../lib/list-rules.ts')

const item = (overrides = {}) => ({
  k: 'festival:a',
  n: '서울 밤축제',
  p: '서울 중구',
  s: '2026-09-05',
  e: '2026-09-06',
  st: 'upcoming',
  al: false,
  lr: false,
  db: { kind: 'd-day', days: 3 },
  mf: false,
  m: [9],
  sd: '서울특별시',
  th: ['night'],
  img: null,
  ip: false,
  lat: 37.5665,
  lng: 126.978,
  pop: 10,
  ...overrides,
})

const baseFilters = {
  period: 'all',
  region: null,
  sido: null,
  theme: null,
  graded: false,
  query: '',
  weekend: ['2026-09-05', '2026-09-06'],
}

test('목록 필터는 종료 축제를 빼고 주말·지역·테마·검색어를 함께 적용한다', () => {
  const rows = [
    item(),
    item({ k: 'festival:ended', st: 'ended' }),
    item({ k: 'festival:always', al: true }),
    item({ k: 'festival:busan', sd: '부산광역시', p: '부산 해운대구' }),
    item({ k: 'festival:food', th: ['food'], n: '서울 맛축제' }),
  ]

  const result = filterListItems(rows, {
    ...baseFilters,
    period: 'weekend',
    region: 'seoul',
    theme: 'night',
    query: '밤축제',
  })

  assert.deepEqual(result.map((row) => row.k), ['festival:a'])
})

test('날짜순은 진행중 단기 축제를 먼저, 상시 행사를 마지막에 둔다', () => {
  const rows = [
    item({ k: 'festival:always', al: true, s: '2026-01-01', e: '2026-12-31' }),
    item({ k: 'festival:upcoming', s: '2026-09-10', e: '2026-09-11' }),
    item({ k: 'festival:ongoing', st: 'ongoing', s: '2026-09-01', e: '2026-09-03' }),
  ]

  assert.deepEqual(
    sortListItems(rows, 'date', null).map(({ f }) => f.k),
    ['festival:ongoing', 'festival:upcoming', 'festival:always'],
  )
})

test('거리순과 인기순은 원본 목록을 바꾸지 않는다', () => {
  const rows = [
    item({ k: 'festival:far-popular', lat: 35.1796, lng: 129.0756, pop: 100 }),
    item({ k: 'festival:near', lat: 37.57, lng: 126.98, pop: 1 }),
  ]

  assert.equal(sortListItems(rows, 'distance', { lat: 37.5665, lng: 126.978 })[0].f.k, 'festival:near')
  assert.equal(sortListItems(rows, 'popularity', null)[0].f.k, 'festival:far-popular')
  assert.deepEqual(rows.map((row) => row.k), ['festival:far-popular', 'festival:near'])
})
