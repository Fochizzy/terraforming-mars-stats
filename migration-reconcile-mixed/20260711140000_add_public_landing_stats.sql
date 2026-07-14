-- Public, aggregate-only statistics for the signed-out landing page.
--
-- The homepage highlight chips expand to show live global numbers, so this
-- function must be callable by the `anon` role. It is intentionally limited to
-- coarse aggregates (counts, averages, and game-content names such as
-- corporations and cards). It never exposes individual player or group names,
-- so no personal data leaks to unauthenticated visitors. `security definer`
-- lets it read past row-level security while staying read-only.
create or replace function public.get_public_landing_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with finished_games as (
  select g.* from games g where g.status is distinct from 'draft'
),
finished_players as (
  select gp.*
  from game_players gp
  join finished_games g on g.id = gp.game_id
),
corp_entries as (
  select cs.corporation_id, pr.is_winner
  from finished_players pr
  join lateral (
    select gpc.corporation_id
    from game_player_corporations gpc
    where gpc.game_player_id = pr.id

    union all

    select pr.corporation_id
    where pr.corporation_id is not null
      and not exists (
        select 1
        from game_player_corporations gpc
        where gpc.game_player_id = pr.id
      )
  ) cs on true
),
corp_stats as (
  select
    c.name,
    count(*) as plays,
    round(avg(case when ce.is_winner then 1 else 0 end)::numeric, 3) as win_rate
  from corp_entries ce
  join corporations c on c.id = ce.corporation_id
  group by c.name
),
card_plays as (
  select distinct fp.id as game_player_id, fp.is_winner, f.card_id
  from finished_players fp
  join analytics.game_log_event_facts f
    on f.game_id = fp.game_id
   and f.player_id = fp.player_id
  where f.event_type = 'card_played' and f.card_id is not null
),
card_stats as (
  select
    c.card_name,
    count(*) as plays,
    round(avg(case when cp.is_winner then 1 else 0 end)::numeric, 3) as win_rate
  from card_plays cp
  join cards c on c.id = cp.card_id
  group by c.card_name
),
player_win_rates as (
  select
    fp.player_id,
    count(*) as games,
    avg(case when fp.is_winner then 1 else 0 end)::numeric as win_rate
  from finished_players fp
  group by fp.player_id
),
totals as (
  select
    (select count(*) from finished_games) as finished_games,
    (select count(*) from games where status = 'draft') as draft_games,
    (select count(*) from players) as total_players,
    (select count(*) from groups) as total_groups,
    (select count(distinct map_id) from finished_games where map_id is not null) as maps_played,
    (
      select count(distinct gli.game_id)
      from game_log_imports gli
      join finished_games g on g.id = gli.game_id
    ) as imported_games,
    (select count(*) from corp_stats) as distinct_corporations,
    (select count(*) from card_stats) as distinct_cards,
    (
      select round((count(*) filter (where gm.winner_game_player_id is not null))::numeric
        / nullif((select count(*) from finished_games), 0), 2)
      from game_milestones gm
      join finished_games g on g.id = gm.game_id
    ) as avg_milestones_per_game,
    (
      select round((count(*) filter (where ga.place = 1 and ga.winner_game_player_id is not null))::numeric
        / nullif((select count(*) from finished_games), 0), 2)
      from game_awards ga
      join finished_games g on g.id = ga.game_id
    ) as avg_awards_per_game,
    (select round(avg(total_points)::numeric, 1) from finished_players where is_winner) as avg_winning_score,
    (select max(total_points) from finished_players) as highest_score,
    (select round(avg(generation_count)::numeric, 1) from finished_games where generation_count is not null) as avg_generations,
    (select round((max(win_rate) * 100)::numeric, 0) from player_win_rates where games >= 3) as top_player_win_rate
)
select jsonb_build_object(
  'finishedGames', (select finished_games from totals),
  'draftGames', (select draft_games from totals),
  'totalPlayers', (select total_players from totals),
  'totalGroups', (select total_groups from totals),
  'mapsPlayed', (select maps_played from totals),
  'importedGames', (select imported_games from totals),
  'distinctCorporations', (select distinct_corporations from totals),
  'distinctCards', (select distinct_cards from totals),
  'avgMilestonesPerGame', (select avg_milestones_per_game from totals),
  'avgAwardsPerGame', (select avg_awards_per_game from totals),
  'avgWinningScore', (select avg_winning_score from totals),
  'highestScore', (select highest_score from totals),
  'avgGenerations', (select avg_generations from totals),
  'topPlayerWinRate', (select top_player_win_rate from totals),
  'mostPlayedCorp', (
    select to_jsonb(x) from (
      select name, plays from corp_stats order by plays desc, name limit 1
    ) x
  ),
  'topCorpWinRate', (
    select to_jsonb(x) from (
      select name, win_rate as "winRate", plays from corp_stats
      where plays >= 3 order by win_rate desc, plays desc, name limit 1
    ) x
  ),
  'mostPlayedCard', (
    select to_jsonb(x) from (
      select card_name as name, plays from card_stats order by plays desc, card_name limit 1
    ) x
  ),
  'topCardWinRate', (
    select to_jsonb(x) from (
      select card_name as name, win_rate as "winRate", plays from card_stats
      where plays >= 3 order by win_rate desc, plays desc, card_name limit 1
    ) x
  )
);
$$;

revoke all on function public.get_public_landing_stats() from public;
grant execute on function public.get_public_landing_stats() to anon, authenticated;
