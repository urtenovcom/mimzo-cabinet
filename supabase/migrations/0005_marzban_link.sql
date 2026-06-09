-- =============================================================
-- Link Supabase subscriptions to Marzban users for per-user UUIDs
-- and real traffic accounting.
-- =============================================================

alter table public.subscriptions
  add column if not exists marzban_username text unique;

create index if not exists subscriptions_marzban_username_idx
  on public.subscriptions(marzban_username);
