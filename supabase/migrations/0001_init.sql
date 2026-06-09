-- =============================================================
-- Mimzo — initial schema
-- Paste into Supabase SQL Editor:
--   https://supabase.com/dashboard/project/xzjolipaqgzowhovvojm/sql/new
-- =============================================================

------------------------------------------------------------------
-- 1. PROFILES (extends auth.users)
------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  telegram_id     bigint,
  telegram_username text,
  balance_rub     numeric(12,2) not null default 0,
  referred_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

------------------------------------------------------------------
-- 2. PLANS (tariff catalog)
------------------------------------------------------------------
create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  description     text,
  price_rub       numeric(10,2) not null,
  duration_days   integer not null,
  traffic_gb      integer not null,
  devices_limit   integer not null,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

------------------------------------------------------------------
-- 3. SUBSCRIPTIONS (user's VPN subscriptions)
------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  plan_id             uuid references public.plans(id),
  is_trial            boolean not null default false,
  status              text not null default 'active' check (status in ('active','expired','suspended')),
  sub_token           text unique not null,
  devices_limit       integer not null,
  traffic_gb          integer not null,
  traffic_used_bytes  bigint not null default 0,
  expires_at          timestamptz not null,
  marzneshin_username text unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists subscriptions_token_idx on public.subscriptions(sub_token);

------------------------------------------------------------------
-- 4. DEVICES (per-subscription device tracking)
------------------------------------------------------------------
create table if not exists public.devices (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  device_hash     text not null,
  display_name    text,
  os              text,
  client_app      text,
  first_seen      timestamptz not null default now(),
  last_seen       timestamptz not null default now(),
  unique (subscription_id, device_hash)
);

------------------------------------------------------------------
-- 5. PAYMENTS (history of all money movements)
------------------------------------------------------------------
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete restrict,
  provider     text not null check (provider in ('yookassa','manual','promo','referral','admin')),
  amount_rub   numeric(10,2) not null,
  status       text not null check (status in ('pending','succeeded','cancelled','failed')),
  purpose      text not null check (purpose in ('plan','extra_device','extra_traffic','topup','referral_payout','correction')),
  external_id  text unique,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_status_idx on public.payments(status);

------------------------------------------------------------------
-- 6. PROMO CODES
------------------------------------------------------------------
create table if not exists public.promo_codes (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null,
  description         text,
  discount_percent    integer check (discount_percent between 0 and 100),
  discount_amount_rub numeric(10,2),
  grant_days          integer,
  grant_traffic_gb    integer,
  uses_total          integer,
  uses_count          integer not null default 0,
  valid_until         timestamptz,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create table if not exists public.promo_usages (
  id        uuid primary key default gen_random_uuid(),
  promo_id  uuid not null references public.promo_codes(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  used_at   timestamptz not null default now(),
  unique (promo_id, user_id)
);

------------------------------------------------------------------
-- 7. REFERRALS
------------------------------------------------------------------
create table if not exists public.referrals (
  id                 uuid primary key default gen_random_uuid(),
  referrer_id        uuid not null references public.profiles(id) on delete cascade,
  referred_id        uuid not null references public.profiles(id) on delete cascade,
  commission_percent integer not null default 10,
  total_earned_rub   numeric(12,2) not null default 0,
  created_at         timestamptz not null default now(),
  unique (referrer_id, referred_id)
);

------------------------------------------------------------------
-- updated_at helper
------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_updated on public.subscriptions;
create trigger subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

------------------------------------------------------------------
-- handle_new_user: at signup, create profile + 3-day trial sub
------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_token text;
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);

  v_token := encode(gen_random_bytes(16), 'hex');

  insert into public.subscriptions
    (user_id, is_trial, sub_token, devices_limit, traffic_gb, expires_at)
  values
    (new.id, true, v_token, 2, 10, now() + interval '3 days');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------
-- RLS
------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.devices enable row level security;
alter table public.payments enable row level security;
alter table public.promo_usages enable row level security;
alter table public.referrals enable row level security;
alter table public.plans enable row level security;
alter table public.promo_codes enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- subscriptions
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- devices
drop policy if exists "devices_select_own" on public.devices;
create policy "devices_select_own" on public.devices
  for select using (
    exists (
      select 1 from public.subscriptions s
      where s.id = devices.subscription_id and s.user_id = auth.uid()
    )
  );
drop policy if exists "devices_delete_own" on public.devices;
create policy "devices_delete_own" on public.devices
  for delete using (
    exists (
      select 1 from public.subscriptions s
      where s.id = devices.subscription_id and s.user_id = auth.uid()
    )
  );

-- payments
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- promo_usages
drop policy if exists "promo_usages_select_own" on public.promo_usages;
create policy "promo_usages_select_own" on public.promo_usages
  for select using (auth.uid() = user_id);

-- referrals (visible to referrer)
drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = referrer_id);

-- plans + promo_codes: any authenticated can read active rows
drop policy if exists "plans_select_active" on public.plans;
create policy "plans_select_active" on public.plans
  for select to authenticated using (is_active = true);

drop policy if exists "promo_codes_select_active" on public.promo_codes;
create policy "promo_codes_select_active" on public.promo_codes
  for select to authenticated using (is_active = true);

------------------------------------------------------------------
-- Seed plans
------------------------------------------------------------------
insert into public.plans (code, name, description, price_rub, duration_days, traffic_gb, devices_limit, sort_order) values
  ('basic_1m',  'Базовый — 1 месяц',   'Все локации, 2 устройства',           199,  30,  100, 2, 10),
  ('basic_3m',  'Базовый — 3 месяца',  '−15% при оплате за 3 месяца',         507,  90,  100, 2, 20),
  ('basic_12m', 'Базовый — 12 месяцев','−40% при оплате за год',             1432, 365,  100, 2, 30),
  ('pro_1m',    'Премиум — 1 месяц',   '5 устройств, безлимит трафика',       449,  30, 9999, 5, 40),
  ('pro_3m',    'Премиум — 3 месяца',  '−15% к Премиум',                     1145,  90, 9999, 5, 50),
  ('pro_12m',   'Премиум — 12 месяцев','−40% к Премиум',                     3234, 365, 9999, 5, 60)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  price_rub = excluded.price_rub,
  duration_days = excluded.duration_days,
  traffic_gb = excluded.traffic_gb,
  devices_limit = excluded.devices_limit,
  sort_order = excluded.sort_order;
