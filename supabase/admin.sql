-- 관리자와 배너 큐레이션.
--
-- 배너는 지금 '이번 주말 축제를 인기순으로' 자동으로 채운다. 관리 없이도 돌아가는 게
-- 기본값이어야 하기 때문이다 — 사람이 매주 손대야만 그림이 나오는 화면은 결국 빈다.
--
-- 그 위에 수동 큐레이션을 얹는다. 활성 슬롯이 하나라도 있으면 그것이 자동 목록을 대신한다.
-- 나중에 배너 자리를 파는 경우(축제 주최측 노출 광고)에도 같은 표를 쓴다.

-- ── 관리자 ──────────────────────────────────────────────
-- 역할은 profiles에 둔다. auth.users는 Supabase가 관리하는 표라 우리가 열을 더하지 않는다.
alter table profiles add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- 정책 안에서 쓸 판정 함수. security definer로 둬야 RLS 재귀에 걸리지 않는다
-- (정책이 profiles를 읽는데 그 읽기가 다시 정책을 부르는 고리).
create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;

-- ── 배너 슬롯 ───────────────────────────────────────────
create table if not exists promos (
  id          bigint generated always as identity primary key,
  festival_id text not null,
  ord         smallint not null default 0,
  -- 노출 기간. 비워 두면 계속 노출한다. 축제 주최측에 자리를 팔 때 여기에 계약 기간이 들어간다.
  starts_on   date,
  ends_on     date,
  active      boolean not null default true,
  -- 광고로 넣은 자리는 표시해야 한다. 돈 받은 노출을 추천인 척하면 그건 기만이다.
  sponsored   boolean not null default false,
  note        text,
  created_at  timestamptz default now()
);

create index if not exists promos_live on promos (active, ord);

alter table promos enable row level security;

-- 노출 중인 슬롯은 누구나 읽는다(화면이 읽어야 하니까). 쓰기는 관리자만.
create policy promos_read on promos for select
  using (active and (starts_on is null or starts_on <= current_date)
                and (ends_on   is null or ends_on   >= current_date));
create policy promos_admin_read  on promos for select using (is_admin());
create policy promos_admin_write on promos for all    using (is_admin()) with check (is_admin());

-- ── 리뷰 검토 ───────────────────────────────────────────
-- 지금까지는 Supabase 대시보드에서 status를 손으로 고쳐야 했다. 관리자가 화면에서 하게 한다.
create policy reviews_admin_read   on reviews for select using (is_admin());
create policy reviews_admin_update on reviews for update using (is_admin()) with check (is_admin());
create policy reviews_admin_delete on reviews for delete using (is_admin());

-- 신고도 관리자만 본다
create policy reports_admin_read   on reports for select using (is_admin());
create policy reports_admin_update on reports for update using (is_admin()) with check (is_admin());

-- ── 첫 관리자 지정 ──────────────────────────────────────
-- 아래 이메일로 한 번 로그인한 뒤 이 줄을 실행하면 관리자가 된다.
-- (로그인 전에는 auth.users에 행이 없어 아무 일도 일어나지 않는다)
insert into profiles (id, display_name, role)
select id, coalesce(split_part(email, '@', 1), '관리자'), 'admin'
from auth.users
where email = 'yuneunmi814@gmail.com'
on conflict (id) do update set role = 'admin';
