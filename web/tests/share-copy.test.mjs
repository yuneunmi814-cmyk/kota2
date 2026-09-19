import assert from 'node:assert/strict'
import test from 'node:test'

const share = await import('../lib/share-copy.ts').catch(() => ({}))

test('복사 성공 때만 성공 결과를 돌려주고 현재 URL을 쓴다', async () => {
  assert.equal(typeof share.tryCopyLink, 'function')
  const writes = []
  const result = await share.tryCopyLink('https://ko-ta.co.kr/ja/festivals/tourapi-506600/', {
    writeText: async (value) => { writes.push(value) },
  })
  assert.equal(result, true)
  assert.deepEqual(writes, ['https://ko-ta.co.kr/ja/festivals/tourapi-506600/'])
})

test('클립보드 권한 거부는 예외 없이 실패 결과를 돌려준다', async () => {
  const result = await share.tryCopyLink('https://ko-ta.co.kr/ja/', {
    writeText: async () => { throw new DOMException('Permission denied', 'NotAllowedError') },
  })
  assert.equal(result, false)
})

test('Clipboard API 미지원도 예외 없이 실패 결과를 돌려준다', async () => {
  assert.equal(await share.tryCopyLink('https://ko-ta.co.kr/ja/', undefined), false)
})
