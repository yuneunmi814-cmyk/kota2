-- stable-festival-ids-draft.sql을 되돌리는 초안.
-- 기존 text festival_id를 변경하지 않았으므로 새 컬럼·표만 제거한다.
-- 보호 스냅샷은 자동 삭제하지 않는다.

begin;

drop index if exists reviews_festival_uid;
drop index if exists events_festival_uid;
drop index if exists corrections_festival_uid;
drop index if exists promos_festival_uid;
drop index if exists saves_festival_uid;
drop index if exists views_festival_uid;

alter table reviews drop column if exists festival_uid;
alter table events drop column if exists festival_uid;
alter table corrections drop column if exists festival_uid;
alter table promos drop column if exists festival_uid;
alter table saves drop column if exists festival_uid;
alter table views drop column if exists festival_uid;

alter table festivals drop constraint if exists festivals_festival_uid_fkey;
drop index if exists festivals_festival_uid_idx;
alter table festivals drop column if exists festival_uid;

drop table if exists festival_route_aliases;
drop table if exists festival_sources;
drop table if exists festival_ids;

commit;

-- 남겨 둔 _bak_stable_id_20260902_* 표는 원본 건수를 확인한 뒤
-- 운영자가 별도 승인해 제거한다. RLS가 켜져 있어 공개 조회는 막힌다.
