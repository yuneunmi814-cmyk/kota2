-- 초안: 운영 DB에 아직 실행하지 말 것.
-- 2026-09-02 읽기 전용 점검 결과와 아래 verify SQL을 대조한 후 적용한다.
-- 기존 festivals.id와 이용자 표의 festival_id(text)는 변경·삭제하지 않는다.

begin;

-- 1. 이용자 데이터 보호용 스냅샷. 복사 직후 RLS를 켜서 공개 키로 읽지 못하게 한다.
create table if not exists _bak_stable_id_20260902_reviews as table reviews with data;
alter table _bak_stable_id_20260902_reviews enable row level security;

create table if not exists _bak_stable_id_20260902_events as table events with data;
alter table _bak_stable_id_20260902_events enable row level security;

create table if not exists _bak_stable_id_20260902_corrections as table corrections with data;
alter table _bak_stable_id_20260902_corrections enable row level security;

create table if not exists _bak_stable_id_20260902_promos as table promos with data;
alter table _bak_stable_id_20260902_promos enable row level security;

create table if not exists _bak_stable_id_20260902_saves as table saves with data;
alter table _bak_stable_id_20260902_saves enable row level security;

create table if not exists _bak_stable_id_20260902_views as table views with data;
alter table _bak_stable_id_20260902_views enable row level security;

