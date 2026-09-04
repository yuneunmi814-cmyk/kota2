import assert from 'node:assert/strict'
import test from 'node:test'
import { detailSections, festivalJsonLd, heroMedia, metaDescription, nearbyFestivals, sourceHost, sourceUrl } from '../lib/detail-view.ts'

const 기준 = {
  externalId: 'tourapi:1',
  name: '거제맥주축제',
  startDate: '2026-09-01',
  endDate: '2026-09-03',
  lat: 34.88,
  lng: 128.62,
}
const 축제 = (v) => ({ startDate: '2026-09-01', endDate: '2026-09-03', ...v })

// ── 이 근처 다른 축제 ────────────────────────────────────────

test('가까운 순으로 정렬하고 반경 밖은 뺀다', () => {
  const out = nearbyFestivals(
    기준,
    [
      축제({ externalId: 'a', name: '먼축제', lat: 35.6, lng: 128.62 }), // 약 80km
      축제({ externalId: 'b', name: '가까운축제', lat: 34.9, lng: 128.62 }), // 약 2km
      축제({ externalId: 'c', name: '중간축제', lat: 35.0, lng: 128.62 }), // 약 13km
    ],
    { today: '2026-09-02' },
  )
  assert.deepEqual(out.map((o) => o.x.name), ['가까운축제', '중간축제'])
})

// 실측 사건 고정 — '거제맥주축제'(8/23)의 근처 목록에 '거제맥주축제'(9/11)가 들어왔다(2026-08-23).
test('같은 축제의 다른 회차는 뺀다 — 이름이 같으면 띄어쓰기가 달라도', () => {
  const out = nearbyFestivals(
    기준,
    [축제({ externalId: 'tourapi:2', name: '거제 맥주축제', lat: 34.89, lng: 128.62 })],
    { today: '2026-09-02' },
  )
  assert.equal(out.length, 0)
})

test('자기 자신은 뺀다', () => {
  const out = nearbyFestivals(기준, [축제({ ...기준 })], { today: '2026-09-02' })
  assert.equal(out.length, 0)
})

test('끝난 축제와 상시 행사는 뺀다', () => {
  const out = nearbyFestivals(
    기준,
    [
      축제({ externalId: 'x', name: '끝난축제', lat: 34.89, lng: 128.62, endDate: '2026-08-30' }),
      축제({ externalId: 'y', name: '상설전시', lat: 34.89, lng: 128.62, startDate: '2026-01-01', endDate: '2026-12-31' }),
      축제({ externalId: 'z', name: '열리는축제', lat: 34.89, lng: 128.62 }),
    ],
    { today: '2026-09-02' },
  )
  assert.deepEqual(out.map((o) => o.x.name), ['열리는축제'])
})

test('좌표가 없으면 빈 목록', () => {
  assert.deepEqual(nearbyFestivals({ ...기준, lat: null, lng: null }, [축제({ externalId: 'z', name: 'ㄱ', lat: 34.89, lng: 128.62 })]), [])
})

// ── 목차 ─────────────────────────────────────────────────────

test('있는 칸만 목차에 넣고 후기는 항상 넣는다', () => {
  assert.deepEqual(detailSections(축제({ lat: 1, lng: 1, photos: [{ url: 'a', thumb: 'a', name: '' }] }), { hasSummary: true, nearbyCount: 2 }), [
    'about',
    'photos',
    'location',
    'reviews',
    'nearby',
  ])
})

test('아무것도 없으면 후기 칸만 남는다', () => {
  assert.deepEqual(detailSections(축제({}), { hasSummary: false, nearbyCount: 0 }), ['reviews'])
})

// ── 히어로·곁타일 ────────────────────────────────────────────

test('대표 이미지가 없으면 갤러리 첫 장을 히어로로 쓴다', () => {
  const f = 축제({ imageUrl: null, photos: [{ url: 'p1', thumb: 't1', name: '' }] })
  assert.equal(heroMedia(f).heroSrc, 'p1')
})

test('사진도 없으면 히어로를 그리지 않는다', () => {
  assert.equal(heroMedia(축제({})).heroSrc, null)
})

