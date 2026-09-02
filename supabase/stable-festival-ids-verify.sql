-- stable-festival-ids-draft.sql 적용 전·후 검증용. SELECT만 실행한다.

-- 1. 모든 현재 축제에 번호표가 있어야 한다.
select count(*) as festivals_without_uid
from festivals where festival_uid is null;

-- 2. 적재·정리가 모두 끝난 뒤 아직 진행 중인 축제 두 행에 같은 번호표가 남으면 안 된다.
-- 끝난 축제 행은 이용자 기록과 과거 URL 보존 때문에 남을 수 있다.
select festival_uid, count(*) as live_rows, array_agg(id order by id) as festival_ids
from festivals
where end_date >= (now() at time zone 'Asia/Seoul')::date
group by festival_uid
having count(*) > 1;

-- 3. 번호표·출처 대장 건수.
select
  (select count(*) from festivals) as festival_rows,
  (select count(*) from festival_ids where merged_into is null) as active_uids,
  (select count(*) from festival_sources) as source_ids,
  (select count(distinct festival_uid) from festival_sources) as sourced_uids;

-- 4. 현재 대표 ID가 출처 대장에서 다른 UUID를 가리키면 안 된다.
select f.id, f.festival_uid as festival_uid, s.festival_uid as source_uid
from festivals f
left join festival_sources s on s.external_id = f.id
where s.external_id is null or s.festival_uid <> f.festival_uid;

-- 5. 이용자 표의 연결 누락. 9/2 기준 events의 미연결은
-- 사람 확인 대상 과거 ID가 남아 있어 0이 아닐 수 있다.
select 'reviews' as table_name, count(*) filter (where festival_id is not null and festival_uid is null) as unlinked, count(*) as total from reviews
union all
select 'events', count(*) filter (where festival_id is not null and festival_uid is null), count(*) from events
union all
select 'corrections', count(*) filter (where festival_id is not null and festival_uid is null), count(*) from corrections
union all
select 'promos', count(*) filter (where festival_id is not null and festival_uid is null), count(*) from promos
union all
select 'saves', count(*) filter (where festival_id is not null and festival_uid is null), count(*) from saves
union all
select 'views', count(*) filter (where festival_id is not null and festival_uid is null), count(*) from views;

-- 6. 같은 사람이 같은 영속 축제의 옛·새 ID에 각각 리뷰를 남겨 충돌하는지.
select festival_uid, user_id, count(*) as rows, array_agg(id order by id) as review_ids
from reviews
where festival_uid is not null
group by festival_uid, user_id
having count(*) > 1;

-- 7. 조회수·저장은 UUID 기준으로 합칠 때 충돌할 수 있다. 아직 합치지 않고 대상만 본다.
select festival_uid, day, count(*) as split_rows, sum(count) as total_views
from views
where festival_uid is not null
group by festival_uid, day
having count(*) > 1;

select user_id, festival_uid, count(*) as split_rows
from saves
where festival_uid is not null
group by user_id, festival_uid
having count(*) > 1;

-- 8. 실제 데이터 보호 스냅샷과 원본 건수 비교.
select
  (select count(*) from reviews) = (select count(*) from _bak_stable_id_20260902_reviews) as reviews_same,
  (select count(*) from events) = (select count(*) from _bak_stable_id_20260902_events) as events_same,
  (select count(*) from corrections) = (select count(*) from _bak_stable_id_20260902_corrections) as corrections_same,
  (select count(*) from promos) = (select count(*) from _bak_stable_id_20260902_promos) as promos_same,
  (select count(*) from saves) = (select count(*) from _bak_stable_id_20260902_saves) as saves_same,
  (select count(*) from views) = (select count(*) from _bak_stable_id_20260902_views) as views_same;
