import assert from 'node:assert/strict'
import test from 'node:test'
import { festivalStatus, todayKst, weekendRange } from '../lib/date.ts'

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
