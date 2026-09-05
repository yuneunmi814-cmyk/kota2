-- CTO ONLY. Not executed on production. First apply/review stable-festival-ids-draft.sql.
-- Run on a disposable database first. One transaction; no row deletion or ID rewrite.
-- Application default remains legacy. AFTER rehearsal + migration, set
-- NEXT_PUBLIC_STABLE_REVIEW_IDS=1 in the build environment and redeploy (public, nonsecret flag).
-- Do not enable the flag before SQL succeeds. Mapping errors fail closed when enabled.
begin;
lock table reviews in share row exclusive mode;

alter table reviews add column if not exists festival_uid uuid references festival_ids(id);
-- Snapshot is private and keeps text IDs, review IDs, votes/photos relationships untouched.
create table if not exists _bak_review_identity_20260905 as table reviews with data;
alter table _bak_review_identity_20260905 enable row level security;
revoke all on _bak_review_identity_20260905 from anon, authenticated;

update reviews r set festival_uid = s.festival_uid
from festival_sources s where s.external_id = r.festival_id
  and r.festival_uid is distinct from s.festival_uid;

-- Abort instead of destructive dedup. CTO must investigate duplicates with their owners.
do $$ begin
  if exists (select 1 from reviews where festival_uid is not null
    group by festival_uid, user_id having count(*) > 1) then
    raise exception 'Duplicate UID/user reviews: retain records; resolve explicitly before migration';
  end if;
end $$;
create unique index if not exists reviews_uid_user_unique on reviews(festival_uid, user_id);

-- The caller cannot spoof a UID. RLS continues to check user_id = auth.uid().
create or replace function set_review_festival_uid() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  select s.festival_uid into new.festival_uid
  from public.festival_sources s where s.external_id = new.festival_id;
  return new;
end $$;
drop trigger if exists reviews_set_festival_uid on reviews;
create trigger reviews_set_festival_uid before insert or update on reviews
for each row execute function set_review_festival_uid();

-- Mapping created after a live-only review must backfill it too. Unique index rejects
-- ambiguous joins atomically rather than discarding old reviews.
create or replace function connect_source_reviews() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.reviews set festival_uid = new.festival_uid
  where festival_id = new.external_id and festival_uid is distinct from new.festival_uid;
  return new;
end $$;
revoke all on function connect_source_reviews() from public;
drop trigger if exists festival_sources_connect_reviews on festival_sources;
create trigger festival_sources_connect_reviews after insert or update of festival_uid on festival_sources
for each row execute function connect_source_reviews();

-- New consumers can use this UID view. Existing festival_rating/text-ID consumers remain intact.
create or replace view festival_rating_uid with (security_invoker = true) as
select festival_uid, round(avg(rating)::numeric, 1) as rating, count(*) as review_count
from reviews where status = 'published' and festival_uid is not null group by festival_uid;
grant select on festival_rating_uid to anon, authenticated;
commit;

-- Post-check (read only): should return zero, and review count/IDs must equal snapshot.
select count(*) as mismatched from reviews r join festival_sources s on s.external_id = r.festival_id
where r.festival_uid is distinct from s.festival_uid;
select festival_uid, user_id, count(*) from reviews where festival_uid is not null
group by festival_uid, user_id having count(*) > 1;
-- Rehearsal: authenticated A review → map A/B to same UID → B read/edit retains review ID;
-- concurrent A/B inserts for one user: exactly one succeeds (other unique violation).
-- Anonymous pending/hidden read and another user's write must fail RLS.
-- Rollback: roll back transaction on preflight failure; after commit, revert application first.
-- Drop only new triggers/index/view after review; retain UID columns and private snapshot.
