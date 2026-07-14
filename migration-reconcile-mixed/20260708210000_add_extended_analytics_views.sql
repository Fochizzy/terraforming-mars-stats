-- Extended analytics: placement spread, table-size and game-length splits,
-- map performance, milestone/award economics, log-derived pace, tile
-- placements, and tag outcomes.

create or replace view analytics.player_placement_distribution
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  pgr.placement,
  count(*)::int as games_played
from analytics.player_game_results pgr
group by pgr.group_id, pgr.player_id, pgr.player_name, pgr.placement;

create or replace view analytics.player_count_performance
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  pgr.player_count,
  count(*)::int as games_played,
  (count(*) filter (where pgr.is_winner))::int as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score
from analytics.player_game_results pgr
group by pgr.group_id, pgr.player_id, pgr.player_name, pgr.player_count;

create or replace view analytics.group_generation_distribution
with (security_invoker = true) as
select
  g.group_id,
  g.generation_count,
  count(*)::int as games_played
from public.games g
where g.status = 'finalized'
group by g.group_id, g.generation_count;

create or replace view analytics.player_game_length_performance
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  case
    when pgr.generation_count <= 9 then 'short'
    when pgr.generation_count <= 11 then 'standard'
    else 'long'
  end as length_bucket,
  count(*)::int as games_played,
  (count(*) filter (where pgr.is_winner))::int as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(
    avg(pgr.total_points::numeric / nullif(pgr.generation_count, 0)),
    3
  ) as average_points_per_generation
from analytics.player_game_results pgr
group by
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  case
    when pgr.generation_count <= 9 then 'short'
    when pgr.generation_count <= 11 then 'standard'
    else 'long'
  end;

create or replace view analytics.group_map_performance
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.map_id,
  coalesce(m.name, 'Unknown Map') as map_name,
  count(distinct pgr.game_id)::int as games_played,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(avg(pgr.generation_count::numeric), 3) as average_generation_count
from analytics.player_game_results pgr
left join public.maps m on m.id = pgr.map_id
group by pgr.group_id, pgr.map_id, m.name;

create or replace view analytics.player_map_performance
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  pgr.map_id,
  coalesce(m.name, 'Unknown Map') as map_name,
  count(*)::int as games_played,
  (count(*) filter (where pgr.is_winner))::int as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score
from analytics.player_game_results pgr
left join public.maps m on m.id = pgr.map_id
group by pgr.group_id, pgr.player_id, pgr.player_name, pgr.map_id, m.name;

create or replace view analytics.group_milestone_economics
with (security_invoker = true) as
select
  g.group_id,
  ms.id as milestone_id,
  ms.name as milestone_name,
  count(*)::int as claims,
  (count(*) filter (where gp.is_winner))::int as claimer_wins,
  round((count(*) filter (where gp.is_winner))::numeric / count(*), 4) as claimer_win_rate,
  round(avg(gp.placement::numeric), 3) as average_claimer_placement,
  round(count(*)::numeric / nullif(group_games.finalized_games, 0), 4) as claim_rate
from public.game_milestones gm
join public.games g on g.id = gm.game_id and g.status = 'finalized'
join public.milestones ms on ms.id = gm.milestone_id
join public.game_players gp on gp.id = gm.winner_game_player_id
left join lateral (
  select count(*)::int as finalized_games
  from public.games g_all
  where g_all.group_id = g.group_id
    and g_all.status = 'finalized'
) group_games on true
group by g.group_id, ms.id, ms.name, group_games.finalized_games;

create or replace view analytics.player_milestone_claims
with (security_invoker = true) as
select
  g.group_id,
  p.id as player_id,
  p.display_name as player_name,
  ms.id as milestone_id,
  ms.name as milestone_name,
  count(*)::int as claims,
  (count(*) filter (where gp.is_winner))::int as claimer_wins
from public.game_milestones gm
join public.games g on g.id = gm.game_id and g.status = 'finalized'
join public.milestones ms on ms.id = gm.milestone_id
join public.game_players gp on gp.id = gm.winner_game_player_id
join public.players p on p.id = gp.player_id
group by g.group_id, p.id, p.display_name, ms.id, ms.name;

create or replace view analytics.group_award_outcomes
with (security_invoker = true) as
select
  g.group_id,
  a.id as award_id,
  a.name as award_name,
  count(*)::int as funded_count,
  (count(*) filter (
    where ga.winner_game_player_id = ga.funded_by_game_player_id
  ))::int as funder_won_count,
  (count(*) filter (
    where ga.winner_game_player_id <> ga.funded_by_game_player_id
  ))::int as sniped_count,
  round(
    (count(*) filter (
      where ga.winner_game_player_id = ga.funded_by_game_player_id
    ))::numeric / count(*),
    4
  ) as funder_won_rate
from public.game_awards ga
join public.games g on g.id = ga.game_id and g.status = 'finalized'
join public.awards a on a.id = ga.award_id
where ga.place = 1
group by g.group_id, a.id, a.name;

