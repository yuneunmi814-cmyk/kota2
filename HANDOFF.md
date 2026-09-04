# KOTA 작업 인계장 — 클로드코드 ↔ 코덱스 공용

## 색인

| 갈래 | 한 줄 요약 | 마지막 갱신 | 급한 순서 |
|---|---|---|---:|
| A. 기술컨설팅 후속 | 5개 중 4개 완료. **상세 페이지 역할 분리만 남음** | 2026-09-04 20:05 | 1 |
| B. 팀 협업 대기 | 최용우 PR 2건 대기, 전도준 GitHub 초대 미수락 | 2026-09-04 20:05 | 2 |

지난 기록 → `HANDOFF-archive.md`

## 마지막 갱신

2026-09-04 20:05 · 클로드코드
⚠️코덱스 크레딧 소진 상태. **복구 2026-09-07(일) 19:00**.

---

# A. 기술컨설팅 후속

## 지금 상태

2026-08-29 기술컨설팅 권고를 5개 항목으로 나눠 처리했다. **4개 완료, 1개 미착수.**

| # | 항목 | 상태 |
|---|---|---|
| 1 | 전체 축제 조회를 목적별로 분리 | ✅ 완료 |
| 2 | 목록의 URL·스크롤·위치 상태 분리 | ✅ 완료 (`web/lib/list-state.ts`) |
| 3 | 달력 기간 조회·상세 1건 조회 분리 | ✅ 완료 |
| 4 | **상세 페이지를 데이터 조회·조립·검색정보·UI로 분리** | ❌ **미착수** |
| 5 | 린트 오류 5건 | ✅ 완료 (오류 0건) |

라이브·운영 DB 모두 정상. 커밋·푸시·배포 전부 끝나 있다.

## 다음에 할 일

### 1. 상세 페이지 역할 분리 (컨설팅 4번, 유일한 잔여 항목)

`web/app/[lang]/festivals/[id]/page.tsx` — **597줄 한 파일**에 아래가 전부 섞여 있다.

- 데이터 조회 (`findByKey`, `listFestivalSummaries`, `regionRank`, `ratingOf`, `reviewsOf`)
- 화면용 데이터 조립 (`nearby` 거리 계산·정렬, `anchors` 목차, 히어로 사진 선택)
- 검색엔진용 정보 (`generateMetadata`, JSON-LD)
- UI 마크업

목록 쪽을 나눈 방식(`web/lib/list-state.ts`, `web/lib/list-rules.ts`)을 그대로 따르면 된다 —
**순수 함수로 뺄 수 있는 것부터 빼고 테스트를 붙인다.** 화면 동작은 바뀌지 않아야 한다.

⚠️착수 전에 볼 것: 목록 화면은 `FestivalCard.tsx`와 `FestivalList.tsx`에 **같은 카드 마크업이 두 벌** 있다.
`/festivals/`는 `FestivalCard`를 쓰지 않는다. 한쪽만 고치면 화면의 절반이 안 바뀐다(2026-08-25에 실제로 겪었다).

### 2. 실시간 응답 행에 적용되는 정정 경로

정정표(`pipeline/data/seed/corrections.json`)는 **병합 단계에서만** 적용된다.
DB에 없고 실시간 응답에서 바로 들어오는 행은 못 고친다. 동대문페스티벌이 그 사례였고
주간 수집으로 우연히 해소됐다. 같은 유형이 또 나오면 그때 경로를 만들 것.

### 3. 스크롤 복원이 새 탭 진입 시 안 걸린다

`/ko/festivals/?region=…` 주소를 새 탭으로 열면 저장된 자리로 복원되지 않는다.
**리팩터링 전 라이브도 같았으므로 원래 그런 동작이다**(실제 뒤로가기 경로는 다르다).
고칠 일이면 별도 항목으로 볼 것.

## 막힌 것 / 결정 대기

없음. A갈래에서 사람 손을 기다리는 것은 없다.

---

# B. 팀 협업 대기

## 지금 상태

2026-09-04 디스코드로 아래를 요청했다. 답을 기다리는 중.

### 최용우(COO)에게 부탁한 PR 2건

| | 내용 | 파일 |
|---|---|---|
| 1 | 축제 날짜·장소가 공식 홈페이지와 맞는지 대조해 정정표에 등록 | `pipeline/data/seed/corrections.json` |
| 2 | 큐레이션 기준 — 인기순·상시행사 후순위·6칸 테마 분류 | `web/lib/list-rules.ts` |

**PR로 받아 검토 후 머지하기로 했다.** 은미님이 직접 고치는 방식이 아니다.

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
- 목록 상태·규칙: `web/lib/list-state.ts` · `web/lib/list-rules.ts`
- 과거 주소 별칭: `web/lib/route-aliases.ts` · `web/lib/festival-routes.ts`
- 중복 판정: `web/lib/absorbed.ts`
- 병합·정정표: `pipeline/src/merge.ts` · `pipeline/data/seed/corrections.json`
- 영속 ID SQL: `supabase/stable-festival-ids-{draft,verify,rollback}.sql`
- 회의록: `docs/meeting-minutes-2026-09-02.md` (녹취 원본 `~/Downloads/2026-09-02_코타.txt`)
