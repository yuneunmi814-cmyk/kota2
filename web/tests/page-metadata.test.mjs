import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import * as metadata from '../lib/i18n.ts'
const pageMetadata = metadata.pageMetadata
const require = createRequire(import.meta.url)
const { resolveTitle } = require('next/dist/lib/metadata/resolvers/resolve-title.js')
const { resolveImages } = require('next/dist/lib/metadata/resolvers/resolve-opengraph.js')

test('absolute URLs collapse repeated separators without changing the https scheme', () => {
  assert.equal(metadata.absUrl('ko', '//themes//food//'), 'https://ko-ta.co.kr/ko/themes/food/')
})

test('home keeps its absolute title while sharing its own URL and description', () => {
  const meta = pageMetadata({ lang: 'ko', path: '', title: 'KOTA — 내 여행지 주변 축제', description: '내 주변 축제', absoluteTitle: true })
  assert.deepEqual(meta.title, { absolute: 'KOTA — 내 여행지 주변 축제' })
  assert.equal(meta.alternates.canonical, 'https://ko-ta.co.kr/ko/')
  assert.equal(meta.openGraph.url, 'https://ko-ta.co.kr/ko/')
  assert.equal(meta.openGraph.title, 'KOTA — 내 여행지 주변 축제')
  assert.equal(meta.twitter.title, 'KOTA — 내 여행지 주변 축제')
  assert.equal(meta.twitter.description, '내 주변 축제')
})

test('the theme share card follows the Japanese theme URL instead of the home URL', () => {
  const meta = pageMetadata({ lang: 'ja', path: 'themes/food', title: 'グルメ', description: '地域のグルメ' })
  assert.equal(meta.title, 'グルメ')
  assert.equal(meta.alternates.canonical, 'https://ko-ta.co.kr/ja/themes/food/')
  assert.equal(meta.openGraph.url, 'https://ko-ta.co.kr/ja/themes/food/')
  assert.equal(meta.openGraph.title, 'グルメ')
  assert.equal(meta.twitter.title, 'グルメ')
  assert.equal(meta.twitter.description, '地域のグルメ')
  assert.deepEqual(meta.alternates.languages, {
    ko: 'https://ko-ta.co.kr/ko/themes/food/', en: 'https://ko-ta.co.kr/en/themes/food/',
    ja: 'https://ko-ta.co.kr/ja/themes/food/', th: 'https://ko-ta.co.kr/th/themes/food/',
    // 네 언어 어디에도 안 맞는 방문자용 — 외국인 여행자가 주 대상이라 영어판
    'x-default': 'https://ko-ta.co.kr/en/themes/food/',
  })
})

test('a festival with an image uses it for both OG and Twitter and preserves encoded canonical paths', () => {
  const meta = pageMetadata({
    lang: 'en', path: 'festivals/stdfest-%EC%9E%A0%EC%9B%90%EB%82%98%EB%A3%A8%EC%B6%95%EC%A0%9C-2026-09-19',
    title: 'Jamwon Festival', description: 'Come to Jamwon', image: 'https://images.example.com/poster.jpg',
  })
  assert.equal(meta.openGraph.url, 'https://ko-ta.co.kr/en/festivals/stdfest-%EC%9E%A0%EC%9B%90%EB%82%98%EB%A3%A8%EC%B6%95%EC%A0%9C-2026-09-19/')
  assert.equal(meta.alternates.languages.ko, 'https://ko-ta.co.kr/ko/festivals/stdfest-%EC%9E%A0%EC%9B%90%EB%82%98%EB%A3%A8%EC%B6%95%EC%A0%9C-2026-09-19/')
  assert.deepEqual(meta.openGraph.images, ['https://images.example.com/poster.jpg'])
  assert.deepEqual(meta.twitter.images, ['https://images.example.com/poster.jpg'])
})

test('an image-less festival uses the KOTA share image instead of inheriting a missing or stale image', () => {
  const meta = pageMetadata({ lang: 'th', path: 'festivals/tourapi-506600', title: 'เทศกาล', description: 'ข้อมูลเทศกาล' })
  assert.equal(meta.openGraph.url, 'https://ko-ta.co.kr/th/festivals/tourapi-506600/')
  assert.deepEqual(meta.openGraph.images, ['/og-korea-festa-20260921.png'])
  assert.deepEqual(meta.twitter.images, ['/og-korea-festa-20260921.png'])
  assert.equal(meta.openGraph.locale, 'th_TH')
})

test('Next resolves one brand suffix and the fallback image to the public origin', () => {
  const meta = pageMetadata({ lang: 'ko', path: 'festivals/tourapi-506600', title: '산청축제', description: '산청 소개' })
  assert.equal(resolveTitle(meta.title, '%s · KOTA').absolute, '산청축제 · KOTA')
  assert.equal(resolveImages(meta.openGraph.images, new URL('https://ko-ta.co.kr'), false)[0].url.href, 'https://ko-ta.co.kr/og-korea-festa-20260921.png')
  assert.equal(resolveImages(meta.twitter.images, new URL('https://ko-ta.co.kr'), false)[0].url.href, 'https://ko-ta.co.kr/og-korea-festa-20260921.png')
})
