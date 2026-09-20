import assert from 'node:assert/strict'
import test from 'node:test'
import { detailTextBlocks } from '../lib/detail-text.ts'

test('원문 줄바꿈과 목록만 정돈하고 섞인 일정·요금 사실은 개요에서 빠뜨리지 않는다', () => {
  const raw = '축제 소개  \r\n운영 10:00~18:00<br>입장 무료\n\n- 공연\n- 체험'
  assert.deepEqual(detailTextBlocks(raw), [
    { kind: 'paragraph', lines: ['축제 소개', '운영 10:00~18:00', '입장 무료'] },
    { kind: 'list', items: ['공연', '체험'] },
  ])
})

test('빈 내용은 빈 블록이며 표시 가능한 기호와 문장은 원문대로 남는다', () => {
  assert.deepEqual(detailTextBlocks('  \n  '), [])
  assert.deepEqual(detailTextBlocks('9/13 공연·체험, 신청 필요.'), [
    { kind: 'paragraph', lines: ['9/13 공연·체험, 신청 필요.'] },
  ])
})
