-- Live-capture v2 compatibility reconciliation (read-only, Workstream 9).
--
-- Reconciles the legacy import stores (game_log_imports / game_log_events /
-- game_expansion_facts) against the live-site data-capture v2 stores
-- (game_capture_*). Run read-only; it performs zero writes. Its results are
-- recorded as an immutable artifact under
-- docs/redesign/reports/phase-04-step-03-compat/ — regenerate by re-running
-- this script, never by editing the artifact.

with games_scope as (select id from public.games),
legacy as (select distinct game_id from public.game_log_imports),
v2_sources as (
  select game_id, source_sha256, game_log_import_id
  from public.game_capture_import_sources
),
v2_runs as (
  select game_id, parser_version, id from public.game_capture_parser_runs
),
v2_events as (select game_id, event_uid from public.game_capture_events),
v2_placements as (
  select game_id, placement_uid from public.game_capture_board_placements
)
select
  (select count(*) from games_scope) as total_games,
  (select count(*) from legacy) as games_with_legacy_import_data,
  (select count(*)
     from legacy l
     where not exists (select 1 from v2_runs r where r.game_id = l.game_id)
  ) as games_legacy_only,
  (select count(distinct game_id) from v2_sources) as games_with_v2_sources,
  (select count(distinct game_id) from v2_runs) as games_with_v2_parser_runs,
  (select count(distinct game_id) from v2_events) as games_with_v2_events,
  (select count(distinct game_id) from v2_placements) as games_with_v2_placements,
  (select count(*) from public.game_expansion_facts) as games_with_expansion_state,
  (select count(*)
     from games_scope g
     where not exists (
       select 1 from public.game_expansion_facts f where f.game_id = g.id
     )
  ) as games_missing_expansion_state,
  (select coalesce(string_agg(distinct parser_version, ',' order by parser_version), '')
     from v2_runs) as v2_parser_versions_observed,
  (select coalesce(string_agg(distinct parser_version, ',' order by parser_version), '')
     from public.game_log_imports) as legacy_parser_versions_observed,
  (select count(*)
     from v2_runs r
     where not exists (select 1 from v2_sources s where s.game_id = r.game_id)
  ) as v2_runs_missing_source,
  (select count(*) from public.game_log_imports where input_sha256 is null)
    as legacy_imports_missing_input_hash,
  (select count(*) from (
     select source_sha256 from v2_sources group by source_sha256 having count(*) > 1
   ) d) as duplicate_v2_source_hashes,
  (select count(*) from (
     select game_id, event_uid from v2_events
     group by game_id, event_uid having count(*) > 1
   ) d) as duplicate_v2_event_identities,
  (select count(*) from (
     select game_id, placement_uid from v2_placements
     group by game_id, placement_uid having count(*) > 1
   ) d) as duplicate_v2_placement_identities,
  (select count(*) from (
     select game_log_import_id, event_identity
     from public.game_log_events
     where event_identity is not null
     group by game_log_import_id, event_identity having count(*) > 1
   ) d) as duplicate_legacy_event_identities,
  (select count(*) from v2_runs where parser_version not in ('tm-data-capture-v2'))
    as unsupported_v2_contract_versions;

-- Expansion-state distribution (missing final Venus stays null, never zero).
select venus_next_state, colonies_state, count(*) as games,
  count(*) filter (where final_venus_scale is not null) as non_null_final_venus,
  count(*) filter (where backfill_version is not null) as backfilled
from public.game_expansion_facts
group by 1, 2
order by 1, 2;
