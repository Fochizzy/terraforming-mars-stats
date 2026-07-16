-- Player-scoped map performance view: aggregates per-player, per-map stats from
-- the persisted metric snapshot table, enriched with map metadata and recent form.
-- Uses security_invoker so RLS on the underlying tables is respected.

create or replace view analytics.player_map_performance
with (security_invoker = true) as
with recent_results as (
  select
    gps.group_id,
    gps.player_id,
    gps.map_id,
    gps.is_winner,
    gps.total_points,
    g.played_on,
    row_number() over (
      partition by gps.group_id, gps.player_id, gps.map_id
      order by g.played_on desc, gps.game_id desc
    ) as recent_rank
  from public.game_player_metric_snapshots gps
  join public.games g on g.id = gps.game_id
  where gps.map_id is not null
),
recent_form as (
  select
    group_id,
    player_id,
    map_id,
    count(*) filter (where is_winner and recent_rank <= 5)::int as recent_wins_last_5,
    min(recent_rank) filter (where recent_rank <= 5)::int as has_recent_games
  from recent_results
  where recent_rank <= 5
  group by group_id, player_id, map_id
)
select
  pmm.group_id,
  pmm.player_id,
  pmm.map_id,
  m.code as map_code,
  m.name as map_name,
  pmm.games_played,
  pmm.wins,
  (pmm.games_played - pmm.wins)::int as losses,
  pmm.win_rate,
  pmm.average_points,
  pmm.average_generations,
  pmm.average_points_per_generation,
  pmm.average_normalized_efficiency,
  pmm.average_score_delta_vs_expected,
  pmm.best_score_source_on_map,
  pmm.best_tag_lane_on_map,
  pmm.map_rank_for_player,
  coalesce(
    (
      select max(gps2.total_points)
      from public.game_player_metric_snapshots gps2
      where gps2.group_id = pmm.group_id
        and gps2.player_id = pmm.player_id
        and gps2.map_id = pmm.map_id
    ),
    0
  )::int as highest_score,
  (
    select g2.played_on
    from public.game_player_metric_snapshots gps3
    join public.games g2 on g2.id = gps3.game_id
    where gps3.group_id = pmm.group_id
      and gps3.player_id = pmm.player_id
      and gps3.map_id = pmm.map_id
    order by g2.played_on desc, gps3.game_id desc
    limit 1
  ) as last_played_at,
  coalesce(rf.recent_wins_last_5, 0)::int as recent_wins_last_5,
  case
    when pmm.games_played >= 5 then true
    else false
  end as has_sufficient_recent_form
from public.player_map_metric_summaries pmm
join public.maps m on m.id = pmm.map_id
left join recent_form rf
  on rf.group_id = pmm.group_id
 and rf.player_id = pmm.player_id
 and rf.map_id = pmm.map_id;

grant select on analytics.player_map_performance to authenticated;
