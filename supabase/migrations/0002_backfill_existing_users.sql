-- ===============================================================
-- Backfill: создать profile + триал-подписку для всех auth.users,
-- которые зарегистрировались ДО применения 0001_init.sql
-- ===============================================================

-- 1) Профили
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 2) Триал-подписки для тех, у кого ни одной подписки нет
insert into public.subscriptions
  (user_id, is_trial, sub_token, devices_limit, traffic_gb, expires_at)
select
  u.id,
  true,
  encode(gen_random_bytes(16), 'hex'),
  2,
  10,
  now() + interval '3 days'
from auth.users u
left join public.subscriptions s on s.user_id = u.id
where s.id is null;
