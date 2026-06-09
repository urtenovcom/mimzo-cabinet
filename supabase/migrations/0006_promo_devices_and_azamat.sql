-- =============================================================
-- Promo can now grant a device-slot bump; seed personal AZAMAT promo
-- =============================================================

alter table public.promo_codes
  add column if not exists grant_devices integer;

insert into public.promo_codes (
  code, description,
  grant_devices, grant_traffic_gb, grant_days,
  uses_total, is_active
) values (
  'AZAMAT',
  'Личный промокод владельца',
  4, 250, 30,
  null, true
)
on conflict (code) do update
  set grant_devices = excluded.grant_devices,
      grant_traffic_gb = excluded.grant_traffic_gb,
      grant_days = excluded.grant_days,
      description = excluded.description,
      is_active = true;
