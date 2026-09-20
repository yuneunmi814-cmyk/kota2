import assert from 'node:assert/strict'
import test from 'node:test'

const routes = await import('../lib/language-switch.ts').catch(() => ({}))

test('언어 전환은 목록의 검색·필터·정렬·더보기 상태를 보존한다', () => {
  assert.equal(typeof routes.languageHref, 'function')
  assert.equal(
    routes.languageHref('ja', '/ko/festivals/', '?q=%ED%92%8D%EA%B8%B0%EC%9D%B8%EC%82%BC&period=weekend&region=seoul&theme=food&sort=popularity&page=3'),
    '/ja/festivals/?period=weekend&region=seoul&theme=food&sort=popularity&q=%ED%92%8D%EA%B8%B0%EC%9D%B8%EC%82%BC&page=3',
  )
})

test('언어 전환은 상시 가리기와 여행 날짜를 함께 보존한다', () => {
  assert.equal(
    routes.languageHref('en', '/ko/festivals/', '?from=2026-09-15&to=2026-09-11&hideAlways=1&page=3'),
    '/en/festivals/?from=2026-09-11&to=2026-09-15&hideAlways=1&page=3',
  )
  assert.equal(
    routes.languageHref('ja', '/ko/festivals/', '?from=2026-02-30&to=2026-09-11&hideAlways=0'),
    '/ja/festivals/?from=2026-09-11&to=2026-09-11',
  )
})

test('언어 전환은 상세 축제 ID와 기존 경로를 유지한다', () => {
  assert.equal(routes.languageHref('th', '/en/festivals/tourapi-506600/', ''), '/th/festivals/tourapi-506600/')
  assert.equal(routes.languageHref('en', '/ko/themes/food/', ''), '/en/themes/food/')
  assert.equal(routes.languageHref('ko', '/ja/', ''), '/ko/')
})

test('목록의 지원하지 않는 값과 중복·빈 쿼리를 정규화한다', () => {
  assert.equal(
    routes.languageHref('en', '/ko/festivals/', '?period=99&region=unknown&theme=bad&sort=wrong&graded=0&page=-2&q=%20%20&tracking=foo'),
    '/en/festivals/',
  )
  assert.equal(
    routes.languageHref('th', '/ja/festivals/', '?period=12&region=gyeonggi&sido=%EC%9D%B8%EC%B2%9C%EA%B4%91%EC%97%AD%EC%8B%9C&graded=1&sort=distance&page=48&q=sea%20food&q=ignored'),
    '/th/festivals/?period=12&region=gyeonggi&sido=%EC%9D%B8%EC%B2%9C%EA%B4%91%EC%97%AD%EC%8B%9C&graded=1&sort=distance&q=sea+food&page=48',
  )
})

test('다른 페이지의 쿼리와 해시를 보존하고 외부 경로로 벗어나지 않는다', () => {
  assert.equal(routes.languageHref('ja', '/ko/calendar/', '?month=9#today'), '/ja/calendar/?month=9#today')
  assert.equal(routes.languageHref('en', '//evil.example/path', '?q=x'), '/en/')
})
