with expected_tables(table_name) as (
  values
    ('game_player_metric_snapshots'),
    ('game_log_tag_summaries'),
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
expected_columns(table_name, column_name) as (
  values
    ('game_player_metric_snapshots', 'game_id'),
    ('game_player_metric_snapshots', 'game_player_id'),
    ('game_player_metric_snapshots', 'group_id'),
    ('game_player_metric_snapshots', 'player_id'),
    ('game_player_metric_snapshots', 'map_id'),
    ('game_player_metric_snapshots', 'corporation_id'),
    ('game_player_metric_snapshots', 'points_per_generation'),
    ('game_player_metric_snapshots', 'normalized_efficiency'),
    ('game_player_metric_snapshots', 'score_delta_vs_expected'),
    ('game_player_metric_snapshots', 'card_points_per_played_card'),
    ('game_player_metric_snapshots', 'tr_score_share'),
    ('game_player_metric_snapshots', 'card_score_share'),
    ('game_player_metric_snapshots', 'win_margin_points'),
    ('game_player_metric_snapshots', 'loss_gap_points'),
    ('game_log_tag_summaries', 'game_log_import_id'),
    ('game_log_tag_summaries', 'game_player_id'),
    ('game_log_tag_summaries', 'player_name'),
    ('game_log_tag_summaries', 'normalized_player_name'),
    ('game_log_tag_summaries', 'tag_code'),
    ('game_log_tag_summaries', 'tag_count'),
    ('game_log_tag_summaries', 'played_card_count'),
    ('game_log_tag_summaries', 'matched_card_count'),
    ('game_log_tag_summaries', 'unresolved_card_count'),
    ('game_log_tag_summaries', 'total_tag_count'),
    ('game_log_tag_summaries', 'tag_evidence_coverage'),
    ('game_player_tag_metric_snapshots', 'game_id'),
    ('game_player_tag_metric_snapshots', 'game_player_id'),
    ('game_player_tag_metric_snapshots', 'group_id'),
    ('game_player_tag_metric_snapshots', 'player_id'),
    ('game_player_tag_metric_snapshots', 'map_id'),
    ('game_player_tag_metric_snapshots', 'tag_code'),
    ('game_player_tag_metric_snapshots', 'tag_share'),
    ('game_player_tag_metric_snapshots', 'tag_evidence_coverage'),
    ('game_milestone_metric_snapshots', 'game_id'),
    ('game_milestone_metric_snapshots', 'game_milestone_id'),
    ('game_milestone_metric_snapshots', 'group_id'),
    ('game_milestone_metric_snapshots', 'map_id'),
    ('game_milestone_metric_snapshots', 'milestone_id'),
    ('game_milestone_metric_snapshots', 'winner_game_player_id'),
    ('game_milestone_metric_snapshots', 'winner_player_id'),
    ('game_milestone_metric_snapshots', 'claimed_generation_number'),
    ('game_milestone_metric_snapshots', 'claimed_timing_bucket'),
    ('game_award_metric_snapshots', 'game_id'),
    ('game_award_metric_snapshots', 'game_award_id'),
    ('game_award_metric_snapshots', 'group_id'),
    ('game_award_metric_snapshots', 'map_id'),
    ('game_award_metric_snapshots', 'award_id'),
    ('game_award_metric_snapshots', 'place'),
    ('game_award_metric_snapshots', 'funded_by_game_player_id'),
    ('game_award_metric_snapshots', 'funder_player_id'),
    ('game_award_metric_snapshots', 'winner_game_player_id'),
    ('game_award_metric_snapshots', 'winner_player_id'),
    ('game_award_metric_snapshots', 'funder_award_roi'),
    ('game_award_metric_snapshots', 'funded_generation_number'),
    ('player_metric_summaries', 'group_id'),
    ('player_metric_summaries', 'player_id'),
    ('player_metric_summaries', 'games_played'),
    ('player_metric_summaries', 'wins'),
    ('player_metric_summaries', 'win_rate'),
    ('player_metric_summaries', 'average_points_per_generation'),
    ('player_metric_summaries', 'average_normalized_efficiency'),
    ('player_metric_summaries', 'average_score_delta_vs_expected'),
    ('player_metric_summaries', 'best_score_source'),
    ('player_metric_summaries', 'best_tag_lane'),
    ('player_metric_summaries', 'tag_evidence_coverage'),
    ('player_metric_summaries', 'average_award_roi'),
    ('player_map_metric_summaries', 'group_id'),
    ('player_map_metric_summaries', 'player_id'),
    ('player_map_metric_summaries', 'map_id'),
    ('player_map_metric_summaries', 'games_played'),
    ('player_map_metric_summaries', 'win_rate'),
    ('player_map_metric_summaries', 'average_points'),
    ('player_map_metric_summaries', 'average_points_per_generation'),
    ('player_map_metric_summaries', 'map_rank_for_player'),
    ('global_map_metric_summaries', 'map_id'),
    ('global_map_metric_summaries', 'player_count'),
    ('global_map_metric_summaries', 'games_played'),
    ('global_map_metric_summaries', 'average_points_per_generation'),
    ('global_map_metric_summaries', 'expected_score_baseline'),
    ('global_corporation_metric_summaries', 'corporation_id'),
    ('global_corporation_metric_summaries', 'map_id'),
    ('global_corporation_metric_summaries', 'player_count'),
    ('global_corporation_metric_summaries', 'win_rate'),
    ('global_style_metric_summaries', 'style_code'),
    ('global_style_metric_summaries', 'map_id'),
    ('global_style_metric_summaries', 'player_count'),
    ('global_style_metric_summaries', 'win_rate'),
    ('global_tag_metric_summaries', 'tag_code'),
    ('global_tag_metric_summaries', 'map_id'),
    ('global_tag_metric_summaries', 'player_count'),
    ('global_tag_metric_summaries', 'average_tag_count'),
    ('global_milestone_metric_summaries', 'milestone_id'),
    ('global_milestone_metric_summaries', 'map_id'),
    ('global_milestone_metric_summaries', 'player_count'),
    ('global_milestone_metric_summaries', 'milestone_winner_win_rate'),
    ('global_award_metric_summaries', 'award_id'),
    ('global_award_metric_summaries', 'map_id'),
    ('global_award_metric_summaries', 'player_count'),
    ('global_award_metric_summaries', 'funder_success_rate'),
    ('global_award_metric_summaries', 'average_award_roi'),
    ('global_player_count_metric_summaries', 'player_count'),
    ('global_player_count_metric_summaries', 'expected_score_baseline'),
    ('global_generation_metric_summaries', 'generation_count'),
    ('global_generation_metric_summaries', 'expected_score_baseline')
),
expected_numeric_columns(table_name, column_name) as (
  values
    ('game_log_tag_summaries', 'tag_evidence_coverage'),
    ('game_player_metric_snapshots', 'points_per_generation'),
    ('game_player_metric_snapshots', 'normalized_efficiency'),
    ('game_player_metric_snapshots', 'expected_score'),
    ('game_player_metric_snapshots', 'score_delta_vs_expected'),
    ('game_player_metric_snapshots', 'card_points_per_played_card'),
    ('game_player_metric_snapshots', 'tr_score_share'),
    ('game_player_metric_snapshots', 'card_score_share'),
    ('game_player_tag_metric_snapshots', 'tag_share'),
    ('game_player_tag_metric_snapshots', 'tag_evidence_coverage'),
    ('game_milestone_metric_snapshots', 'winner_points_per_generation'),
    ('game_award_metric_snapshots', 'winner_points_per_generation'),
    ('player_metric_summaries', 'win_rate'),
    ('player_metric_summaries', 'average_points_per_generation'),
    ('player_metric_summaries', 'average_normalized_efficiency'),
    ('player_metric_summaries', 'average_score_delta_vs_expected'),
    ('player_metric_summaries', 'tag_evidence_coverage'),
    ('player_metric_summaries', 'average_award_roi'),
    ('player_map_metric_summaries', 'win_rate'),
    ('player_map_metric_summaries', 'average_points'),
    ('player_map_metric_summaries', 'average_points_per_generation'),
    ('global_map_metric_summaries', 'average_points_per_generation'),
    ('global_map_metric_summaries', 'expected_score_baseline'),
    ('global_corporation_metric_summaries', 'win_rate'),
    ('global_style_metric_summaries', 'win_rate'),
    ('global_tag_metric_summaries', 'win_rate'),
    ('global_tag_metric_summaries', 'average_tag_count'),
    ('global_milestone_metric_summaries', 'milestone_winner_win_rate'),
    ('global_award_metric_summaries', 'funder_success_rate'),
    ('global_award_metric_summaries', 'average_award_roi'),
    ('global_player_count_metric_summaries', 'expected_score_baseline'),
    ('global_generation_metric_summaries', 'expected_score_baseline')
),
expected_indexes(index_name, table_name, required_fragment) as (
  values
    ('game_log_tag_summaries_import_player_idx', 'game_log_tag_summaries', '(game_log_import_id, normalized_player_name)'),
    ('game_log_tag_summaries_game_player_idx', 'game_log_tag_summaries', '(game_player_id)'),
    ('game_player_metric_snapshots_group_player_idx', 'game_player_metric_snapshots', '(group_id, player_id)'),
    ('game_player_metric_snapshots_map_idx', 'game_player_metric_snapshots', '(map_id, player_count, generation_count)'),
    ('game_player_tag_metric_snapshots_group_tag_idx', 'game_player_tag_metric_snapshots', '(group_id, tag_code)'),
    ('player_map_metric_summaries_group_player_idx', 'player_map_metric_summaries', '(group_id, player_id)'),
    ('global_corporation_metric_summaries_unique', 'global_corporation_metric_summaries', 'coalesce(map_id, ''00000000-0000-0000-0000-000000000000''::uuid)'),
    ('global_style_metric_summaries_unique', 'global_style_metric_summaries', 'coalesce(map_id, ''00000000-0000-0000-0000-000000000000''::uuid)'),
    ('global_tag_metric_summaries_unique', 'global_tag_metric_summaries', 'coalesce(map_id, ''00000000-0000-0000-0000-000000000000''::uuid)'),
    ('global_milestone_metric_summaries_unique', 'global_milestone_metric_summaries', 'coalesce(map_id, ''00000000-0000-0000-0000-000000000000''::uuid)'),
    ('global_award_metric_summaries_unique', 'global_award_metric_summaries', 'coalesce(map_id, ''00000000-0000-0000-0000-000000000000''::uuid)')
),
expected_policies(table_name, policy_name) as (
  values
    ('game_log_tag_summaries', 'members read game log tag summaries'),
    ('game_player_metric_snapshots', 'members read game player metric snapshots'),
    ('game_player_tag_metric_snapshots', 'members read tag metric snapshots'),
    ('game_milestone_metric_snapshots', 'members read milestone metric snapshots'),
    ('game_award_metric_snapshots', 'members read award metric snapshots'),
    ('player_metric_summaries', 'members read player metric summaries'),
    ('player_map_metric_summaries', 'members read player map metric summaries'),
    ('global_corporation_metric_summaries', 'authenticated users read global corporation metrics'),
    ('global_style_metric_summaries', 'authenticated users read global style metrics'),
    ('global_tag_metric_summaries', 'authenticated users read global tag metrics'),
    ('global_map_metric_summaries', 'authenticated users read global map metrics'),
    ('global_milestone_metric_summaries', 'authenticated users read global milestone metrics'),
    ('global_award_metric_summaries', 'authenticated users read global award metrics'),
    ('global_player_count_metric_summaries', 'authenticated users read global player count metrics'),
    ('global_generation_metric_summaries', 'authenticated users read global generation metrics')
),
expected_functions(
  function_name,
  identity_arguments,
  security_definer,
  authenticated_can_execute,
  anon_can_execute,
  public_can_execute,
  service_role_can_execute,
  required_body_fragment
) as (
  values
    (
      'metric_timing_bucket',
      'p_generation_number integer, p_generation_count integer',
      false,
      true,
      true,
      true,
      true,
      'then ''early'''
    ),
    (
      'metric_normalized_label',
      'p_label text',
      false,
      true,
      true,
      true,
      true,
      'regexp_replace'
    ),
    (
      'rebuild_metric_summaries',
      '',
      true,
      false,
      false,
      false,
      false,
      'global_analytics_enabled = true'
    ),
    (
      'refresh_game_metric_snapshots_internal',
      'p_game_id uuid, p_require_editor boolean',
      true,
      false,
      false,
      false,
      false,
      'public.game_log_tag_summaries'
    ),
    (
      'refresh_game_metric_snapshots',
      'p_game_id uuid',
      true,
      true,
      false,
      false,
      true,
      'public.can_edit_game(p_game_id)'
    ),
    (
      'refresh_all_metric_snapshots',
      '',
      true,
      false,
      false,
      false,
      true,
      null
    )
),
actual_functions as (
  select
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prosecdef as security_definer,
    pg_get_functiondef(p.oid) as function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'metric_timing_bucket',
      'metric_normalized_label',
      'rebuild_metric_summaries',
      'refresh_game_metric_snapshots_internal',
      'refresh_game_metric_snapshots',
      'refresh_all_metric_snapshots'
    )
),
required_function_fragments(function_name, identity_arguments, required_fragment) as (
  values
    (
      'refresh_game_metric_snapshots_internal',
      'p_game_id uuid, p_require_editor boolean',
      'coalesce(round(tag_counts.tag_count::numeric / nullif(player_tag_rollups.total_tag_count, 0), 4), 0)'
    )
),
forbidden_function_fragments(function_name, identity_arguments, forbidden_fragment) as (
  values
    (
      'refresh_game_metric_snapshots_internal',
      'p_game_id uuid, p_require_editor boolean',
      'sourceTags'
    ),
    (
      'rebuild_metric_summaries',
      '',
      'tags.player_count'
    )
)
select 'missing_table' as check_name, expected_tables.table_name as object_name
from expected_tables
left join information_schema.tables
  on tables.table_schema = 'public'
 and tables.table_name = expected_tables.table_name
