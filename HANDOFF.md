# KOTA 작업 인계장 — 클로드코드 ↔ 코덱스 공용

## 색인

| 갈래 | 한 줄 요약 | 마지막 갱신 | 급한 순서 |
|---|---|---|---:|
| C. 전체 품질 개선 | 초안 PR #2 생성. 웹87검사·빌드 통과, 운영 미반영 | 2026-09-12 07:44 | 1 |
| A. 기술컨설팅 후속 | ✅**5개 전부 완료**. 남은 건 관찰뿐 | 2026-09-04 21:10 | 3 |
| B. 팀 협업 | ✅**PR #1 머지·배포 완료**. 남은 건 전도준 GitHub 초대 미수락뿐 | 2026-09-07 23:10 | 1 |

지난 기록 → `HANDOFF-archive.md`

## 마지막 갱신

2026-09-07 23:10 · 클로드코드
PR #1 머지·배포 완료(`675181d`). 라이브에서 공식 날짜 5건 반영 확인.

---

# A. 기술컨설팅 후속

## 지금 상태

2026-08-29 기술컨설팅 권고를 5개 항목으로 나눠 처리했다. **전부 완료.**

| # | 항목 | 상태 |
|---|---|---|
| 1 | 전체 축제 조회를 목적별로 분리 | ✅ 완료 |
| 2 | 목록의 URL·스크롤·위치 상태 분리 | ✅ 완료 (`web/lib/list-state.ts`) |
| 3 | 달력 기간 조회·상세 1건 조회 분리 | ✅ 완료 |
| 4 | 상세 페이지를 데이터 조회·조립·검색정보·UI로 분리 | ✅ 완료 (`web/lib/detail-view.ts`·`festival-fields.ts`) |
| 5 | 린트 오류 5건 | ✅ 완료 (오류 0건) |

라이브·운영 DB 모두 정상. 커밋·푸시·배포 전부 끝나 있다.

## 다음에 할 일

### 1. ~~상세 페이지 역할 분리~~ ✅2026-09-04 완료

`web/lib/detail-view.ts`(조립·검색정보)와 `web/lib/festival-fields.ts`(값 판단)로 뺐다.
상세 페이지 597 → 524줄, `festivals.ts` 808 → 703줄. 테스트 26 → 42개.

⚠️`festival-fields.ts`를 따로 둔 이유 — `festivals.ts`는 첫 줄에서 Supabase를 불러온다.
계산만 하는 함수를 그 파일에 두면 DB 접속 설정 없이는 테스트에서 부를 수 없다.
앞으로도 **순수 계산은 festivals.ts에 넣지 말 것.** `festivals.ts`가 다시 내보내므로
쓰는 쪽 코드는 바뀌지 않는다.

⚠️테스트에서 부를 모듈의 import에는 **`.ts` 확장자를 붙일 것.** node --test가 확장자 없는
경로를 못 찾는다(`list-rules.ts`도 같은 이유로 그렇게 돼 있다).

### 2. 실시간 응답 행에 적용되는 정정 경로

정정표(`web/data/corrections.json`)는 **병합 단계에서만** 적용된다.
DB에 없고 실시간 응답에서 바로 들어오는 행은 못 고친다. 동대문페스티벌이 그 사례였고
주간 수집으로 우연히 해소됐다. 같은 유형이 또 나오면 그때 경로를 만들 것.

### 3. 스크롤 복원이 새 탭 진입 시 안 걸린다

`/ko/festivals/?region=…` 주소를 새 탭으로 열면 저장된 자리로 복원되지 않는다.
**리팩터링 전 라이브도 같았으므로 원래 그런 동작이다**(실제 뒤로가기 경로는 다르다).
고칠 일이면 별도 항목으로 볼 것.

## 막힌 것 / 결정 대기

없음. A갈래에서 사람 손을 기다리는 것은 없다.
남은 2·3번은 급하지 않다 — 지금 화면에 보이는 문제가 아니다.

---

# B. 팀 협업 대기

## 지금 상태

✅**PR #1 머지·배포 완료** (2026-09-07 23:02 머지 · 23:05 라이브 반영).

