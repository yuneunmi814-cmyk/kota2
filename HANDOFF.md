# KOTA 작업 인계장 — 클로드코드 ↔ 코덱스 공용

## 색인

| 갈래 | 한 줄 요약 | 마지막 갱신 | 급한 순서 |
|---|---|---|---:|
| A. 기술컨설팅·9/2 회의 후속 | 안정화 코드 완료, 영속 ID 운영 이전과 후속 구조 분리 남음 | 2026-09-03 16:12 | 1 |

## 마지막 갱신

2026-09-03 16:12 · 코덱스

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
- 9월 2일 회의 녹취를 결정·할 일·확인거리로 정리하고, 후속 실행 결과를 `docs/meeting-followup-2026-09-02.md`에 기록했다.
- 운영 DB 읽기 전용 점검 명령 `npm run audit:db`를 추가했다. 실측: 축제 581건, 리뷰 0건, 행동 로그 707건, 현재 축제와 연결이 끊긴 로그 21건·9개 ID.
- `listFestivalSummaries()`를 추가해 목록·달력·테마의 DB 응답에서 상세 본문·부스·사진 원문을 제외했고, 기존 실시간 TourAPI 보정은 유지했다.
- 목록 필터·날짜순·거리순·인기순을 `web/lib/list-rules.ts`로 분리하고 회귀 테스트 3개를 추가했다.
- DB에 아직 없는 신규 축제 `tourapi:3343694`의 상세 URL 200, 과거 JIMFF URL 308을 로컬 빌드 서버에서 확인했다.
- 병합 결과가 모든 참여 출처 ID를 `sourceIds`로 보존하게 했다. 기존 JSON도 계속 읽도록 선택 필드로 두었다.
- 영속 ID 운영 이전·검증·롤백 SQL 초안을 각각 작성했다. 운영 DB에는 실행하지 않았다.
- 주간 적재가 새 구조 적용 후 기존 UUID를 재사용하게 했다. 서로 다른 UUID 충돌·출처 ID 중복은 자동 중단하고, 새 구조 미적용 환경은 기존 방식으로 동작한다.
- 보류했던 과거 ID 4건을 공식 주최·지자체 자료와 당시 원본으로 대조해 같은 행사로 확정했다. SQL 이전 목록과 과거 URL 호환 목록에 추가했다.
- 수원화성 미디어아트 공식 기간이 9월 19일~10월 6일임을 확인해 정정표에 추가했다. 기존 병합 결과의 종료일 10월 18일은 잘못된 값이다.
- 병합·웹 데이터 527건을 다시 만들었고 527건 모두 `sourceIds`가 있다. 수원 일정 정정도 생성 파일에 반영했다.
- 자동 테스트 14개, 웹·파이프라인 TypeScript 검사, 2,379페이지 전체 빌드가 통과했다.
- 과거 주소 4개는 로컬 HTTP에서 각각 현재 `tourapi` 주소로 308 이동하는 것을 확인했다.
- 9월 2일 회의 녹취를 코드의 실제 진행 상태와 대조해 `docs/meeting-minutes-2026-09-02.md`로 정리했다. 개인적인 사업·가정 대화는 저장소에서 제외했다.
- 팀 공유용 완료 작업·인계 작업 메시지를 `docs/discord-update-2026-09-03.md`에 작성했다.
- ORCA에 `kota-id-audit`, `kota-query-audit` 두 읽기 전용 검토 작업공간을 만들고 각각 ID 이전 위험과 조회 분리 순서를 점검했다. 검토자는 파일을 수정하지 않았다.
- `npm test` 10개 통과, `npm run build` 통과(2379 정적 페이지, 축제 경로 2321개).
- 로컬 HTTP 확인: 과거 주소 2개는 308, 현재 JIMFF 상세는 200.

## 다음에 할 일

1. `supabase/stable-festival-ids-draft.sql`을 별도 검토한 뒤 운영 DB에 적용하고 verify SQL을 즉시 실행한다. 그전에는 `pipeline` 적재를 실행하지 않는다.
2. 적용 후 첫 주간 수집에서 신규·재사용 UUID 수와 충돌 여부를 관찰하고 웹 별칭 조회를 DB 기반으로 전환한다.
3. 달력 기간 조회·상세 1건 조회를 순서대로 분리한다.
4. 목록 URL·스크롤·위치 상태와 상세 페이지 역할을 별도 모듈로 분리한다.
5. 기존 린트 오류 5건(`setState`를 effect에서 바로 호출)을 별도 작업으로 정리한다.

## 막힌 것 / 결정 대기

- 영속 ID SQL은 준비됐지만 미실행이다. 과거 ID 4건은 공식 자료 확인 후 포함했으며 운영 적용 전 별도 SQL 검토가 필요하다.
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
- `docs/meeting-followup-2026-09-02.md`
- `docs/meeting-minutes-2026-09-02.md`
- `docs/discord-update-2026-09-03.md`
- `pipeline/src/audit-production.ts`
- `pipeline/src/push-supabase.ts`
- `supabase/stable-festival-ids-draft.sql`
- `supabase/stable-festival-ids-verify.sql`
- `supabase/stable-festival-ids-rollback.sql`
- 상담자료: `/Users/piglet/Downloads/2026-08-29_KOTA_코드구조_리뷰_상담자료 (1).md`
- 녹취: `/Users/piglet/Downloads/코타 기술컨설팅 (1).txt`