where tables.table_name is null

union all

select 'missing_column' as check_name, expected_columns.table_name || '.' || expected_columns.column_name as object_name
from expected_columns
left join information_schema.columns
  on columns.table_schema = 'public'
 and columns.table_name = expected_columns.table_name
 and columns.column_name = expected_columns.column_name
where columns.column_name is null

union all

select 'mismatched_numeric_type' as check_name, expected_numeric_columns.table_name || '.' || expected_numeric_columns.column_name as object_name
from expected_numeric_columns
join information_schema.columns
  on columns.table_schema = 'public'
 and columns.table_name = expected_numeric_columns.table_name
 and columns.column_name = expected_numeric_columns.column_name
where columns.data_type <> 'numeric'
   or columns.numeric_precision <> 12
   or columns.numeric_scale <> 4

union all

select 'missing_index' as check_name, expected_indexes.index_name as object_name
from expected_indexes
left join pg_indexes
  on pg_indexes.schemaname = 'public'
 and pg_indexes.tablename = expected_indexes.table_name
 and pg_indexes.indexname = expected_indexes.index_name
where pg_indexes.indexname is null

union all

select 'mismatched_index_definition' as check_name, expected_indexes.index_name as object_name
from expected_indexes
join pg_indexes
  on pg_indexes.schemaname = 'public'
 and pg_indexes.tablename = expected_indexes.table_name
 and pg_indexes.indexname = expected_indexes.index_name