<https://github.com/yuneunmi814-cmyk/kota2/pull/1> · 머지 커밋 `675181d` · 최용우 커밋 8개 + CTO 수정 1개
9/4에 부탁한 2건(정정표·큐레이션)이 한 PR로 함께 왔고, 검토 후 통째로 머지했다.

### 2026-09-07 검토 결과 (실측)

| 확인 | 결과 |
|---|---|
| 테스트 63개 | ✅ 전부 통과 (web 56 · pipeline 7) |
| 공식 날짜 정정 5건이 실제 데이터에 반영되는가 | ✅ 5건 전부 반영, 기존 5건도 안 깨짐 |
| 타입 검사·lint | ✅ 양쪽 0건 (기존 경고 2건 그대로) |
| 전체 빌드 | ✅ 2,472쪽 · main 23.5초 / PR 16.8초 — **느려지지 않는다** |
| 목록↔상세 날짜 일치 | ✅ 5/5 — **DB엔 아직 옛 날짜인데도** 양쪽이 고친 날짜를 말한다 |
| 라이브 반영 | ✅ 배포 후 `ko-ta.co.kr` 흥해 야행 09-11~09-12 확인 |

정정 5건: 포항 흥해 국가유산야행 9/11~12 · 금강자연미술비엔날레 ~11/8 ·
서울 어텀 페스타 9/18~11/29 · 대한민국 국향대전 10/23~11/8 · 운정 불꽃축제 10/31 하루.
전부 지자체·재단 공식 페이지 근거가 붙어 있다. 데이터 검증은 신뢰할 만하다.

### 발견해서 고친 것 — 배포가 깨지는 원인 (`42d2a5e`, 2026-09-07 PR에 push)

PR 원본은 `web/lib/festivals.ts`가 `../../pipeline/...`을 불렀다. **`pipeline`을 숨기고
`web`만 두고 빌드하면 멈춘다**(실측). Vercel Root Directory가 `web`이고 바깥을 안 올리는
설정이면 머지 즉시 배포 실패였다.

방향을 뒤집어 정정표를 web으로 옮기고 pipeline이 가져다 쓰게 했다 —
수집은 항상 저장소 전체를 받아 돌기 때문에(`sync.yml`) 그 방향은 안 깨진다.

- `pipeline/src/lib/corrections.ts` → **`web/lib/corrections.ts`**
- `pipeline/data/seed/corrections.json` → **`web/data/corrections.json`** ← 손으로 고치는 자리
- `next.config.ts`의 `turbopack.root`·`outputFileTracingRoot` 제거
- `pipeline/tsconfig.json`을 `allowImportingTsExtensions`+`noEmit`로 (tsx로만 돌아 emit이 없다)

고친 뒤 **pipeline 없이 web 단독 빌드 2,472쪽 성공.** Vercel 설정이 무엇이든 안 깨진다.
자세한 사정은 `web/lib/corrections.ts` 첫 주석에 적어 뒀다.
머지 후 main에 반영됐다.

### 머지 후 남은 사람 일

1. **전도준(CMO)에게 큐레이션 변경 사후 통보** — 「인기순」에서 상시 운영 행사가 뒤로 밀린다
   (`web/lib/list-rules.ts`). 이상하다고 하면 한 줄 되돌리면 된다.
   먼저 머지한 이유: 흥해 야행(9/11~12)이 라이브에서 10/4까지로 잘못 떠 있었고 나흘 뒤 행사였다.
2. ✅**최용우에게 정정표 위치 변경 통보 완료**(2026-09-07 디스코드). 고칠 자리는 `web/data/corrections.json`.

### 알아두면 되는 것 (조치 불필요)

