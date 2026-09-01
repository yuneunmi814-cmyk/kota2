# KOTA 작업 인계장 — 클로드코드 ↔ 코덱스 공용

## 마지막 갱신

2026-09-02 00:32 · 코덱스

## 지금 하는 일

2026-08-29 기술컨설팅 후속 작업: 긴급 안정화 완료 후, 축제 ID 구조와 조회 구조를 안전하게 단계 분리하는 중.

## 어디까지 했나

- JIMFF 대표 ID가 `kfes` → `manual` → 현재 `stdfest`로 바뀐 사실을 확인했다.
- 과거 `kfes-2026-jimff`, `manual-jimff-2026` 주소를 현재 상세 주소로 308 이동시키는 호환 계층을 추가했다.
- Supabase 150건 단위 조회가 `start_date` 동점 때문에 워커별로 행을 빠뜨리던 문제를 `id` 보조 정렬로 고쳤다.
- 배포 전 재검증에서 150건 상세 응답이 현재 데이터 규모에 다시 잘리는 현상을 재현해, 묶음 크기를 75건으로 낮췄다.
- 서비스의 “오늘”을 `Asia/Seoul` 기준 공통 함수로 모으고 홈·목록·달력·관리자·라이브 API에 적용했다.
- 날짜 경계와 JIMFF 주소를 검증하는 테스트 9개를 추가했다.
- 경로 생성·사이트맵 전용 `listFestivalSlugs()`를 추가해 상세·번역·사진·TourAPI 실시간 보정 없이 ID만 조회하도록 분리했다.
- 컨설팅 우선순위·완료/잔여 작업 문서와 영속 축제 ID ADR을 작성했다.
- 디스코드 팀 공유용 요약문 3개와 상세 진행·계획 자료를 `docs/discord-team-update-consulting-followup-2026-09-01.md`에 작성했다.
- 9월 1일 22:30 팀 회의를 위한 기술컨설팅·후속작업·잔여작업·전도준/최용우 현황 원페이퍼를 `docs/meeting-onepager-2026-09-01.md`에 작성했다.
- ORCA에 `kota-id-audit`, `kota-query-audit` 두 읽기 전용 검토 작업공간을 만들고 각각 ID 이전 위험과 조회 분리 순서를 점검했다. 검토자는 파일을 수정하지 않았다.
- `npm test` 10개 통과, `npm run build` 통과(2379 정적 페이지, 축제 경로 2321개).
- 로컬 HTTP 확인: 과거 주소 2개는 308, 현재 JIMFF 상세는 200.

## 다음에 할 일

1. 운영 DB의 실제 스키마와 고아 리뷰·로그 건수를 읽기 전용으로 측정한다.
2. 측정 결과를 바탕으로 `festival_ids`, `festival_sources`, `festival_route_aliases` SQL과 검증/롤백 SQL을 준비한다.
3. `allFestivals()`에서 목록 요약 조회 `listFestivalSummaries()`를 다음 단위로 분리한다.
4. 영속 ID 대장보다 먼저 파이프라인이 모든 병합 출처를 보존하고 기존 ID를 재사용하도록 설계한다.
5. 기존 린트 오류 5건(`setState`를 effect에서 바로 호출)을 별도 작업으로 정리한다.

## 막힌 것 / 결정 대기

- 영속 ID DB 이전은 리뷰·로그 연결을 바꾸므로 이번 커밋에는 포함하지 않았다. 데이터 건수 검증과 롤백 절차가 먼저 필요하다.
- 운영 배포는 하지 않았다. main에 push하면 Vercel이 자동 배포된다.
- `npm run lint`는 이번 변경 전부터 있던 React effect 오류 5건 때문에 실패한다. 이번 변경의 테스트와 빌드는 통과한다.
- ORCA에서 `codex` 실행 파일이 터미널 PATH에 잡히지 않아, 두 작업공간의 읽기 전용 검토는 Claude CLI로 완료했다. 메인 수정·검증·커밋은 코덱스가 담당했다.

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
- `docs/consulting-followup-2026-09-01.md`
- `docs/ADR-001-stable-festival-identity.md`
- `docs/discord-team-update-consulting-followup-2026-09-01.md`
- `docs/meeting-onepager-2026-09-01.md`
- 상담자료: `/Users/piglet/Downloads/2026-08-29_KOTA_코드구조_리뷰_상담자료 (1).md`
- 녹취: `/Users/piglet/Downloads/코타 기술컨설팅 (1).txt`