where lower(pg_indexes.indexdef) not like '%' || lower(expected_indexes.required_fragment) || '%'

union all

select 'missing_policy' as check_name, expected_policies.table_name || '.' || expected_policies.policy_name as object_name
from expected_policies
left join pg_policies
  on pg_policies.schemaname = 'public'
 and pg_policies.tablename = expected_policies.table_name
 and pg_policies.policyname = expected_policies.policy_name
where pg_policies.policyname is null

union all

select 'mismatched_policy_command' as check_name, expected_policies.table_name || '.' || expected_policies.policy_name as object_name
from expected_policies
join pg_policies
  on pg_policies.schemaname = 'public'
 and pg_policies.tablename = expected_policies.table_name
 and pg_policies.policyname = expected_policies.policy_name
where pg_policies.cmd <> 'SELECT'

union all

select 'unexpected_mutation_policy' as check_name, pg_policies.tablename || '.' || pg_policies.policyname as object_name
from pg_policies
join expected_tables on expected_tables.table_name = pg_policies.tablename
where pg_policies.schemaname = 'public'
  and pg_policies.cmd <> 'SELECT'
  and pg_policies.tablename <> 'game_log_tag_summaries'

union all

select 'missing_rls' as check_name, expected_tables.table_name as object_name
from expected_tables
join pg_class on pg_class.relname = expected_tables.table_name
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and pg_class.relrowsecurity = false

