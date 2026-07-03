create schema if not exists analytics;

create view analytics.player_game_results
with (security_invoker = true) as
select
  g.group_id,
  g.player_count,
  g.id as game_id,
  p.id as player_id,
  p.display_name as player_name,
  gp.placement,
  gp.is_winner,
  gp.total_points,
  gp.final_megacredits,
  case
    when gp.placement = 1 then gp.total_points - coalesce((
      select gp2.total_points
      from public.game_players gp2
      where gp2.game_id = g.id
        and gp2.placement = 2
      order by gp2.total_points desc, gp2.final_megacredits desc
      limit 1
    ), gp.total_points)
    else coalesce((
      select gp2.total_points
      from public.game_players gp2
      where gp2.game_id = g.id
        and gp2.placement = gp.placement - 1
      order by gp2.total_points desc, gp2.final_megacredits desc
      limit 1
    ), gp.total_points) - gp.total_points
  end as differential_points
from public.games g
join public.game_players gp on gp.game_id = g.id
join public.players p on p.id = gp.player_id
where g.status = 'finalized'
;

create view analytics.group_leaderboard
with (security_invoker = true) as
select
  pgr.group_id,
  pgr.player_id,
  pgr.player_name,
  count(*) as games_played,
  count(*) filter (where pgr.is_winner) as wins,
  round((count(*) filter (where pgr.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(pgr.placement::numeric), 3) as average_placement,
  round(avg(pgr.total_points::numeric), 3) as average_score,
  round(
    avg(case when pgr.is_winner then pgr.differential_points::numeric else null end),
    3
  ) as average_win_margin,
  round(
    avg(case when not pgr.is_winner then pgr.differential_points::numeric else null end),
    3
  ) as average_loss_gap,
  round(
    (((count(*) filter (where pgr.is_winner))::numeric / count(*)) * 0.5) +
    ((1 - ((avg(pgr.placement::numeric) - 1) / greatest(max(pgr.player_count) - 1, 1))) * 0.3) +
    ((avg(pgr.differential_points::numeric) / 20.0) * 0.2),
    4
  ) as weighted_score
from analytics.player_game_results pgr
group by pgr.group_id, pgr.player_id, pgr.player_name;

create view analytics.head_to_head
with (security_invoker = true) as
select
  g.group_id,
  gp_left.player_id as left_player_id,
  gp_right.player_id as right_player_id,
  count(*) filter (where gp_left.placement < gp_right.placement) as left_wins,
  count(*) filter (where gp_right.placement < gp_left.placement) as right_wins,
  avg((gp_left.total_points - gp_right.total_points)::numeric) as average_score_differential
from public.games g
join public.game_players gp_left on gp_left.game_id = g.id
join public.game_players gp_right
  on gp_right.game_id = g.id
 and gp_left.player_id <> gp_right.player_id
where g.status = 'finalized'
group by g.group_id, gp_left.player_id, gp_right.player_id;

create view analytics.global_corporation_performance
with (security_invoker = true) as
select
  gp.corporation_id,
  count(*) as games_played,
  count(*) filter (where gp.is_winner) as wins,
  round((count(*) filter (where gp.is_winner))::numeric / count(*), 4) as win_rate,
  round(avg(gp.total_points::numeric), 3) as average_score
from public.games g
join public.group_settings gs on gs.group_id = g.group_id
join public.game_players gp on gp.game_id = g.id
where g.status = 'finalized'
  and gs.global_analytics_enabled = true
  and gp.corporation_id is not null
group by gp.corporation_id;

create view analytics.data_coverage
with (security_invoker = true) as
select
  g.group_id,
  count(*) as finalized_games,
  avg((gp.card_points_microbes is not null)::int::numeric) as microbe_coverage,
  avg((gp.card_points_animals is not null)::int::numeric) as animal_coverage,
  avg((gp.card_points_jovian is not null)::int::numeric) as jovian_coverage
from public.games g
join public.game_players gp on gp.game_id = g.id
where g.status = 'finalized'
group by g.group_id;
