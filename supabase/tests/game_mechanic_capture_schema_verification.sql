-- Read-only schema/integrity checks for the Venus Next and Colonies capture release.
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'game_expansion_facts'
  and column_name in (
    'source_game_log_import_id',
    'venus_next_state',
    'colonies_state',
    'detection_provenance',
    'parser_version',
    'source_coverage',
    'final_venus_scale',
    'venus_event_count',
    'colony_built_count',
    'colony_trade_count'
  )
order by column_name;

select conname
from pg_constraint
where conrelid in ('public.game_venus_events'::regclass, 'public.game_colony_events'::regclass)
order by conname;

select p.proname, pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'replace_game_mechanic_capture';

select
  (select count(*) from public.game_venus_events where btrim(raw_evidence) = '') as blank_venus_event_rows,
  (select count(*) from public.game_colony_events where btrim(raw_evidence) = '') as blank_colony_event_rows,
  (select count(*) from public.game_venus_events v left join public.games g on g.id = v.game_id where g.id is null) as orphaned_venus_events,
  (select count(*) from public.game_colony_events c left join public.games g on g.id = c.game_id where g.id is null) as orphaned_colony_events;