test('유튜브 주소에서 영상 id를 뽑는다', () => {
  assert.equal(heroMedia(축제({ youtube: 'https://youtu.be/AbCdEfGhIjK' })).ytId, 'AbCdEfGhIjK')
  assert.equal(heroMedia(축제({ youtube: 'https://www.youtube.com/watch?v=AbCdEfGhIjK' })).ytId, 'AbCdEfGhIjK')
})

// 지도로 칸을 메우던 것을 뺀 이유는 detail-view.ts 주석 참고(BUG-19, 앵커 중첩으로 하이드레이션이 깨졌다).
test('곁타일은 사진을 먼저 쓰고, 사진이 모자라면 영상으로 채운다', () => {
  const 사진둘 = 축제({
    youtube: 'https://youtu.be/AbCdEfGhIjK',
    photos: [0, 1, 2].map((i) => ({ url: `p${i}`, thumb: `t${i}`, name: '' })),
  })
  assert.deepEqual(heroMedia(사진둘).sideTiles, [
    { kind: 'photo', src: 't1' },
    { kind: 'photo', src: 't2' },
  ])

  const 사진하나 = 축제({
    youtube: 'https://youtu.be/AbCdEfGhIjK',
    photos: [0, 1].map((i) => ({ url: `p${i}`, thumb: `t${i}`, name: '' })),
  })
  assert.deepEqual(사진하나 && heroMedia(사진하나).sideTiles, [
    { kind: 'photo', src: 't1' },
    { kind: 'yt', id: 'AbCdEfGhIjK' },
  ])

  assert.deepEqual(heroMedia(축제({})).sideTiles, [])
})

// ── 검색엔진용 정보 ──────────────────────────────────────────

test('요금을 모르면 무료 여부를 아예 말하지 않는다', () => {
  const 공통 = { f: 축제({ externalId: 'a', name: 'ㄱ' }), L: { name: 'ㄱ', summary: null, placeName: null }, lang: 'ko', url: 'https://x/' }
  assert.equal('isAccessibleForFree' in festivalJsonLd({ ...공통, fee: 'unknown' }), false)
  assert.equal(festivalJsonLd({ ...공통, fee: 'free' }).isAccessibleForFree, true)
  assert.equal(festivalJsonLd({ ...공통, fee: 'paid' }).isAccessibleForFree, false)
})

test('좌표가 있으면 위치에 좌표를 넣는다', () => {
  const j = festivalJsonLd({
    f: 축제({ externalId: 'a', name: 'ㄱ', lat: 34.8, lng: 128.6, address: '경남 거제시' }),
    L: { name: 'ㄱ', summary: null, placeName: '거제시' },
    lang: 'ko',
    fee: 'unknown',
    url: 'https://x/',
  })
  assert.equal(j.location.geo.latitude, 34.8)
  assert.equal(j.location.address, '경남 거제시')
})

test('검색결과 한 줄은 160자에서 자른다', () => {
  const 긴요약 = '가'.repeat(300)
  assert.equal(metaDescription({ summary: 긴요약, placeName: '거제시' }, 축제({})).length, 160)
  assert.equal(metaDescription({ summary: null, placeName: null }, 축제({})), '2026-09-01 ~ 2026-09-03')
})

// ── 출처 표기 ────────────────────────────────────────────────

// 실측 사건 고정 — 주소만 올 거라 믿고 new URL()에 넣었다가 빌드가 깨졌다(2026-08-19, 국가유산 미디어아트).
test('설명이 붙은 출처 문장에서도 주소만 뽑아낸다', () => {
  assert.equal(sourceHost('○○재단 공식 홈페이지 https://www.example.or.kr/a/b'), 'example.or.kr')
  assert.equal(sourceUrl('○○재단 공식 홈페이지 https://www.example.or.kr/a/b'), 'https://www.example.or.kr/a/b')
})

test('주소가 없으면 앞 24자만 보여주고 죽지 않는다', () => {
  assert.equal(sourceHost('한국관광공사'), '한국관광공사')
  assert.equal(sourceUrl('한국관광공사'), undefined)
})
