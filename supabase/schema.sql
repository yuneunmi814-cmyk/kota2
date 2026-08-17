-- KOTA 데이터베이스 스키마 (Postgres / Supabase)
--
-- 두 층으로 나뉜다.
--   ① 축제 데이터 — 파이프라인이 주 1회 통째로 덮어쓴다. 사람이 손대지 않는다.
--   ② 이용자 데이터 — 리뷰·저장·조회. 지우면 복구할 수 없다.
-- 파이프라인이 ①을 갈아엎어도 ②가 다치지 않도록 외래키를 ON DELETE CASCADE로 걸지 않고,
-- 축제가 사라져도 리뷰는 남긴다(축제는 매년 다시 열리고, 작년 리뷰도 읽을 값어치가 있다).

-- ────────────────────────────────────────────────────────────
-- ① 축제 데이터
-- ────────────────────────────────────────────────────────────

create table if not exists festivals (
  id            text primary key,          -- externalId ('tourapi:506523')
  name          text not null,
  start_date    date not null,
  end_date      date not null,
  sido          text,
  sigungu       text,
  address       text,
  lat           double precision,
  lng           double precision,
  image_url     text,
  image_from    text,                      -- own | past | scraped
  image_source  text,                      -- 스크랩 이미지의 출처 페이지
  summary       text,
  program       text,
  fee           text,
  homepage      text,
  instagram     text,
  youtube       text,
  tel           text,
  category      text,                      -- 'MF' = 문화관광축제 지정
  organizer     text,
  booths        jsonb,                     -- [{name, menu:[{name, price}]}] — 구조가 있으니 text가 아니다
  booths_from_past boolean default false,
  age_info      text,
  hours         text,
  themes        text[] default '{}',
  popularity    integer default 0,
  visitor_lift  numeric(5,2),              -- 지난 회차 방문객 배율(통신사 실측)
  sources       text[] default '{}',
  tourapi_id    text,
  synced_at     timestamptz default now()
);

create index if not exists festivals_dates      on festivals (end_date, start_date);
create index if not exists festivals_region     on festivals (sido, sigungu);
create index if not exists festivals_popularity on festivals (popularity desc);
create index if not exists festivals_themes     on festivals using gin (themes);
-- 이름·주소 부분검색 — 목록 검색창이 이걸 탄다
create extension if not exists pg_trgm;
create index if not exists festivals_name_trgm  on festivals using gin (name gin_trgm_ops);

create table if not exists festival_translations (
  festival_id text not null references festivals(id) on delete cascade,
  lang        text not null,               -- en | ja | th
  name        text,
  summary     text,
  place_name  text,
  program     text,
  fee         text,
  primary key (festival_id, lang)
);

create table if not exists festival_photos (
  festival_id text not null references festivals(id) on delete cascade,
  ord         smallint not null,
  url         text not null,
  thumb       text,
  caption     text,
  primary key (festival_id, ord)
);

-- ────────────────────────────────────────────────────────────
-- ② 이용자 데이터
-- ────────────────────────────────────────────────────────────

-- auth.users를 직접 조회하지 않고 공개해도 되는 것만 여기 둔다
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz default now()
);

create table if not exists reviews (
  id          bigint generated always as identity primary key,
  festival_id text not null,               -- 일부러 FK 없음: 축제가 갱신돼도 리뷰는 남는다
  user_id     uuid not null references auth.users(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text not null check (char_length(body) between 10 and 4000),
  visited_on  date,
  -- 공개 전 검토를 거친다. 심사 기간에 악성 글이 그대로 노출되면 그게 심사 화면이 된다.
  status      text not null default 'pending' check (status in ('pending','published','hidden')),
  helpful     integer not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  -- 한 축제에 한 사람이 한 번. 회차가 바뀌면 수정하게 한다.
  unique (festival_id, user_id)
);

create index if not exists reviews_festival on reviews (festival_id, status, created_at desc);
create index if not exists reviews_user     on reviews (user_id, created_at desc);

create table if not exists review_photos (
  review_id bigint not null references reviews(id) on delete cascade,
  ord       smallint not null,
  url       text not null,
  primary key (review_id, ord)
);

create table if not exists review_votes (
  review_id bigint not null references reviews(id) on delete cascade,
  user_id   uuid   not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (review_id, user_id)
);

create table if not exists reports (
  id         bigint generated always as identity primary key,
  review_id  bigint not null references reviews(id) on delete cascade,
  reporter   uuid   references auth.users(id) on delete set null,
  reason     text not null,
  handled    boolean default false,
  created_at timestamptz default now()
);

-- 관심리스트
create table if not exists saves (
  user_id     uuid not null references auth.users(id) on delete cascade,
  festival_id text not null,
  created_at  timestamptz default now(),
  primary key (user_id, festival_id)
);

-- 조회수 — 일자별 집계. 요청마다 UPDATE하면 잠금 경합이 생긴다.
create table if not exists views (
  festival_id text not null,
  day         date not null,
  count       integer not null default 0,
  primary key (festival_id, day)
);

-- ────────────────────────────────────────────────────────────
-- 집계 뷰 — 상세 화면이 매번 리뷰 전체를 세지 않게
-- ────────────────────────────────────────────────────────────
create or replace view festival_rating as
select festival_id,
       round(avg(rating)::numeric, 1) as rating,
       count(*)                        as review_count
from reviews
where status = 'published'
group by festival_id;

-- ────────────────────────────────────────────────────────────
-- 행 수준 보안(RLS) — 이게 없으면 anon 키로 남의 리뷰를 지울 수 있다
-- ────────────────────────────────────────────────────────────
alter table festivals              enable row level security;
alter table festival_translations  enable row level security;
alter table festival_photos        enable row level security;
alter table profiles               enable row level security;
alter table reviews                enable row level security;
alter table review_photos          enable row level security;
alter table review_votes           enable row level security;
alter table saves                  enable row level security;
alter table reports                enable row level security;
alter table views                  enable row level security;

-- 축제 데이터는 누구나 읽는다. 쓰기는 service_role(파이프라인)만 — 정책을 안 만들면 막힌다.
create policy festivals_read     on festivals             for select using (true);
create policy translations_read  on festival_translations for select using (true);
create policy photos_read        on festival_photos       for select using (true);
create policy profiles_read      on profiles              for select using (true);
create policy views_read         on views                 for select using (true);

-- 공개된 리뷰는 누구나, 자기 리뷰는 검토 중이어도 본인이 본다
create policy reviews_read on reviews for select
  using (status = 'published' or user_id = auth.uid());
create policy reviews_insert on reviews for insert
  with check (user_id = auth.uid());
create policy reviews_update on reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_delete on reviews for delete
  using (user_id = auth.uid());

create policy review_photos_read on review_photos for select using (true);
create policy review_photos_write on review_photos for all
  using (exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid()));

create policy votes_read   on review_votes for select using (true);
create policy votes_write  on review_votes for all using (user_id = auth.uid());

create policy saves_own    on saves   for all using (user_id = auth.uid());
create policy reports_add  on reports for insert with check (true);

create policy profiles_write on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- 도움돼요 수를 리뷰 행에 반영 — 목록 정렬이 매번 votes를 세지 않게
create or replace function sync_helpful() returns trigger language plpgsql security definer as $$
begin
  update reviews set helpful = (select count(*) from review_votes v where v.review_id = coalesce(new.review_id, old.review_id))
  where id = coalesce(new.review_id, old.review_id);
  return null;
end $$;

drop trigger if exists review_votes_sync on review_votes;
create trigger review_votes_sync after insert or delete on review_votes
for each row execute function sync_helpful();