union all

select 'missing_function' as check_name, expected_functions.function_name as object_name
from expected_functions
left join actual_functions
  on actual_functions.function_name = expected_functions.function_name
 and actual_functions.identity_arguments = expected_functions.identity_arguments
where actual_functions.function_name is null

union all

select 'mismatched_function_security' as check_name, expected_functions.function_name as object_name
from expected_functions
join actual_functions
  on actual_functions.function_name = expected_functions.function_name
 and actual_functions.identity_arguments = expected_functions.identity_arguments
where actual_functions.security_definer <> expected_functions.security_definer

union all

select 'forbidden_function_fragment' as check_name, forbidden_function_fragments.function_name || ':' || forbidden_function_fragments.forbidden_fragment as object_name
from forbidden_function_fragments
join actual_functions
  on actual_functions.function_name = forbidden_function_fragments.function_name
 and actual_functions.identity_arguments = forbidden_function_fragments.identity_arguments
where actual_functions.function_definition like '%' || forbidden_function_fragments.forbidden_fragment || '%'

union all

select 'missing_function_gate' as check_name, expected_functions.function_name as object_name
from expected_functions
join actual_functions
  on actual_functions.function_name = expected_functions.function_name
 and actual_functions.identity_arguments = expected_functions.identity_arguments
where expected_functions.required_body_fragment is not null
  and actual_functions.function_definition not like '%' || expected_functions.required_body_fragment || '%'

