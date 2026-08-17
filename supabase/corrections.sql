-- 정보 수정 요청 — 화면에서 바로 오류를 알리는 창구.
--
-- 오늘 유령 축제 263건을 웹으로 하나하나 확인해서 걸러냈다(「남원 워터밤」은 2024년이
-- 마지막인데 예정으로 실려 있었다). 그 일을 그 축제에 실제로 다녀온 사람이 대신해 줄 수 있다.
-- 데이터 품질은 우리 혼자 지키는 것보다 이용자와 함께 지키는 편이 훨씬 촘촘하다.
--
-- 로그인을 요구하지 않는다. "날짜가 틀렸어요" 한 줄 남기려고 가입해야 한다면 아무도 안 한다.
-- 대신 아무나 읽지는 못하게 한다 — 남긴 사람의 연락처가 담길 수 있다.

create table if not exists corrections (
  id          bigint generated always as identity primary key,
  festival_id text not null,
  -- 무엇이 틀렸나. 고르게 해야 처리할 수 있다 — 자유 서술만 받으면 분류에 사람이 붙는다.
  kind        text not null check (kind in ('dates', 'place', 'canceled', 'photo', 'link', 'other')),
  body        text not null check (char_length(body) between 2 and 2000),
  -- 답을 받고 싶은 사람만 남긴다. 필수가 아니다.
  contact     text,
  -- 익명 방문자 구분(events와 같은 브라우저 ID). 한 사람이 도배하는 걸 나중에 가려낸다.
  visitor     text,
  lang        text,
  status      text not null default 'open' check (status in ('open', 'fixed', 'rejected')),
  admin_note  text,
  created_at  timestamptz default now()
);

create index if not exists corrections_open on corrections (status, created_at desc);
create index if not exists corrections_fest on corrections (festival_id, created_at desc);

alter table corrections enable row level security;

-- 누구나 남긴다. 읽기는 관리자만 — 연락처가 담기므로 공개 정책을 만들지 않는다.
create policy corrections_insert      on corrections for insert with check (true);
create policy corrections_admin_read  on corrections for select using (is_admin());
create policy corrections_admin_write on corrections for update using (is_admin()) with check (is_admin());
create policy corrections_admin_del   on corrections for delete using (is_admin());
