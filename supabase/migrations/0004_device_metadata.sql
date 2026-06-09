-- =============================================================
-- Add raw UA + HWID columns so we can parse device names properly
-- =============================================================

alter table public.devices add column if not exists hwid text;
alter table public.devices add column if not exists ua_raw text;
alter table public.devices add column if not exists app_version text;
