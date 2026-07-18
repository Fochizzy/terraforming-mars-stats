-- Read-only production monitor for data-capture-hardening-v2.
-- Safe to run against production (no writes). Uses the v2 release cutoff.
--
-- Required ongoing results for post-cutoff finalized games:
--   games_missing_source            = 0
--   games_missing_parser_version    = 0
--   games_null_venus_state          = 0
--   games_null_colonies_state       = 0
--   duplicate_canonical_events      = 0
--   orphaned_canonical_events       = 0
--   synthetic_blank_events          = 0
-- Unattributed events are expected and are counted explicitly, not as failures.

with cutoff as (
  select cutoff_at from public.game_mechanic_capture_deployments
  where deployment_key = 'data-capture-hardening-v2'
), post_cutoff as (
  select g.id as game_id
  from public.games g cross join cutoff c
  where g.status = 'finalized' and g.created_at >= c.cutoff_at
)
select metric, value from (
  select 'post_cutoff_finalized_games' as metric, count(*)::bigint as value from post_cutoff
  union all select 'games_source_retained',
    (select count(*) from post_cutoff p where exists (select 1 from public.game_capture_import_sources s where s.game_id = p.game_id))
  union all select 'games_missing_source',
    (select count(*) from post_cutoff p where not exists (select 1 from public.game_capture_import_sources s where s.game_id = p.game_id))
  union all select 'games_missing_parser_version',
    (select count(*) from post_cutoff p where not exists (select 1 from public.game_capture_parser_runs r where r.game_id = p.game_id))
  union all select 'games_null_venus_state',
    (select count(*) from post_cutoff p left join public.game_expansion_facts f on f.game_id = p.game_id where f.venus_next_state is null)
  union all select 'games_null_colonies_state',
    (select count(*) from post_cutoff p left join public.game_expansion_facts f on f.game_id = p.game_id where f.colonies_state is null)
  union all select 'games_null_map_state',
    (select count(*) from post_cutoff p where not exists (select 1 from public.game_capture_map_detections m where m.game_id = p.game_id))
  union all select 'games_with_unresolved_players',
    (select count(distinct e.game_id) from public.game_capture_events e join post_cutoff p on p.game_id = e.game_id where e.attribution_status = 'explicit_unresolved')
  union all select 'games_with_unresolved_board_spaces',
    (select count(distinct bp.game_id) from public.game_capture_board_placements bp join post_cutoff p on p.game_id = bp.game_id where bp.canonical_board_space_id is null)
  union all select 'games_with_unsupported_patterns',
    (select count(distinct u.game_id) from public.game_capture_unsupported_evidence u join post_cutoff p on p.game_id = u.game_id)
  union all select 'board_placements_captured',
    (select count(*) from public.game_capture_board_placements bp join post_cutoff p on p.game_id = bp.game_id)
  union all select 'placements_without_stable_player',
    (select count(*) from public.game_capture_board_placements bp join post_cutoff p on p.game_id = bp.game_id where bp.attribution_status <> 'explicit_stable')
  union all select 'venus_events_captured',
    (select count(*) from public.game_capture_events e join post_cutoff p on p.game_id = e.game_id where e.event_category = 'venus')
  union all select 'colony_construction_events',
    (select count(*) from public.game_capture_events e join post_cutoff p on p.game_id = e.game_id where e.event_type = 'built_colony')
  union all select 'colony_trade_events',
    (select count(*) from public.game_capture_events e join post_cutoff p on p.game_id = e.game_id where e.event_type = 'traded_with_colony')
  union all select 'global_parameter_events',
    (select count(*) from public.game_capture_events e join post_cutoff p on p.game_id = e.game_id where e.event_category = 'global_parameter')
  union all select 'objective_events',
    (select count(*) from public.game_capture_events e join post_cutoff p on p.game_id = e.game_id where e.event_category in ('milestone', 'award'))
  union all select 'unattributed_events',
    (select count(*) from public.game_capture_events e join post_cutoff p on p.game_id = e.game_id where e.attribution_status = 'unattributed')
  union all select 'duplicate_canonical_events',
    (select coalesce(sum(c - 1), 0) from (select count(*) c from public.game_capture_events group by game_id, event_uid having count(*) > 1) d)
  union all select 'orphaned_canonical_events',
    (select count(*) from public.game_capture_events e left join public.games g on g.id = e.game_id where g.id is null)
  union all select 'synthetic_blank_events',
    (select count(*) from public.game_capture_events where btrim(event_uid) = '' or btrim(source_text) = '')
  union all select 'parser_failures',
    (select count(*) from public.game_capture_parser_runs r join post_cutoff p on p.game_id = r.game_id where r.coverage_state = 'parser_failure')
) metrics
order by metric;
