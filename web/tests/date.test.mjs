import assert from 'node:assert/strict'
import test from 'node:test'
import { festivalStatus, todayKst, weekendRange } from '../lib/date.ts'
import { dayBadge, isAlwaysOn, isLongRun } from '../lib/festival-fields.ts'

test('장기 행사는 오늘 공연을 보장하지 않는 운영 기간 배지를 쓴다', () => {
  const long = { startDate: '2026-05-01', endDate: '2026-10-31' }
  assert.deepEqual(dayBadge(long, '2026-09-19'), { kind: 'inPeriod' })
  assert.deepEqual(dayBadge(long, '2026-10-31'), { kind: 'inPeriod' })
  assert.equal(dayBadge(long, '2026-11-01'), null)
  assert.deepEqual(dayBadge({ startDate: '2026-09-18', endDate: '2026-09-20' }, '2026-09-19'), { kind: 'ongoing' })
  assert.deepEqual(dayBadge({ startDate: '2026-09-18', endDate: '2026-09-20' }, '2026-09-20'), { kind: 'endsToday' })
})

test('상시 기준은 날짜 차이 299/300일, 장기는 양끝 포함 60/61일이다', () => {
  assert.equal(isAlwaysOn({ startDate: '2026-01-01', endDate: '2026-10-27' }), false)
  assert.equal(isAlwaysOn({ startDate: '2026-01-01', endDate: '2026-10-28' }), true)
  assert.equal(isLongRun({ startDate: '2026-01-01', endDate: '2026-03-01' }), false)
  assert.equal(isLongRun({ startDate: '2026-01-01', endDate: '2026-03-02' }), true)
})

test('한국 자정 직후에는 UTC 전날이 아니라 한국 날짜를 반환한다', () => {
  assert.equal(todayKst(new Date('2026-09-02T15:00:00Z')), '2026-09-03')
})

test('축제 시작일과 종료일을 모두 진행 중으로 판단한다', () => {
  assert.equal(festivalStatus('2026-09-03', '2026-09-08', '2026-09-03'), 'ongoing')
  assert.equal(festivalStatus('2026-09-03', '2026-09-08', '2026-09-08'), 'ongoing')
  assert.equal(festivalStatus('2026-09-03', '2026-09-08', '2026-09-09'), 'ended')
})

test('평일에는 돌아오는 토요일과 일요일을 반환한다', () => {
  assert.deepEqual(weekendRange('2026-09-03'), ['2026-09-05', '2026-09-06'])
})

test('일요일에는 지나간 토요일을 다시 포함하지 않는다', () => {
  assert.deepEqual(weekendRange('2026-09-06'), ['2026-09-06', '2026-09-06'])
})
