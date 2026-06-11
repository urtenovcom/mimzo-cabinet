-- Per-server traffic allowance. NULL = unlimited (безлимит).
alter table public.servers
  add column if not exists traffic_limit_gb integer;
