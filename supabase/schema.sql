-- Padel Mexicano Tournament Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/<your-project>/sql)

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists tournaments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  num_courts  int  not null check (num_courts >= 1),
  created_at  timestamptz default now()
);

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
-- ROW LEVEL SECURITY — public read access
-- ============================================================

alter table tournaments enable row level security;
alter table players     enable row level security;
alter table rounds      enable row level security;
alter table matches     enable row level security;

-- Public read
create policy "public read tournaments"  on tournaments  for select using (true);
create policy "public read players"      on players      for select using (true);
create policy "public read rounds"       on rounds       for select using (true);
create policy "public read matches"      on matches      for select using (true);

-- Public write (anyone with the URL can modify their own tournament)
create policy "public insert tournaments" on tournaments for insert with check (true);
create policy "public insert players"     on players     for insert with check (true);
create policy "public insert rounds"      on rounds      for insert with check (true);
create policy "public insert matches"     on matches     for insert with check (true);

create policy "public update matches" on matches for update using (true);

-- ============================================================
-- REALTIME — enable for matches table
-- ============================================================

-- Add matches to Supabase Realtime publication
-- (Run this ONLY if the supabase_realtime publication exists, which it does by default)
alter publication supabase_realtime add table matches;
