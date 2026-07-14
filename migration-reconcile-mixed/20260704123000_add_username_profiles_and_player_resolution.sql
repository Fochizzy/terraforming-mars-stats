create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  last_active_group_id uuid references public.groups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
drop policy if exists "users read their own profiles" on public.user_profiles;
create policy "users read their own profiles"
on public.user_profiles for select
using (user_id = auth.uid());
drop policy if exists "users insert their own profiles" on public.user_profiles;
create policy "users insert their own profiles"
on public.user_profiles for insert
with check (user_id = auth.uid());
drop policy if exists "users update their own profiles" on public.user_profiles;
create policy "users update their own profiles"
on public.user_profiles for update
using (user_id = auth.uid())
with check (user_id = auth.uid());
alter table public.players
add column if not exists normalized_display_name text
generated always as (
  btrim(regexp_replace(lower(display_name), '[^a-z0-9]+', ' ', 'g'))
) stored;
create unique index if not exists players_group_id_normalized_display_name_idx
on public.players (group_id, normalized_display_name);
drop policy if exists "editors manage players" on public.players;
create policy "members manage players"
on public.players for all
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));
drop policy if exists "editors can write games" on public.games;
create policy "members can write games"
on public.games for all
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));
drop policy if exists "editors can write game players" on public.game_players;
create policy "members can write game players"
on public.game_players for all
using (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.is_group_member(g.group_id)
  )
)
with check (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and public.is_group_member(g.group_id)
  )
);
drop policy if exists "editors can write game revisions" on public.game_revisions;
create policy "members can write game revisions"
on public.game_revisions for all
using (public.can_read_game(game_id))
with check (public.can_read_game(game_id));
