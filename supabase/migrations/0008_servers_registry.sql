-- =============================================================
-- Server registry — our own inventory of ALL servers (bridges,
-- exits, core) with metadata Marzban doesn't track: hosting,
-- payment due date, hardware specs, notes.
-- =============================================================

create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- editable display name
  ip text unique not null,
  role text not null default 'exit',  -- core | bridge | exit
  hosting text,                       -- serv.host / friendhosting / ...
  location text,                      -- country / city label
  inbound_tag text,                   -- links an exit to its Marzban host
  paid_until date,                    -- next payment due
  cpu text,
  ram text,
  disk text,
  bandwidth text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists servers_role_idx on public.servers(role);
create index if not exists servers_inbound_tag_idx on public.servers(inbound_tag);

-- RLS: only service-role (admin) touches this. Block anon entirely.
alter table public.servers enable row level security;
