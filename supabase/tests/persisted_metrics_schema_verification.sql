with expected_tables(table_name) as (
  values
    ('game_player_metric_snapshots'),
    ('game_player_tag_metric_snapshots'),
    ('game_milestone_metric_snapshots'),
    ('game_award_metric_snapshots'),
    ('player_metric_summaries'),
    ('player_map_metric_summaries'),
    ('global_corporation_metric_summaries'),
    ('global_style_metric_summaries'),
    ('global_tag_metric_summaries'),
    ('global_map_metric_summaries'),
    ('global_milestone_metric_summaries'),
    ('global_award_metric_summaries'),
    ('global_player_count_metric_summaries'),
    ('global_generation_metric_summaries')
),
expected_functions(function_name) as (
  values
    ('refresh_game_metric_snapshots'),
    ('refresh_all_metric_snapshots')
)
select 'missing_table' as check_name, expected_tables.table_name as object_name
from expected_tables
left join information_schema.tables
  on tables.table_schema = 'public'
 and tables.table_name = expected_tables.table_name
where tables.table_name is null

union all

select 'missing_function' as check_name, expected_functions.function_name as object_name
from expected_functions
left join information_schema.routines
  on routines.specific_schema = 'public'
 and routines.routine_name = expected_functions.function_name
where routines.routine_name is null

union all

select 'missing_rls' as check_name, expected_tables.table_name as object_name
from expected_tables
join pg_class on pg_class.relname = expected_tables.table_name
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and pg_class.relrowsecurity = false
order by check_name, object_name;
