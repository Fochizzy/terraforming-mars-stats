select
  'game_player_snapshot_counts' as check_name,
  gps.game_id,
  count(*)::integer as player_snapshot_count,
  round(avg(gps.points_per_generation), 4) as average_points_per_generation
from public.game_player_metric_snapshots gps
group by gps.game_id
order by gps.game_id;

select
  'player_metric_summaries' as check_name,
  pms.group_id,
  pms.player_id,
  p.display_name as player_name,
  pms.games_played,
  pms.wins,
  pms.win_rate,
  pms.average_points_per_generation,
  pms.best_score_source,
  pms.best_tag_lane,
  pms.average_award_roi
from public.player_metric_summaries pms
join public.players p on p.id = pms.player_id
order by pms.group_id, p.display_name;

select
  'global_map_metric_summaries' as check_name,
  gmms.map_id,
  m.name as map_name,
  gmms.player_count,
  gmms.games_played,
  gmms.average_points_per_generation,
  gmms.expected_score_baseline,
  gmms.highest_win_rate_corporation_id,
  gmms.highest_efficiency_style_code,
  gmms.best_tag_lane
from public.global_map_metric_summaries gmms
join public.maps m on m.id = gmms.map_id
order by m.name, gmms.player_count;
