-- =============================================================
-- Per-device Marzban users. Each device row owns its own UUID;
-- removing the device deletes the Marzban user → revokes its UUID
-- in xray. Reconnecting from the same HWID later → /sub re-fetch
-- → new device row → new UUID → device reappears in cabinet.
-- =============================================================

alter table public.devices
  add column if not exists marzban_username text unique,
  add column if not exists last_online_at timestamptz;

create index if not exists devices_marzban_username_idx
  on public.devices(marzban_username);
