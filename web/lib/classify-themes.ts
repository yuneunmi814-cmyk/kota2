import { THEMES, type Theme } from './themes'

// 축제 테마 분류 — 실시간으로 들어온 축제용.
//
// 왜 여기에 또 있나(BUG-04, 2026-08-23):
// 파이프라인(pipeline/src/lib/themes.ts)이 DB에 넣는 축제는 테마를 갖고 들어온다. 그런데
// 원천에서 실시간으로 새로 올라온 축제는 lib/festivals.ts의 overlayLive가 `themes: []`로
// 만들어 붙였다 — 목록에는 뜨지만 테마 필터 여섯 개 중 어디에도 안 걸린다. 필터를 다 눌러
// 합해도 권역 전체 건수에 못 미치는 이유가 이것이었다(7개 권역 전수조사에서 최소 59건,
// DB 475건과 화면 539건의 차이 64건과 거의 겹친다).
//
// 규칙은 파이프라인과 같아야 한다. 한쪽만 고치면 같은 축제가 원천에서 온 날과 DB에 실린
// 날에 서로 다른 테마를 갖는다. ⚠ pipeline/src/lib/themes.ts를 고치면 여기도 같이 고칠 것.

// 문체부 공식 유형 → 테마
const OFFICIAL: [RegExp, Theme[]][] = [
  [/지역특산물/, ['food']],
  [/자연생태/, ['nature']],
  [/전통역사/, ['heritage']],
  [/문화예술/, ['music']],
  [/주민화합/, ['family']],
]

// 이름 키워드 → 테마. 한 글자 지명('강·산·섬')과 '페스티벌'·'아트'·'체험' 단독은
// 일부러 뺐다 — 파이프라인 쪽 주석에 오분류 실측치가 적혀 있다.
const KEYWORDS: [RegExp, Theme[]][] = [
  [/전어|대하|꽃게|한우|불고기|삼겹|막국수|닭갈비|김밥|라면|만두|국수|치맥|맥주|막걸리|와인|커피|디저트|베이커리|빵|떡볶이|젓갈|인삼|포도|사과|대추|곶감|딸기|감귤|수박|메론|복숭아|토마토|고추|마늘|더덕|버섯|장류|장터|미식|푸드|음식|먹거리|맛|굴|낙지|꼬막|전복|새우|광어|고등어/, ['food']],
  [/벚꽃|수국|장미|국화|튤립|연꽃|해바라기|억새|갈대|단풍|매화|철쭉|유채|코스모스|꽃|정원|가든|반딧불|갯벌|생태|숲|바다|해변|해수욕|물놀이|워터|서핑|계곡|호수|산림|등산|트레킹|둘레길|올레|해파랑|자락길|옛길|숲길|트레일/, ['nature']],
  [/야행|국가유산|문화재|읍성|서원|향교|고분|왕릉|대첩|의병|충절|백제|신라|가야|조선|전통|민속|풍물|농악|한지|도자|탈춤|아리랑|문화제|역사|파수|수문장|교대의식|궁궐|행궁|한복|종묘|사직|봉수|서낭|당제|제례/, ['heritage']],
  [/뮤직|음악|콘서트|재즈|힙합|버스킹|공연|연극|인형극|영화제|비엔날레|미술|무용|댄스|합창|오페라|예술제|국악|밴드|가요|록페|클래식|퍼포먼스|넌버벌|마임|서커스|판소리|풍류|버스커/, ['music']],
  [/어린이|아이들|키즈|가족|가족체험|체험학습|곤충|동물|반려|캠핑|놀이|과학|우주|천문|유아|아동/, ['family']],
  [/야행|야간|불꽃|드론|미디어아트|라이트|빛|조명|일루미|달빛|별빛|루미나리에|크리스마스|트리|해맞이|일출|해넘이|야경|라이트쇼|드론쇼|불빛/, ['night']],
]

/** 축제의 정체는 이름과 첫 문장에 있다 — 산문 전체에 키워드를 걸면 부수적 언급까지 다 잡힌다 */
const identity = (summary?: string | null) => {
  if (!summary) return ''
  const m = summary.match(/^[^.。!?\n]{0,160}[.。!?]?/)
  return m ? m[0] : summary.slice(0, 160)
}

/**
 * 이름 + 요약 첫 문장 + (있으면) 문체부 유형으로 테마를 정한다.
 * 어디에도 안 걸리면 빈 배열 — 억지로 채우지 않는다(틀린 분류는 없느니만 못하다).
 */
export function classifyThemes(name: string, summary?: string | null): Theme[] {
  const found = new Set<Theme>()

  for (const [re, themes] of OFFICIAL) {
    if (summary && re.test(summary)) themes.forEach((t) => found.add(t))
  }

  // 이름에서 뭐라도 나오면 그걸로 끝낸다
  const fromName = new Set<Theme>()
  for (const [re, themes] of KEYWORDS) {
    if (re.test(name)) themes.forEach((t) => fromName.add(t))
  }
  if (fromName.size > 0) {
    fromName.forEach((t) => found.add(t))
    return THEMES.filter((t) => found.has(t))
  }

  // 이름이 비었을 때만 요약 첫 문장을 보조로
  const head = identity(summary)
  for (const [re, themes] of KEYWORDS) {
    if (head && re.test(head)) themes.forEach((t) => found.add(t))
  }
  return THEMES.filter((t) => found.has(t))
}
