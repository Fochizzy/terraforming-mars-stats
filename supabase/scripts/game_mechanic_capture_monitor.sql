-- Run read-only against production after the schema and parser are deployed.
with deployment as (
  select cutoff_at
  from public.game_mechanic_capture_deployments
  where deployment_key = 'venus-colonies-capture-v1'
), post_cutoff_games as (
  select
    g.id,
    f.venus_next_state,
    f.colonies_state
  from public.games g
  cross join deployment d
  left join public.game_expansion_facts f on f.game_id = g.id
  where g.created_at >= d.cutoff_at
    and g.status = 'finalized'
), duplicate_venus as (
  select count(*)::integer as count
  from (
    select game_id, event_key
    from public.game_venus_events
    group by game_id, event_key
    having count(*) > 1
  ) duplicates
), duplicate_colony as (
  select count(*)::integer as count
  from (
    select game_id, event_key
    from public.game_colony_events
    group by game_id, event_key
    having count(*) > 1
  ) duplicates
)
select metric, value
from (
  select 'post_cutoff_finalized_games'::text as metric, count(*)::bigint as value from post_cutoff_games
  union all select 'venus_confirmed_present', count(*) from post_cutoff_games where venus_next_state = 'confirmed_present'
  union all select 'venus_confirmed_absent', count(*) from post_cutoff_games where venus_next_state = 'confirmed_absent'
  union all select 'venus_incomplete_or_unsupported', count(*) from post_cutoff_games where venus_next_state in ('incomplete_evidence', 'unsupported_log_pattern', 'conflicting_evidence')
  union all select 'colonies_confirmed_present', count(*) from post_cutoff_games where colonies_state = 'confirmed_present'
  union all select 'colonies_confirmed_absent', count(*) from post_cutoff_games where colonies_state = 'confirmed_absent'
  union all select 'colonies_incomplete_or_unsupported', count(*) from post_cutoff_games where colonies_state in ('incomplete_evidence', 'unsupported_log_pattern', 'conflicting_evidence')
  union all select 'venus_events_captured', count(*) from public.game_venus_events
  union all select 'colony_construction_events', count(*) from public.game_colony_events where event_type = 'built_colony'
  union all select 'colony_trade_events', count(*) from public.game_colony_events where event_type = 'traded_with_colony'
  union all select 'missing_expansion_facts_post_cutoff', count(*) from post_cutoff_games where venus_next_state is null or colonies_state is null
  union all select 'duplicate_venus_event_keys', count from duplicate_venus
  union all select 'duplicate_colony_event_keys', count from duplicate_colony
  union all select 'orphaned_venus_events', count(*) from public.game_venus_events e left join public.games g on g.id = e.game_id where g.id is null
  union all select 'orphaned_colony_events', count(*) from public.game_colony_events e left join public.games g on g.id = e.game_id where g.id is null
  union all select 'parser_failure_states', count(*) from post_cutoff_games where venus_next_state in ('incomplete_evidence', 'unsupported_log_pattern', 'conflicting_evidence') or colonies_state in ('incomplete_evidence', 'unsupported_log_pattern', 'conflicting_evidence')
) metrics
order by metric;