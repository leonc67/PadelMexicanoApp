-- Padel Mexicano Tournament Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/<your-project>/sql)

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists tournaments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  num_courts  int  not null check (num_courts >= 1),
  max_points  int  not null default 16 check (max_points >= 1),
  created_at  timestamptz default now()
);

-- For databases created before max_points existed
alter table tournaments add column if not exists max_points int not null default 16;

create table if not exists players (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  name           text not null,
  created_at     timestamptz default now()
);

create table if not exists rounds (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments(id) on delete cascade,
  round_number   int  not null,
  created_at     timestamptz default now(),
  unique (tournament_id, round_number)
);

create table if not exists matches (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references rounds(id) on delete cascade,
  court      int  not null,
  team_a     uuid[] not null,
  team_b     uuid[] not null,
  score_a    int,
  score_b    int,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table tournaments enable row level security;
alter table players     enable row level security;
alter table rounds      enable row level security;
alter table matches     enable row level security;

-- Policies are dropped first so this script can be re-run safely.
-- Anyone with the URL can read and modify tournaments (no auth).

-- Read
drop policy if exists "public read tournaments" on tournaments;
drop policy if exists "public read players"     on players;
drop policy if exists "public read rounds"      on rounds;
drop policy if exists "public read matches"     on matches;
create policy "public read tournaments" on tournaments for select using (true);
create policy "public read players"     on players     for select using (true);
create policy "public read rounds"      on rounds      for select using (true);
create policy "public read matches"     on matches     for select using (true);

-- Insert
drop policy if exists "public insert tournaments" on tournaments;
drop policy if exists "public insert players"     on players;
drop policy if exists "public insert rounds"      on rounds;
drop policy if exists "public insert matches"     on matches;
create policy "public insert tournaments" on tournaments for insert with check (true);
create policy "public insert players"     on players     for insert with check (true);
create policy "public insert rounds"      on rounds      for insert with check (true);
create policy "public insert matches"     on matches     for insert with check (true);

-- Update (court count, player rename, scores and pairings)
drop policy if exists "public update tournaments" on tournaments;
drop policy if exists "public update players"     on players;
drop policy if exists "public update matches"     on matches;
create policy "public update tournaments" on tournaments for update using (true) with check (true);
create policy "public update players"     on players     for update using (true) with check (true);
create policy "public update matches"     on matches     for update using (true) with check (true);

-- Delete (remove player, reset tournament)
drop policy if exists "public delete players" on players;
drop policy if exists "public delete rounds"  on rounds;
drop policy if exists "public delete matches" on matches;
create policy "public delete players" on players for delete using (true);
create policy "public delete rounds"  on rounds  for delete using (true);
create policy "public delete matches" on matches for delete using (true);

-- ============================================================
-- REALTIME — enable for matches table
-- ============================================================

-- Add matches to the Supabase Realtime publication (skipped if already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;
end $$;
