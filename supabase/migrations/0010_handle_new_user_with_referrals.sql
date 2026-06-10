-- =============================================================
-- Process ref_code from auth.users.raw_user_meta_data:
--   1) Find referrer whose UUID starts with the 8-char ref_code
--   2) Set profiles.referred_by = referrer.id
--   3) Insert into referrals table
-- =============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, auth, extensions as $$
declare
  v_token text;
  v_ref_code text;
  v_referrer_id uuid;
begin
  v_token := replace(gen_random_uuid()::text, '-', '');

  -- Pull ref_code from metadata if present (8-char prefix of referrer's UUID)
  v_ref_code := new.raw_user_meta_data ->> 'ref_code';
  if v_ref_code is not null and length(v_ref_code) >= 6 then
    select id into v_referrer_id
    from public.profiles
    where id::text like v_ref_code || '%'
      and id <> new.id
    limit 1;
  end if;

  insert into public.profiles (id, email, referred_by)
    values (new.id, new.email, v_referrer_id)
    on conflict (id) do nothing;

  insert into public.subscriptions (
    user_id, is_trial, sub_token,
    devices_limit, traffic_gb, expires_at,
    next_traffic_reset_at
  )
  select
    new.id, true, v_token,
    2, 10, now() + interval '3 days',
    now() + interval '30 days'
  where not exists (select 1 from public.subscriptions where user_id = new.id);

  -- Record the referral link so the referrer sees it on their dashboard
  if v_referrer_id is not null then
    insert into public.referrals (referrer_id, referred_id, commission_percent)
    values (v_referrer_id, new.id, 10)
    on conflict do nothing;
  end if;

  return new;
end; $$;
