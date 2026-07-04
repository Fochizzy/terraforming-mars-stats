select table_schema, table_name
from information_schema.views
where table_schema = 'analytics'
order by table_name;

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
    'import_coverage',
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
