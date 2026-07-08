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
  'canonical_tag_summaries' as check_name,
  gli.game_id,
  glts.game_player_id,
  glts.normalized_player_name,
  glts.tag_code,
  glts.tag_count,
  glts.played_card_count,
  glts.matched_card_count,
  glts.unresolved_card_count,
  glts.total_tag_count,
  glts.tag_evidence_coverage
from public.game_log_tag_summaries glts
join public.game_log_imports gli on gli.id = glts.game_log_import_id
order by gli.game_id, glts.normalized_player_name, glts.tag_code;

select
  'tag_snapshot_canonical_alignment' as check_name,
  gps.game_id,
  gpts.game_player_id,
  gpts.tag_code,
  gpts.tag_count as snapshot_tag_count,
  glts.tag_count as canonical_tag_count,
  gpts.played_card_count as snapshot_played_card_count,
  glts.played_card_count as canonical_played_card_count,
  gpts.tag_evidence_coverage as snapshot_coverage,
  glts.tag_evidence_coverage as canonical_coverage
from public.game_player_tag_metric_snapshots gpts
join public.game_player_metric_snapshots gps
  on gps.game_player_id = gpts.game_player_id
join public.game_log_imports gli
  on gli.game_id = gpts.game_id
join public.game_log_tag_summaries glts
  on glts.game_log_import_id = gli.id
 and glts.tag_code = gpts.tag_code
 and (
   glts.game_player_id = gpts.game_player_id
   or (
     glts.game_player_id is null
     and glts.normalized_player_name = public.metric_normalized_label((
       select p.display_name
       from public.players p
       where p.id = gpts.player_id
     ))
   )
 )
order by gps.game_id, gpts.game_player_id, gpts.tag_code;

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
