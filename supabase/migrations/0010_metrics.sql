-- =============================================================
-- Monitoring — periodic snapshots of load & online counts.
-- `metrics`: VPN-level snapshot (cabinet cron, every minute).
-- `server_metrics`: per-server CPU/RAM/net (agent on each box).
-- Join by timestamp to see "at peak online, load was X".
-- =============================================================

create table if not exists public.metrics (
  id           bigint generated always as identity primary key,
  ts           timestamptz not null default now(),
  online_users int,
  active_devices int,
  total_users  int,
  bw_in_bps    bigint,   -- incoming bandwidth speed (bytes/s)
  bw_out_bps   bigint,   -- outgoing bandwidth speed (bytes/s)
  nodes        jsonb     -- { "<node name>": cumulative_bytes }
);
create index if not exists metrics_ts_idx on public.metrics (ts desc);

create table if not exists public.server_metrics (
  id         bigint generated always as identity primary key,
  ts         timestamptz not null default now(),
  ip         text not null,
  cpu_pct    numeric,
  mem_pct    numeric,
  load1      numeric,
  net_rx_bps bigint,
  net_tx_bps bigint,
  conns      int
);
create index if not exists server_metrics_ts_idx on public.server_metrics (ts desc);
create index if not exists server_metrics_ip_ts_idx on public.server_metrics (ip, ts desc);

alter table public.metrics enable row level security;
alter table public.server_metrics enable row level security;
