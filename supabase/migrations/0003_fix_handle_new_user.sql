-- ===============================================================
-- Fix: handle_new_user trigger failed because gen_random_bytes
-- lives in `extensions` schema on Supabase, which wasn't in
-- search_path. Switch to gen_random_uuid() — works without extensions.
-- ===============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_token text;
begin
  -- 32-char hex token (no extensions required)
  v_token := replace(gen_random_uuid()::text, '-', '');

  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.subscriptions
    (user_id, is_trial, sub_token, devices_limit, traffic_gb, expires_at)
  select
    new.id, true, v_token, 2, 10, now() + interval '3 days'
  where not exists (
    select 1 from public.subscriptions where user_id = new.id
  );

  return new;
end;
$$;
