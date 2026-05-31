-- FinTrack Supabase Schema
-- Run this in the Supabase SQL Editor for your project.
-- Dashboard → SQL Editor → New Query → paste & run.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Transactions ──────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  amount        numeric(10,2) not null check (amount > 0),
  type          text not null check (type in ('income', 'expense', 'refund')),
  category      text not null,
  description   text not null default '',
  created_at    timestamptz not null default now(),
  synced_at     timestamptz,
  device_id     text not null default ''
);

alter table public.transactions enable row level security;

create policy "Users can manage own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists transactions_user_created
  on public.transactions (user_id, created_at desc);

-- ─── People ────────────────────────────────────────────────────────────────
create table if not exists public.people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  phone      text not null default '',
  created_at timestamptz not null default now()
);

alter table public.people enable row level security;

create policy "Users can manage own contacts"
  on public.people
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Debts ─────────────────────────────────────────────────────────────────
create table if not exists public.debts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  person_id      uuid not null references public.people(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount         numeric(10,2) not null,  -- positive = they owe me, negative = I owe
  category       text not null default 'other',
  note           text not null default '',
  settled        boolean not null default false,
  created_at     timestamptz not null default now(),
  due_date       date,                              -- when they should repay
  remind_at      timestamptz                        -- last notification fired
);

alter table public.debts enable row level security;

create policy "Users can manage own debts"
  on public.debts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists debts_person_id on public.debts (person_id);
create index if not exists debts_settled   on public.debts (settled);

-- ─── Categories ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  icon       text not null default '📌',
  color      text not null default '#888888',
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can manage own categories"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Realtime subscriptions ────────────────────────────────────────────────
-- ─── Realtime: replica identity ───────────────────────────────────────────
-- Required for Supabase Realtime to work with RLS-enabled tables.
-- Without FULL, Supabase cannot check old row values against RLS policies
-- and silently drops change events — realtime will appear broken.
alter table public.transactions replica identity full;
alter table public.people       replica identity full;
alter table public.debts        replica identity full;
alter table public.categories   replica identity full;

-- Enable realtime for cross-device sync
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.people;
alter publication supabase_realtime add table public.debts;
alter publication supabase_realtime add table public.categories;


-- ─── Table-level grants ────────────────────────────────────────────────────
-- RLS policies filter rows, but PostgreSQL also requires these GRANT statements
-- for the authenticated role to be allowed to touch the tables at all.
-- 403 "permission denied" errors mean these are missing — run them now.
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.people       to authenticated;
grant select, insert, update, delete on public.debts        to authenticated;
grant select, insert, update, delete on public.categories   to authenticated;


-- ─── Migration patches (run on existing DB only) ──────────────────────────
-- Skip these if you are applying the schema for the first time.

-- Fix transaction type constraint
alter table public.transactions
  drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check check (type in ('income', 'expense', 'refund'));

-- Add missing debt columns
alter table public.debts
  add column if not exists due_date   date;
alter table public.debts
  add column if not exists remind_at  timestamptz;