-- 2. 삭제하지 않는 축제 번호표와 출처 ID 대장.
create table if not exists festival_ids (
  id          uuid primary key default gen_random_uuid(),
  merged_into uuid references festival_ids(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (merged_into is null or merged_into <> id)
);

create table if not exists festival_sources (
  external_id text primary key,
  source      text not null check (source in ('tourapi', 'kfes', 'stdfest', 'mcst', 'manual')),
  festival_uid uuid not null references festival_ids(id),
  match_basis text not null default 'current-representative',
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now()
);
create index if not exists festival_sources_uid on festival_sources(festival_uid);

create table if not exists festival_route_aliases (
  slug         text primary key,
  festival_uid uuid not null references festival_ids(id),
  reason       text not null,
  created_at   timestamptz not null default now()
);
create index if not exists festival_route_aliases_uid on festival_route_aliases(festival_uid);

alter table festival_ids enable row level security;
alter table festival_sources enable row level security;
alter table festival_route_aliases enable row level security;

drop policy if exists festival_ids_read on festival_ids;
create policy festival_ids_read on festival_ids for select using (true);
drop policy if exists festival_sources_read on festival_sources;
create policy festival_sources_read on festival_sources for select using (true);
drop policy if exists festival_route_aliases_read on festival_route_aliases;
create policy festival_route_aliases_read on festival_route_aliases for select using (true);

-- 3. 현재 festivals 행마다 영속 ID를 하나씩 발급한다.
alter table festivals add column if not exists festival_uid uuid;
update festivals set festival_uid = gen_random_uuid() where festival_uid is null;

insert into festival_ids(id)
select festival_uid from festivals
on conflict (id) do nothing;

-- 대표 출처가 바뀌는 적재 순간에는 옛 행과 새 행이 잠시 같은 UUID를 가질 수 있다.
-- 새 행 적재가 성공한 뒤 기존 정리 단계가 옛 미래 행을 지우므로, 여기에는 UNIQUE를 걸지 않는다.
create index if not exists festivals_festival_uid_idx on festivals(festival_uid);
alter table festivals drop constraint if exists festivals_festival_uid_fkey;
alter table festivals
  add constraint festivals_festival_uid_fkey
  foreign key (festival_uid) references festival_ids(id);

-- 현재 대표 ID는 무조건 출처 대장에 남긴다.
insert into festival_sources(external_id, source, festival_uid, match_basis)
select id, split_part(id, ':', 1), festival_uid, 'current-representative'
from festivals
on conflict (external_id) do nothing;

-- TourAPI와 kfes는 같은 CMS 숫자 ID를 쓴다. 병합 행의 형제 ID도 등록한다.
insert into festival_sources(external_id, source, festival_uid, match_basis)
select 'tourapi:' || tourapi_id, 'tourapi', festival_uid, 'same-cms-content-id'
from festivals
where tourapi_id is not null and 'tourapi' = any(sources)
on conflict (external_id) do nothing;

insert into festival_sources(external_id, source, festival_uid, match_basis)
select 'kfes:' || tourapi_id, 'kfes', festival_uid, 'same-cms-content-id'
from festivals
where tourapi_id is not null and 'kfes' = any(sources)
on conflict (external_id) do nothing;

-- 4. 9/2 점검에서 동일 축제로 확정한 과거 ID만 등록한다.
insert into festival_sources(external_id, source, festival_uid, match_basis)
select old_id, split_part(old_id, ':', 1), f.festival_uid, 'manual-confirmed-2026-09-02'
from (values
  ('manual:jimff-2026', 'stdfest:제22회제천국제음악영화제-2026-09-03'),
  ('kfes:2026-jimff', 'stdfest:제22회제천국제음악영화제-2026-09-03'),
  ('manual:jarasum-jazz-2026', 'stdfest:2026년재즈페스티벌in가평-2026-10-09'),
  ('kfes:1916616', 'tourapi:1916616')
) as confirmed(old_id, current_id)
join festivals f on f.id = confirmed.current_id
on conflict (external_id) do nothing;

insert into festival_route_aliases(slug, festival_uid, reason)
select old_slug, f.festival_uid, 'legacy-url-confirmed-2026-09-02'
from (values
  ('manual-jimff-2026', 'stdfest:제22회제천국제음악영화제-2026-09-03'),
  ('kfes-2026-jimff', 'stdfest:제22회제천국제음악영화제-2026-09-03'),
  ('manual-jarasum-jazz-2026', 'stdfest:2026년재즈페스티벌in가평-2026-10-09')
) as aliases(old_slug, current_id)
join festivals f on f.id = aliases.current_id
on conflict (slug) do nothing;

-- 5. 기존 text ID는 유지하고 새 UUID를 옆에 채운다.
alter table reviews add column if not exists festival_uid uuid references festival_ids(id);
alter table events add column if not exists festival_uid uuid references festival_ids(id);
alter table corrections add column if not exists festival_uid uuid references festival_ids(id);
alter table promos add column if not exists festival_uid uuid references festival_ids(id);
alter table saves add column if not exists festival_uid uuid references festival_ids(id);
alter table views add column if not exists festival_uid uuid references festival_ids(id);

create index if not exists reviews_festival_uid on reviews(festival_uid, status, created_at desc);
create index if not exists events_festival_uid on events(festival_uid, created_at desc);
create index if not exists corrections_festival_uid on corrections(festival_uid, created_at desc);
create index if not exists promos_festival_uid on promos(festival_uid, active, ord);
create index if not exists saves_festival_uid on saves(festival_uid);
create index if not exists views_festival_uid on views(festival_uid, day);

update reviews r set festival_uid = s.festival_uid
from festival_sources s where r.festival_uid is null and s.external_id = r.festival_id;
update events e set festival_uid = s.festival_uid
from festival_sources s where e.festival_uid is null and s.external_id = e.festival_id;
update corrections c set festival_uid = s.festival_uid
from festival_sources s where c.festival_uid is null and s.external_id = c.festival_id;
update promos p set festival_uid = s.festival_uid
from festival_sources s where p.festival_uid is null and s.external_id = p.festival_id;
update saves s0 set festival_uid = s.festival_uid
from festival_sources s where s0.festival_uid is null and s.external_id = s0.festival_id;
update views v set festival_uid = s.festival_uid
from festival_sources s where v.festival_uid is null and s.external_id = v.festival_id;

commit;

-- 적용 직후 supabase/stable-festival-ids-verify.sql을 실행해야 한다.
