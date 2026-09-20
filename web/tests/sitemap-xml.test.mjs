import assert from 'node:assert/strict'
import test from 'node:test'

// 사이트맵에 나가는 주소는 XML을 깨는 글자를 품으면 안 된다.
// 축제 이름이 주소가 되는 원천(표준데이터)에는 <, >, & 가 실제로 들어 있다.
test('축제 주소는 XML을 깨는 글자 없이 사이트맵에 실린다', () => {
  const slugs = ['stdfest-2025년인천도시역사관어린이특별전<가자갯벌도시>-2025-12-09', 'stdfest-거제둔덕포도&한우축제-2026-09-05', "stdfest-이름에'따옴표\"-2026-01-01"]
  for (const slug of slugs) {
    const path = `festivals/${encodeURIComponent(slug)}/`
    // 작은따옴표는 남는다 — <loc> 본문과 큰따옴표로 감싼 href 안에서는 문법을 깨지 않는다
    assert.doesNotMatch(path, /[<>&"]/u, slug)
    assert.equal(decodeURIComponent(path), `festivals/${slug}/`, '되돌리면 원래 주소다')
  }
})
