with expected_columns(table_name, column_name) as (
  values
    ('domain_text_aliases', 'normalized_alias_text'),
    ('game_log_ocr_attempts', 'game_log_import_id'),
    ('game_log_ocr_attempts', 'engine_name'),
    ('game_log_ocr_attempts', 'engine_version'),
    ('game_log_ocr_attempts', 'preprocessing_variant'),
    ('game_log_ocr_attempts', 'region_type'),
    ('game_log_ocr_attempts', 'raw_ocr_text'),
    ('game_log_ocr_attempts', 'mean_confidence'),
    ('game_log_ocr_attempts', 'metadata'),
    ('game_log_ocr_corrections', 'game_log_import_id'),
    ('game_log_ocr_corrections', 'ocr_attempt_id'),
    ('game_log_ocr_corrections', 'event_order'),
    ('game_log_ocr_corrections', 'original_ocr_text'),
    ('game_log_ocr_corrections', 'normalized_ocr_text'),
    ('game_log_ocr_corrections', 'correction_method'),
    ('game_log_ocr_corrections', 'decision'),
    ('game_log_ocr_corrections', 'suggestions')
),
expected_policies(table_name, policy_name, command_name) as (
  values
    ('domain_text_aliases', 'domain_text_aliases_read_authenticated', 'SELECT'),
    ('game_log_ocr_attempts', 'game_log_ocr_attempts_game_access', 'ALL'),
    ('game_log_ocr_corrections', 'game_log_ocr_corrections_game_access', 'ALL')
),
forbidden_policies(table_name, policy_name) as (
  values
    ('domain_text_aliases', 'members can read domain aliases'),
    ('game_log_ocr_attempts', 'users can read editable import OCR attempts'),
    ('game_log_ocr_corrections', 'users can read editable import OCR corrections')
),
expected_functions(function_name, identity_arguments, security_definer) as (
  values
    ('normalize_ocr_domain_text', 'p_value text', false),
    ('get_ocr_domain_dictionary', 'p_game_log_import_id uuid', true),
    (
      'confirm_game_log_ocr_correction',
      'p_correction_id uuid, p_canonical_entity_id uuid, p_canonical_text text, p_save_alias boolean',
      true
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
      'normalize_ocr_domain_text',
      'get_ocr_domain_dictionary',
      'confirm_game_log_ocr_correction'
    )
)
select 'missing_column' as check_name, expected_columns.table_name || '.' || expected_columns.column_name as object_name
from expected_columns
left join information_schema.columns
  on columns.table_schema = 'public'
 and columns.table_name = expected_columns.table_name
 and columns.column_name = expected_columns.column_name
where columns.column_name is null

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
where pg_policies.cmd <> expected_policies.command_name

union all

select 'legacy_policy_present' as check_name, forbidden_policies.table_name || '.' || forbidden_policies.policy_name as object_name
from forbidden_policies
join pg_policies
  on pg_policies.schemaname = 'public'
 and pg_policies.tablename = forbidden_policies.table_name
 and pg_policies.policyname = forbidden_policies.policy_name

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

select 'missing_confirm_alias_write' as check_name, 'confirm_game_log_ocr_correction' as object_name
from actual_functions
where function_name = 'confirm_game_log_ocr_correction'
  and identity_arguments = 'p_correction_id uuid, p_canonical_entity_id uuid, p_canonical_text text, p_save_alias boolean'
  and function_definition not like '%public.domain_text_aliases%'

union all

select 'confirm_public_execute_enabled' as check_name, 'confirm_game_log_ocr_correction' as object_name
from actual_functions
where function_name = 'confirm_game_log_ocr_correction'
  and identity_arguments = 'p_correction_id uuid, p_canonical_entity_id uuid, p_canonical_text text, p_save_alias boolean'
  and exists (
    select 1
    from information_schema.routine_privileges rp
    where rp.routine_schema = 'public'
      and rp.routine_name = 'confirm_game_log_ocr_correction'
      and rp.grantee = 'PUBLIC'
      and rp.privilege_type = 'EXECUTE'
  )

union all

select 'confirm_authenticated_execute_missing' as check_name, 'confirm_game_log_ocr_correction' as object_name
from actual_functions
where function_name = 'confirm_game_log_ocr_correction'
  and identity_arguments = 'p_correction_id uuid, p_canonical_entity_id uuid, p_canonical_text text, p_save_alias boolean'
  and not has_function_privilege('authenticated', oid, 'EXECUTE')
order by check_name, object_name;