union all

select 'missing_required_function_fragment' as check_name, required_function_fragments.function_name || ':' || required_function_fragments.required_fragment as object_name
from required_function_fragments
join actual_functions
  on actual_functions.function_name = required_function_fragments.function_name
 and actual_functions.identity_arguments = required_function_fragments.identity_arguments
where actual_functions.function_definition not like '%' || required_function_fragments.required_fragment || '%'

union all

select 'mismatched_authenticated_execute' as check_name, expected_functions.function_name as object_name
from expected_functions
join actual_functions
  on actual_functions.function_name = expected_functions.function_name
 and actual_functions.identity_arguments = expected_functions.identity_arguments
where has_function_privilege('authenticated', actual_functions.oid, 'EXECUTE') <> expected_functions.authenticated_can_execute

union all

select 'mismatched_anon_execute' as check_name, expected_functions.function_name as object_name
from expected_functions
join actual_functions
  on actual_functions.function_name = expected_functions.function_name
 and actual_functions.identity_arguments = expected_functions.identity_arguments
where has_function_privilege('anon', actual_functions.oid, 'EXECUTE') <> expected_functions.anon_can_execute

union all

select 'mismatched_public_execute' as check_name, expected_functions.function_name as object_name
from expected_functions
join actual_functions
  on actual_functions.function_name = expected_functions.function_name
 and actual_functions.identity_arguments = expected_functions.identity_arguments
where exists (
  select 1
  from information_schema.routine_privileges rp
  where rp.routine_schema = 'public'
    and rp.routine_name = expected_functions.function_name
    and rp.grantee = 'PUBLIC'
    and rp.privilege_type = 'EXECUTE'
) <> expected_functions.public_can_execute

union all

select 'mismatched_service_role_execute' as check_name, expected_functions.function_name as object_name
from expected_functions
join actual_functions
  on actual_functions.function_name = expected_functions.function_name
 and actual_functions.identity_arguments = expected_functions.identity_arguments
where has_function_privilege('service_role', actual_functions.oid, 'EXECUTE') <> expected_functions.service_role_can_execute
order by check_name, object_name;
