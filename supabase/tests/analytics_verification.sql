select table_schema, table_name
from information_schema.views
where table_schema = 'analytics'
order by table_name;

select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'game_player_metric_snapshots',
    'game_player_tag_metric_snapshots',
    'game_milestone_metric_snapshots',
    'game_award_metric_snapshots',
    'player_metric_summaries',
    'player_map_metric_summaries',
    'global_corporation_metric_summaries',
    'global_style_metric_summaries',
    'global_tag_metric_summaries',
    'global_map_metric_summaries',
    'global_milestone_metric_summaries',
    'global_award_metric_summaries',
    'global_player_count_metric_summaries',
    'global_generation_metric_summaries'
  )
order by table_name;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'game_player_metric_snapshots',
    'game_player_tag_metric_snapshots',
    'game_milestone_metric_snapshots',
    'game_award_metric_snapshots',
    'player_metric_summaries',
    'player_map_metric_summaries',
    'global_corporation_metric_summaries',
    'global_style_metric_summaries',
    'global_tag_metric_summaries',
    'global_map_metric_summaries',
    'global_milestone_metric_summaries',
    'global_award_metric_summaries',
    'global_player_count_metric_summaries',
    'global_generation_metric_summaries'
  )
order by table_name, ordinal_position;

select table_schema, table_name
from information_schema.views
where table_schema = 'analytics'
  and table_name like '%import%'
order by table_name;

select table_name, column_name
from information_schema.columns
where table_schema = 'analytics'
  and table_name in (
    'data_coverage',
    'group_leaderboard',
    'group_interactions',
    'group_score_source_averages',
    'group_style_performance',
    'head_to_head',
    'lineup_effects',
    'player_data_coverage',
    'player_game_results',
    'player_interactions',
    'player_score_source_averages',
    'player_style_performance',
    'player_trends',
    'style_agreement'
  )
order by table_name, ordinal_position;
