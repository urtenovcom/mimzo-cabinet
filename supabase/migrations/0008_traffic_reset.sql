-- =============================================================
-- Monthly traffic reset, anchored to purchase day.
-- =============================================================

alter table public.subscriptions
  add column if not exists next_traffic_reset_at timestamptz;

-- Backfill: existing subs reset 30 days after their creation.
update public.subscriptions
  set next_traffic_reset_at = created_at + interval '30 days'
  where next_traffic_reset_at is null;
