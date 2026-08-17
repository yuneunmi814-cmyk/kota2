-- 관리자 추가 — 아래 이메일만 바꿔서 실행하면 된다.
--
-- ⚠️ 그 사람이 /admin 에서 한 번 로그인한 뒤에 실행해야 한다.
-- 로그인 전에는 auth.users에 계정이 없어 아무 일도 일어나지 않는다(에러도 안 난다).

insert into profiles (id, display_name, role)
select id, coalesce(split_part(email, '@', 1), '관리자'), 'admin'
from auth.users
where email in (
  'yuneunmi814@gmail.com'
  -- , '팀원1@example.com'
  -- , '팀원2@example.com'
)
on conflict (id) do update set role = 'admin';

-- 확인
select display_name, role from profiles order by role, display_name;
