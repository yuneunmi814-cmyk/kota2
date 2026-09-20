import test from 'node:test'
import assert from 'node:assert/strict'
import { extractImageCandidates } from './image-candidates.js'
test('extracts reversed OG attributes, lazy extensionless images and attachments; deduplicates', () => {
  assert.deepEqual(extractImageCandidates(`<meta content="/photo?id=1&amp;size=l" property="og:image"><img data-src='/photo?id=1&amp;size=l'><a href="/download?file=2">포스터</a><img src=/actual.webp><img src="/logo.png"><img src="data:image/png;base64,AA">`, 'https://example.org/event'), ['https://example.org/photo?id=1&size=l','https://example.org/download?file=2','https://example.org/actual.webp'])
})
test('rejects local URLs and malformed candidates without stopping review collection', () => {
  assert.deepEqual(extractImageCandidates(`<img src='http://127.0.0.1/a.png'><img src='http://[::1]/x'><img src='https://example.org/good.png'>`, 'https://example.org'), ['https://example.org/good.png'])
})
