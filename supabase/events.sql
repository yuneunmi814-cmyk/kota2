-- 행동 로그 — 개인화와 분석의 재료.
--
-- 알고리즘은 나중에 얼마든지 바꾼다. 하지만 행동 데이터는 소급해서 모을 수 없다.
-- 오늘 안 쌓으면 세 달 뒤에 추천을 만들려 해도 재료가 없다. 그래서 먼저 넣는다.
--
-- 무엇을 남기나: 무엇을 봤나 · 무엇을 검색했나 · 어떤 필터를 눌렀나 · 어디로 나갔나.
-- 무엇을 남기지 않나: IP, 정확한 위치, 기기 지문. 개인을 특정할 수 있는 건 담지 않는다.
-- 익명 방문자는 브라우저가 만든 임의의 문자열로만 구분하고, 로그인하면 그때 user_id가 붙는다.

create table if not exists events (
  id          bigint generated always as identity primary key,
  -- 브라우저가 만든 임의 ID. 사람을 특정하지 못하고, 지우면 새 사람이 된다.
  visitor     text not null,
  user_id     uuid references profiles(id) on delete set null,
  kind        text not null check (kind in ('view', 'search', 'filter', 'click', 'outbound', 'save')),
  festival_id text,
  -- 검색어·필터값처럼 종류마다 다른 것. 스키마를 자주 고치지 않으려고 jsonb로 둔다.
  payload     jsonb,
  lang        text,
  created_at  timestamptz default now()
);

create index if not exists events_time     on events (created_at desc);
create index if not exists events_festival on events (festival_id, created_at desc);
create index if not exists events_visitor  on events (visitor, created_at desc);
create index if not exists events_kind     on events (kind, created_at desc);

alter table events enable row level security;

-- 누구나 남길 수 있지만 아무도 읽을 수 없다.
-- 읽기 정책을 만들지 않는 게 핵심이다 — 정책이 없으면 anon 키로는 조회가 통째로 막힌다.
-- 분석은 Secret 키를 쥔 쪽(대시보드·집계 작업)만 한다. 남의 동선을 브라우저에서
-- 들여다볼 수 있으면 그건 로그가 아니라 유출이다.
create policy events_insert on events for insert with check (true);

-- ── 집계 뷰 — 원시 로그를 매번 훑지 않게 ──────────────────────
create or replace view festival_views_30d as
select festival_id,
       count(*)                       as views,
       count(distinct visitor)        as visitors
from events
where kind = 'view'
  and festival_id is not null
  and created_at > now() - interval '30 days'
group by festival_id;

-- 무엇을 찾는데 못 찾았나 — 결과가 0이었던 검색어. 데이터의 구멍이 여기서 보인다.
create or replace view empty_searches as
select payload->>'q'          as query,
       count(*)               as hits,
       max(created_at)        as last_seen
from events
where kind = 'search' and (payload->>'results')::int = 0
group by 1
order by 2 desc;
