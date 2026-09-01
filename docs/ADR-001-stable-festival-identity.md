# ADR-001: 축제 자체 ID와 수집 출처 ID를 분리한다

**Status:** Proposed
**Date:** 2026-09-01
**Deciders:** KOTA 팀

## Context

현재 `festivals.id`는 `tourapi:...`, `kfes:...`, `stdfest:...`, `manual:...` 같은 출처 ID다. 병합 대표 출처가 바뀌면 같은 현실의 축제도 새 ID와 새 URL을 받는다. 리뷰·행동로그·제보·배너는 옛 문자열을 계속 들고 있어 오류 없이 연결이 끊긴다. JIMFF는 실제로 `kfes` → `manual` → `stdfest`로 바뀌었다.

## Decision

- 삭제하지 않는 `festival_ids` 대장에 UUID 영속 ID를 둔다.
- 모든 출처 ID는 `festival_sources`에서 영속 ID에 연결한다.
- 출처로 풀 수 없는 옛 주소와 사람이 읽는 주소는 `festival_route_aliases`에 둔다.
- 공개 URL 모양은 2026-09-21 공모전 마감 전에는 바꾸지 않는다.
- 기존 텍스트 `festival_id`는 즉시 제거하지 않고 새 UUID 컬럼과 병행한다.
- 파이프라인은 매주 새 ID를 발급하지 않고, 기존 source mapping이 있으면 반드시 같은 영속 ID를 재사용한다.

## Options Considered

### Option A: 현재 externalId 유지 + 사례별 별칭

| Dimension | Assessment |
|---|---|
| 복잡도 | 낮음 |
| 데이터 안전성 | 낮음 |
| 마감 전 위험 | 낮음 |
| 장기 유지 | 낮음 |

장점은 빠르고 되돌리기 쉽다는 것이다. 단점은 출처가 바뀔 때마다 수동 별칭이 필요하고 리뷰 연결 문제를 해결하지 못한다.

### Option B: 영속 ID 대장 + 출처 mapping + 별칭

| Dimension | Assessment |
|---|---|
| 복잡도 | 중간 |
| 데이터 안전성 | 높음 |
| 마감 전 위험 | 단계적 적용 시 중간 |
| 장기 유지 | 높음 |

선택안이다. 기존 컬럼을 유지한 채 새 구조를 옆에 추가하면 화면 영향 없이 이전할 수 있다.

### Option C: 현재 festivals 기본키를 한 번에 UUID로 교체

| Dimension | Assessment |
|---|---|
| 복잡도 | 높음 |
| 데이터 안전성 | 낮음 |
| 마감 전 위험 | 매우 높음 |
| 장기 유지 | 높음 |

리뷰·로그·URL·사이트맵을 동시에 바꿔야 하므로 기각한다.

## Trade-off Analysis

선택안은 한동안 옛 문자열과 새 UUID를 둘 다 관리해야 한다. 대신 단계별 검증과 즉시 롤백이 가능하다. 공모전 직전 URL 전체 변경보다 데이터 연결 안정성을 먼저 얻는 쪽을 선택한다.

## Consequences

- 출처가 바뀌어도 리뷰·로그·과거 URL을 같은 축제에 유지할 수 있다.
- 잘못된 자동 병합이 영속화될 수 있으므로 source mapping 근거와 병합 로그가 필요하다.
- 새 표에는 RLS와 공개 읽기 정책이 필요하다.
- 운영 DB 실제 스키마가 저장소 SQL과 다른 부분(`lineup` 등)이 있어 적용 전 대조가 필수다.

## Action Items

1. [ ] 운영 DB 실제 컬럼과 고아 리뷰·로그 수를 읽기 전용으로 측정
2. [ ] 백업 표 생성 시 즉시 RLS 활성화
3. [ ] `festival_ids`, `festival_sources`, `festival_route_aliases` 추가
4. [ ] 현재 축제·출처·옛 주소 백필 및 누락/중복 검증
5. [ ] 파이프라인에 모든 병합 구성원의 source ID 산출 추가
6. [ ] 파이프라인이 기존 영속 ID를 재사용하도록 변경
7. [ ] 한 주간 새 영속 ID 증가량 관찰
8. [ ] 웹 별칭 조회를 DB 기반으로 전환
9. [ ] 공모전 이후 옛 컬럼 정리 여부 재결정
