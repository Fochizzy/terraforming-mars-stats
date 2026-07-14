create table if not exists public.user_leaderboard_players (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, player_id)
);
alter table public.user_leaderboard_players enable row level security;
drop policy if exists "users read their own leaderboard players" on public.user_leaderboard_players;
create policy "users read their own leaderboard players"
on public.user_leaderboard_players for select
using (user_id = auth.uid());
drop policy if exists "users add their own leaderboard players" on public.user_leaderboard_players;
create policy "users add their own leaderboard players"
on public.user_leaderboard_players for insert
with check (user_id = auth.uid());
drop policy if exists "users remove their own leaderboard players" on public.user_leaderboard_players;
create policy "users remove their own leaderboard players"
on public.user_leaderboard_players for delete
using (user_id = auth.uid());
create or replace function public.get_elo_leaderboard()
returns table (
  player_id uuid,
  player_name text,
  elo_rating integer,
  games_played integer,
  wins integer,
  win_rate numeric,
  average_win_margin numeric,
  last_change numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  game_record record;
  left_row record;
  right_row record;
  left_rating numeric;
  right_rating numeric;
  left_expected numeric;
  left_actual numeric;
  margin_multiplier numeric;
  rating_delta numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  create temporary table if not exists elo_work (
    id uuid primary key,
    name text not null,
    rating numeric not null default 1500,
    played integer not null default 0,
    won integer not null default 0,
    win_margin_total numeric not null default 0,
    win_margin_games integer not null default 0,
    latest_change numeric not null default 0
  ) on commit drop;
  truncate elo_work;

  insert into elo_work (id, name)
  select distinct p.id, p.display_name
  from public.players p
  join public.game_players gp on gp.player_id = p.id
  join public.games g on g.id = gp.game_id
  where g.status = 'finalized';

  for game_record in
    select g.id, g.played_on
    from public.games g
    where g.status = 'finalized'
    order by g.played_on, g.created_at, g.id
  loop
    create temporary table if not exists elo_game_delta (
      id uuid primary key,
      delta numeric not null default 0
    ) on commit drop;
    truncate elo_game_delta;

    insert into elo_game_delta (id)
    select gp.player_id from public.game_players gp where gp.game_id = game_record.id;

    for left_row in
      select gp.player_id, gp.placement, gp.total_points, gp.is_winner
      from public.game_players gp
      where gp.game_id = game_record.id
    loop
      update elo_work
      set played = played + 1,
          won = won + case when left_row.is_winner then 1 else 0 end
      where id = left_row.player_id;

      if left_row.is_winner then
        update elo_work
        set win_margin_total = win_margin_total + greatest(
              left_row.total_points - coalesce((
                select max(gp2.total_points)
                from public.game_players gp2
                where gp2.game_id = game_record.id
                  and gp2.player_id <> left_row.player_id
              ), left_row.total_points), 0
            ),
            win_margin_games = win_margin_games + 1
        where id = left_row.player_id;
      end if;

      for right_row in
        select gp.player_id, gp.placement, gp.total_points
        from public.game_players gp
        where gp.game_id = game_record.id
          and gp.player_id > left_row.player_id
      loop
        select rating into left_rating from elo_work where id = left_row.player_id;
        select rating into right_rating from elo_work where id = right_row.player_id;
        left_expected := 1 / (1 + power(10, (right_rating - left_rating) / 400));
        left_actual := case
          when left_row.placement < right_row.placement then 1
          when left_row.placement > right_row.placement then 0
          else 0.5
        end;
        margin_multiplier := 1 + least(ln(1 + abs(left_row.total_points - right_row.total_points)) / 4, 0.75);
        rating_delta := (24 * margin_multiplier * (left_actual - left_expected)) /
          greatest((select count(*) - 1 from public.game_players gp where gp.game_id = game_record.id), 1);

        update elo_game_delta set delta = delta + rating_delta where id = left_row.player_id;
        update elo_game_delta set delta = delta - rating_delta where id = right_row.player_id;
      end loop;
    end loop;

    update elo_work ew
    set rating = ew.rating + egd.delta,
        latest_change = egd.delta
    from elo_game_delta egd
    where ew.id = egd.id;
  end loop;

  return query
  select
    ew.id,
    ew.name,
    round(ew.rating)::integer,
    ew.played,
    ew.won,
    round(ew.won::numeric / nullif(ew.played, 0), 4),
    round(ew.win_margin_total / nullif(ew.win_margin_games, 0), 2),
    round(ew.latest_change, 2)
  from elo_work ew
  where ew.played > 0
  order by ew.rating desc, ew.won desc, ew.played desc, ew.name;
end;
$$;
revoke all on function public.get_elo_leaderboard() from public;
grant execute on function public.get_elo_leaderboard() to authenticated;
create table if not exists public.user_hidden_group_insight_players (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  canonical_player_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id, canonical_player_id)
);
alter table public.user_hidden_group_insight_players enable row level security;
create policy "users read their hidden insight players" on public.user_hidden_group_insight_players for select using (user_id = auth.uid());
create policy "users add their hidden insight players" on public.user_hidden_group_insight_players for insert with check (user_id = auth.uid());
create policy "users remove their hidden insight players" on public.user_hidden_group_insight_players for delete using (user_id = auth.uid());
