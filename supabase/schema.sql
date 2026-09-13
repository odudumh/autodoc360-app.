-- Run this once in the Supabase SQL editor (free project) to create the tables.

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid, -- will link to auth.users once login is added; left nullable for now
  name text not null,
  plate text not null,
  created_at timestamptz default now()
);

create table if not exists tracked_items (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade,
  category text not null, -- licence | registration | insurance | tyres | oil | service | extinguisher | plugs | custom
  label text,             -- only used when category = 'custom'
  due_date date not null,
  created_at timestamptz default now()
);

-- Row Level Security: off for now during local/single-user testing.
-- Once phone-number auth is added, enable RLS and add policies like:
--   alter table vehicles enable row level security;
--   create policy "Users manage their own vehicles"
--     on vehicles for all
--     using (auth.uid() = owner_id);
