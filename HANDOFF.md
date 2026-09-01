# KOTA 작업 인계장 — 클로드코드 ↔ 코덱스 공용

## 마지막 갱신

2026-09-01 13:54 · 코덱스

## 지금 하는 일

2026-08-29 기술컨설팅 후속 작업: 과거 JIMFF 주소 복구, KST 날짜 규칙 통합, 회귀 테스트 도입.

## 어디까지 했나

- JIMFF 대표 ID가 `kfes` → `manual` → 현재 `stdfest`로 바뀐 사실을 확인했다.
- 과거 `kfes-2026-jimff`, `manual-jimff-2026` 주소를 현재 상세 주소로 308 이동시키는 호환 계층을 추가했다.
- Supabase 150건 단위 조회가 `start_date` 동점 때문에 워커별로 행을 빠뜨리던 문제를 `id` 보조 정렬로 고쳤다.
- 서비스의 “오늘”을 `Asia/Seoul` 기준 공통 함수로 모으고 홈·목록·달력·관리자·라이브 API에 적용했다.
- 날짜 경계와 JIMFF 주소를 검증하는 테스트 9개를 추가했다.
- `npm test` 9개 통과, `npm run build` 통과.
- 로컬 HTTP 확인: 과거 주소 2개는 308, 현재 JIMFF 상세는 200.

## 다음에 할 일

1. 영속 `festivalId`, `festival_sources`, `festival_route_aliases` DB 설계와 데이터 이전 계획을 먼저 문서화한다.
2. 기존 리뷰·행동 로그의 연결 건수를 비교하는 검증 쿼리를 만든 뒤 DB 이전을 시행한다.
3. `allFestivals()`를 `listSlugs`, 목록 요약, 상세 한 건, 라이브 보정으로 나눈다.
4. 기존 린트 오류 5건(`setState`를 effect에서 바로 호출)을 별도 작업으로 정리한다.

## 막힌 것 / 결정 대기

- 영속 ID DB 이전은 리뷰·로그 연결을 바꾸므로 이번 커밋에는 포함하지 않았다. 데이터 건수 검증과 롤백 절차가 먼저 필요하다.
- 운영 배포는 하지 않았다. main에 push하면 Vercel이 자동 배포된다.
- `npm run lint`는 이번 변경 전부터 있던 React effect 오류 5건 때문에 실패한다. 이번 변경의 테스트와 빌드는 통과한다.

## 손대면 안 되는 것

- `trailingSlash: true` 유지.
- 별도 승인·검증 없이 현재 `festivals.id`를 일괄 변경하지 않는다.
- 미추적 `AGENTS.md`는 사용자 파일이므로 이 작업 커밋에 넣지 않는다.
- `git add -A` 금지. 변경한 파일만 지정한다.

## 관련 파일·링크

- `web/lib/festival-routes.ts`
- `web/lib/date.ts`
- `web/lib/festivals.ts`
- `web/app/[lang]/festivals/[id]/page.tsx`
- `web/tests/`
- 상담자료: `/Users/piglet/Downloads/2026-08-29_KOTA_코드구조_리뷰_상담자료 (1).md`
- 녹취: `/Users/piglet/Downloads/코타 기술컨설팅 (1).txt`