- 최용우가 GitHub Actions 저장소 변수 2개를 등록했다(9/5 01:37):
  `NEXT_PUBLIC_SUPABASE_URL`·`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **둘 다 공개용 값**이고
  관리자 비밀키가 아니다. 본인도 보고서에 적어 놨다. 문제없다.
- PR 커밋 8개 전부 작성자·올린이가 `yw8837`이다. **최용우의 첫 직접 push.**
- 후기 영속 ID 연결(그의 QA 리포트 CR-03, P1)은 이 PR에 없다. 후기가 실제로 쌓이기 전이면 급하지 않다.
- ⚠️두 보고서의 **CR 번호가 서로 다르다**(QA의 CR-05 = 전달보고의 CR-01). 번호로 부르지 말 것.
- PR 안 문서: `docs/reviews/` 3종(전달보고·공식자료 검증결과·장기축제 검증대장).

### 전도준(CMO) GitHub 초대

2026-09-02 22:19 발송, **아직 수락 안 함.** 수락 전에는 저장소가 아예 안 보인다.

## GitHub 협업자 (2026-09-04 실측·본인 확인 완료)

| 계정 | 실명 | 권한 | 상태 |
|---|---|---|---|
| `yuneunmi814-cmyk` | 윤은미 | admin | |
| `yw8837` | **최용우** | write | 2026-09-02 22:22 KST 추가·수락 완료 |
| `jhj120219-art` | 전도준 | write | **초대만 발송, 미수락** |

- `main`에 브랜치 보호 규칙 **없음**. write면 브랜치 생성·푸시·PR 모두 된다.
- 최용우의 깃허브 메일은 `bsfire@gmail.com`. 콘텐츠랩 계정 `bsfire1237@gmail.com`과 **다른 주소**다.
- ⚠️커밋 `63c483b`(8/23 QA 10건)의 작성자는 `yw8837`이지만 **올린 사람은 윤은미**다.
  최용우가 이 저장소에 직접 push한 이력은 아직 0건이다.
  `git log --format=%an`만 보면 본인이 올린 것처럼 보이니 `%cn`(committer)까지 볼 것.

---

# C. 전체 품질 개선 — 2026-09-11

## 지금 상태

2026-09-12 컨설팅 대조 완료: `docs/reviews/consulting-compatibility-2026-09-12.md`.
중복 대표 ID의 이미지 의존 제거·운영 요일 보존·관리자 추천 별칭 연결·잠수교 일요일 정보와 출처 연결 수정. 실제 화면에서 찾은 목록→상세 포스터 누락도 같은 기간의 최소 정보 조회로 보완. 웹87개 검사 통과(7개 추가), 타입·린트 오류 없음. 최종 webpack 빌드 성공. 실제 화면에서 잠수교 토요일 검색/달력 제외·일요일 포함, 상세 포스터 로드 확인.
2026-09-12 08:17 이후 Vercel 미리보기 검증 완료(검증 커밋 `cbcfa5d`, Vercel SUCCESS). 잠수교 9/12 검색0건·9/13 1건, 상세 일요일 안내·포스터940px 로드 확인. 공식 이미지 팔공산1755px·논산1191px·서울정원1829px 정상 로드, 논산 접수기간 종료 안내 확인. 운영 배포 아님.
미리보기: https://kota2-git-codex-site-quality-20260911-emmas-projects-9f639d05.vercel.app/ko/

2026-09-12 사용자 명시적 후속 승인 후 GitHub 개선 브랜치 업로드·초안 PR #2 생성 완료: https://github.com/yuneunmi814-cmyk/kota2/pull/2 . main 병합·운영 배포는 승인 범위 밖이며 실행하지 않음.

`codex/site-quality-20260911`에서 2차 콘텐츠 후속 완료. 운영 DB 쓰기·main 배포 없음.
작업 폴더: `/Users/piglet/Documents/ChatGPT/한국관광공사 지역축제 웹앱 KOTA/kota2-improvements`.
전체 계획 → `docs/reviews/site-improvement-2026-09-11.md`.
최신 결과 → `docs/reviews/2026-09-11-official-media/RESULT.md`.

- 2026-09-11 측정: 공개 화면 개선본554개, 이미지 없음162개. 주말118개 중 이미지 없음23개. 날짜가 바뀐 뒤 현재 건수로 인용하지 않기.
- 새 이미지3건: 팔공산왕건(공공누리1, 첨부 추출), 논산혼례(공공누리1, 포스터 속 접수기간 종료 표시), 서울정원(공식 웹용 배포).
- 공주 책축제9/12 하루, 당진 하반기9/12~10/17 토요일 정정. 제주버스킹 수요일·새연쇼 금토·목관아 수~일 적용.
- 이미지 원본과 날짜·사용범위 조사27건 보존. 전부 해결한 것은 아님.
- 등록부는 `web/data/reviewed-images.json`. 웹과pipeline이 공유; 옛 `pipeline/data/reviewed-images.json` 위치는 사용하지 않음.
- web80 + pipeline7 + media8 =95개 검사 통과. 타입·webpack 배포빌드 통과.

## 다음 순서

1. 초안 PR #2의 자동 검사와 변경분 검토. main 병합·운영 배포는 별도 승인 후 진행.
2. 이미지 있는 공식 후보의 사용 범위 확인과 이미지 추가. 현재 주말 누락23건의 근거/상태는 결과문서 참고.
3. 서울숲JAZZ 미개최 보도, 성남·성동구 일반 소개 등2026 일정 재확인. 미확인만으로 삭제하지 않기.
4. 운영 쓰기 전 DB 백업. 기존 ID·후기 삭제 금지.

<details><summary>지난 기록 — 1차</summary>

커밋7d4374e: 검색·달력·중복6쌍·상세·다국어·이미지수집 경로 개선.
1차 개선본554개/이미지누락165개, 주말119개/누락27개.
갤러리40회 조회 복사본 실험 새커버0건. 이 결과를 운영에 덮어쓰지 않음.
기본Turbopack은 로컬포트 권한 실패, webpack 빌드는 성공.

</details>

---

# 공통 — 손대면 안 되는 것

- `trailingSlash: true` 유지.
- 별도 승인·검증 없이 현재 `festivals.id`를 일괄 변경하지 않는다.
- 미추적 `AGENTS.md`는 사용자 파일이므로 커밋에 넣지 않는다.
- `git add -A` 금지. 변경한 파일만 지정한다.
- **무엇을 화면에서 내릴지는 날짜가 정한다.** 원천에 지금 없다고 지우지 않는다
  (2026-09-04에 열리는 축제 4건을 그렇게 지웠다가 되살렸다. 자세한 사정은 `pipeline/src/merge.ts` 주석).
- 운영 DB에 쓰기 전에는 `~/Documents/공모전_KOTA관광/제출백업/db/`에 먼저 내려받는다.

# 공통 — 알아두면 시간 아끼는 것

- `npm run all`은 sync→merge→enrich→gallery→scrape→popularity→translate→export→push 순이다.
  translate는 LLM 비용이 든다(캐시 있으면 거의 안 든다). push는 **운영 DB에 쓴다.**
- 표 삭제 같은 DDL은 REST로 안 된다. Supabase SQL 편집기에서 사람이 실행해야 한다.
- supabase-js의 `select('*', {head:true, count:'exact'})`는 **없는 표에도 오류를 주지 않는다**(count만 null).
  표의 존재 여부는 실제 `select().limit(1)`로 봐야 404를 받는다.
- 빌드가 갑자기 느려지면 `overlayLive`가 여러 번 도는지 본다. 실시간 원천 호출은
  `lib/tourapi-live.ts`에서 프로세스당 1회로 묶어 뒀다(안 묶으면 17초 → 117초).

# 공통 — 관련 파일·링크

- 라이브 <https://ko-ta.co.kr> · 저장소 <https://github.com/yuneunmi814-cmyk/kota2>
- 팀 시트 「KOTA - 한국관광공사」 팀_할일 탭 — 오늘 작업은 `Team_18`~`Team_24`
- ⏰**1차 제출 2026-09-21(월) 16:00** — 마감 전까지 수정·재제출 자유
- 조회 분리: `web/lib/festivals.ts` · `web/lib/tourapi-live.ts`
- 상세 화면 계산: `web/lib/detail-view.ts` · 값 판단: `web/lib/festival-fields.ts`
- 목록 상태·규칙: `web/lib/list-state.ts` · `web/lib/list-rules.ts`
- 과거 주소 별칭: `web/lib/route-aliases.ts` · `web/lib/festival-routes.ts`
- 중복 판정: `web/lib/absorbed.ts`
- 병합·정정표: `pipeline/src/merge.ts` · `web/data/corrections.json` · `web/lib/corrections.ts`
- 영속 ID SQL: `supabase/stable-festival-ids-{draft,verify,rollback}.sql`
- 회의록: `docs/meeting-minutes-2026-09-02.md` (녹취 원본 `~/Downloads/2026-09-02_코타.txt`)
