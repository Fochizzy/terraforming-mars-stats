create table if not exists public.user_hidden_leaderboard_players (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, player_id)
);

alter table public.user_hidden_leaderboard_players enable row level security;

drop policy if exists "users read their hidden leaderboard players"
on public.user_hidden_leaderboard_players;
create policy "users read their hidden leaderboard players"
on public.user_hidden_leaderboard_players
for select
using ((select auth.uid()) = user_id);

drop policy if exists "users add their hidden leaderboard players"
on public.user_hidden_leaderboard_players;
create policy "users add their hidden leaderboard players"
on public.user_hidden_leaderboard_players
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "users remove their hidden leaderboard players"
on public.user_hidden_leaderboard_players;
create policy "users remove their hidden leaderboard players"
on public.user_hidden_leaderboard_players
for delete
using ((select auth.uid()) = user_id);
