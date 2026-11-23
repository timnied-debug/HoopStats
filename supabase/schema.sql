-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists allowed_users (
  email text primary key
);

create table if not exists players (
  id uuid primary key,
  name text not null,
  number text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists games (
  id uuid primary key,
  opponent text not null,
  date date not null,
  location text not null default '',
  video_name text,
  video_size bigint,
  clip_pre real not null default 7,
  clip_post real not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key,
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  type text not null,
  t real not null,
  created_at timestamptz not null default now()
);
create index if not exists events_game_idx on events(game_id);

-- Only emails listed in allowed_users can read or change anything.
create or replace function is_family() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from allowed_users where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

alter table allowed_users enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table events enable row level security;

drop policy if exists family_all on players;
drop policy if exists family_all on games;
drop policy if exists family_all on events;
create policy family_all on players for all using (is_family()) with check (is_family());
create policy family_all on games for all using (is_family()) with check (is_family());
create policy family_all on events for all using (is_family()) with check (is_family());
-- allowed_users has no policies: it is managed only from the Supabase dashboard.

-- Add yourself and up to a few family members (edit these):
-- insert into allowed_users (email) values ('you@example.com'), ('spouse@example.com');
