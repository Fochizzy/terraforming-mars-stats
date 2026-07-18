-- Minimal, faithful bootstrap of the production dependency surface that the
-- data-capture-hardening-v2 migrations rely on. This is NOT the full Supabase
-- schema; it reproduces exactly the roles, auth shim, prerequisite tables, and
-- RLS helper functions referenced by:
--   * 20260718200536_add_venus_colonies_import_facts.sql (reconstruction)
--   * 20260718204000_add_game_mechanic_capture.sql (v1 mechanic capture)
--   * 20260719120000_data_capture_hardening_v2.sql (v2 capture)
--
-- Applying those three migrations on top of this bootstrap on a fresh database
-- is the executable clean-baseline validation for the capture dependency
-- surface (the full `supabase db reset` path additionally needs a Supabase
-- Postgres image, which is unavailable in this environment).

-- Supabase roles ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

-- auth shim -----------------------------------------------------------------
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
grant usage on schema auth to anon, authenticated, service_role;

-- Tests set `test.uid` to simulate the signed-in user for RLS.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

-- Prerequisite public tables (only the columns the capture objects touch) ---
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'group'
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  primary key (group_id, user_id)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  display_name text not null default 'player'
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'players_group_id_id_unique') then
    alter table public.players add constraint players_group_id_id_unique unique (group_id, id);
  end if;
end $$;

create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  code text unique
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  map_id uuid references public.maps(id),
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null
);

create table if not exists public.game_log_imports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  raw_log_text text,
  parser_version text,
  input_sha256 text,
  output_sha256 text,
  parsed_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'game_log_imports_game_id_id_unique') then
    alter table public.game_log_imports add constraint game_log_imports_game_id_id_unique unique (game_id, id);
  end if;
end $$;

-- RLS helper functions (verbatim from 20260703121500_create_core_rls.sql) ---
create or replace function public.is_group_member(target_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_group(target_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = auth.uid()
      and gm.role in ('owner', 'editor')
  );
$$;

create or replace function public.can_read_game(target_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.games g
    where g.id = target_game_id and public.is_group_member(g.group_id)
  );
$$;

create or replace function public.can_edit_game(target_game_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.games g
    where g.id = target_game_id and public.can_edit_group(g.group_id)
  );
$$;

grant usage on schema public to anon, authenticated, service_role;