create or replace view analytics.award_funder_winner_matrix
with (security_invoker = true) as
select
  g.group_id,
  funder.id as funder_player_id,
  funder.display_name as funder_player_name,
  winner.id as winner_player_id,
  winner.display_name as winner_player_name,
  count(*)::int as first_place_awards
from public.game_awards ga
join public.games g on g.id = ga.game_id and g.status = 'finalized'
join public.game_players funder_gp on funder_gp.id = ga.funded_by_game_player_id
join public.players funder on funder.id = funder_gp.player_id
join public.game_players winner_gp on winner_gp.id = ga.winner_game_player_id
join public.players winner on winner.id = winner_gp.player_id
where ga.place = 1
group by g.group_id, funder.id, funder.display_name, winner.id, winner.display_name;

-- Log events carry the acting player only as a raw alias inside payload and
-- carry the generation only on generation_started marker rows, so this view
-- resolves both before the pace/tile views aggregate.
create or replace view analytics.game_log_event_facts
with (security_invoker = true) as
select
  g.group_id,
  g.id as game_id,
  g.played_on,
  g.map_id,
  e.event_type,
  e.tile_type,
  e.board_space,
  e.card_id,
  coalesce(
    max(e.generation_number) over (
      partition by e.game_log_import_id
      order by e.event_order
      rows between unbounded preceding and current row
    ),
    1
  ) as generation_number,
  resolved.player_id,
  resolved.player_name
from public.game_log_events e
join public.game_log_imports gli on gli.id = e.game_log_import_id
join public.games g on g.id = gli.game_id and g.status = 'finalized'
left join lateral (
  select candidates.player_id, candidates.player_name
  from (
    select p.id as player_id, p.display_name as player_name, 1 as preference
    from public.players p
    where p.group_id = g.group_id
      and p.normalized_display_name = btrim(
        regexp_replace(lower(coalesce(e.payload->>'actor', '')), '[^a-z0-9]+', ' ', 'g')
      )
    union all
    select alias_player.id, alias_player.display_name, 2 as preference
    from public.player_import_aliases pia
    join public.players alias_player on alias_player.id = pia.player_id
    where pia.group_id = g.group_id
      and pia.source_type = 'game_log'
      and pia.normalized_alias = btrim(
        regexp_replace(lower(coalesce(e.payload->>'actor', '')), '[^a-z0-9]+', ' ', 'g')
      )
  ) candidates
  order by candidates.preference
  limit 1
) resolved on true;

create or replace view analytics.game_generation_pace
with (security_invoker = true) as
select
  f.group_id,
  f.game_id,
  f.played_on,
  f.player_id,
  f.player_name,
  f.generation_number,
  (count(*) filter (where f.event_type = 'card_played'))::int as cards_played,
  (count(*) filter (where f.event_type = 'tile_placed'))::int as tiles_placed,
  (count(*) filter (
    where f.event_type = 'tile_placed' and lower(f.tile_type) = 'greenery'
  ))::int as greeneries_placed,
  (count(*) filter (
    where f.event_type = 'tile_placed' and lower(f.tile_type) = 'city'
  ))::int as cities_placed,
  (count(*) filter (where f.event_type = 'milestone_claimed'))::int as milestones_claimed,
  (count(*) filter (where f.event_type = 'award_funded'))::int as awards_funded
from analytics.game_log_event_facts f
where f.player_id is not null
group by
  f.group_id,
  f.game_id,
  f.played_on,
  f.player_id,
  f.player_name,
  f.generation_number;

create or replace view analytics.game_tile_placements
with (security_invoker = true) as
select
  f.group_id,
  f.game_id,
  f.played_on,
  coalesce(m.name, 'Unknown Map') as map_name,
  f.player_id,
  f.player_name,
  f.board_space,
  lower(f.tile_type) as tile_type,
  count(*)::int as placements
from analytics.game_log_event_facts f
left join public.maps m on m.id = f.map_id
where f.event_type = 'tile_placed'
  and f.board_space is not null
  and f.tile_type is not null
group by
  f.group_id,
  f.game_id,
  f.played_on,
  m.name,
  f.player_id,
  f.player_name,
  f.board_space,
  lower(f.tile_type);

create or replace view analytics.player_tag_outcomes
with (security_invoker = true) as
select
  g.group_id,
  g.id as game_id,
  g.played_on,
  p.id as player_id,
  p.display_name as player_name,
  ts.tag_code,
  ts.tag_count,
  gp.total_points,
  gp.is_winner
from public.game_log_tag_summaries ts
join public.game_log_imports gli on gli.id = ts.game_log_import_id
join public.games g on g.id = gli.game_id and g.status = 'finalized'
join public.players p
  on p.group_id = g.group_id
 and p.normalized_display_name = ts.normalized_player_name
join public.game_players gp
  on gp.game_id = g.id
 and gp.player_id = p.id;

grant usage on schema analytics to authenticated;
grant select on all tables in schema analytics to authenticated;
