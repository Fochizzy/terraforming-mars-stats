-- Live-capture v2 compatibility reconciliation (read-only, Workstream 9;
-- metrics corrected per audit §16).
--
-- Reconciles the legacy import stores (game_log_imports / game_log_events /
-- game_expansion_facts) against the live-site data-capture v2 stores
-- (game_capture_*). Run read-only; it performs zero writes. Its results are
-- recorded as an immutable artifact under
-- docs/redesign/reports/phase-04-step-03-compat/ — regenerate by re-running
-- this script, never by editing the artifact.
--
-- Honesty rules encoded here:
--   * Coverage is reported PER SYSTEM. A record is never claimed as covered
--     by "either system" merely because a source hash exists — canonical
--     event coverage is measured separately from source presence.
--   * Duplicate source hashes are measured in BOTH systems (the legacy
--     duplicate pair is a known production fact, not smoothed over).
--   * Adapter failures are NOT reported by this script at all: it performs
--     no adapter execution, so it has nothing measured to report.

with games_scope as (select id from public.games),
legacy_imports as (
  select id, game_id, parser_version, input_sha256, raw_log_text
  from public.game_log_imports
),
legacy_games as (select distinct game_id from legacy_imports),
v2_sources as (
  select game_id, source_sha256, game_log_import_id
  from public.game_capture_import_sources
),
v2_runs as (
  select game_id, parser_version, id from public.game_capture_parser_runs
),
v2_supported_runs as (
  select * from v2_runs where parser_version in ('tm-data-capture-v2')
),
v2_events as (select game_id, event_uid from public.game_capture_events),
v2_placements as (
  select game_id, placement_uid from public.game_capture_board_placements
)
select
  (select count(*) from games_scope) as total_games,

  -- Legacy-system coverage (each measured separately, no union claims).
  (select count(*) from legacy_games) as games_with_legacy_source_data,
  (select count(distinct game_id) from legacy_imports where input_sha256 is not null)
    as games_with_legacy_input_hash,
  (select count(distinct gle.game_log_import_id)
     from public.game_log_events gle) as legacy_imports_with_canonical_events,
  (select count(distinct li.game_id)
     from legacy_imports li
     where exists (
       select 1 from public.game_log_events gle
       where gle.game_log_import_id = li.id
     )
  ) as games_with_legacy_canonical_events,
  (select count(distinct li.game_id)
     from legacy_imports li
     where exists (
       select 1 from public.game_log_events gle
       where gle.game_log_import_id = li.id
         and gle.event_type in ('tile_placed', 'tile_removed')
         and gle.placement_action is not null
     )
  ) as games_with_legacy_typed_placements,

  -- v2-system coverage.
  (select count(distinct game_id) from v2_sources) as games_with_v2_sources,
  (select count(distinct game_id) from v2_runs) as games_with_v2_parser_runs,
  (select count(distinct game_id) from v2_events) as games_with_v2_events,
  (select count(distinct game_id) from v2_placements) as games_with_v2_placements,

  -- Adapter servability, measured from stored facts (not executed):
  -- a game is v2-adapter-compatible only with a SUPPORTED v2 parser run;
  -- it requires the legacy fallback when it has a legacy import row but no
  -- supported v2 run (the legacy read path does not gate on the legacy
  -- parser version); it is a missing-source case with neither.
  (select count(*) from games_scope g
     where exists (select 1 from v2_supported_runs r where r.game_id = g.id)
  ) as games_adapter_compatible_via_v2,
  (select count(*) from games_scope g
     where not exists (select 1 from v2_supported_runs r where r.game_id = g.id)
       and exists (select 1 from legacy_games l where l.game_id = g.id)
  ) as games_requiring_legacy_fallback,
  (select count(*) from games_scope g
     where not exists (select 1 from v2_supported_runs r where r.game_id = g.id)
       and not exists (select 1 from legacy_games l where l.game_id = g.id)
  ) as games_missing_source,

  -- Expansion facts.
  (select count(*) from public.game_expansion_facts) as games_with_expansion_state,
  (select count(*) from games_scope g
     where not exists (
       select 1 from public.game_expansion_facts f where f.game_id = g.id
     )
  ) as games_missing_expansion_state,

  -- Parser versions, supported and not, in both systems.
  (select coalesce(string_agg(distinct parser_version, ',' order by parser_version), '')
     from v2_runs) as v2_parser_versions_observed,
  (select count(*) from v2_runs where parser_version not in ('tm-data-capture-v2'))
    as unsupported_v2_contract_versions,
  (select coalesce(string_agg(distinct parser_version, ',' order by parser_version), '')
     from legacy_imports) as legacy_parser_versions_observed,

  -- Integrity: orphaned runs and missing hashes.
  (select count(*) from v2_runs r
     where not exists (select 1 from v2_sources s where s.game_id = r.game_id)
  ) as v2_runs_missing_source,
  (select count(*) from legacy_imports where input_sha256 is null)
    as legacy_imports_missing_input_hash,

  -- Duplicate identities in BOTH systems.
  (select count(*) from (
     select input_sha256 from legacy_imports
     where input_sha256 is not null
     group by input_sha256 having count(*) > 1
   ) d) as duplicate_legacy_source_hashes,
  (select coalesce(sum(n), 0) from (
     select count(*) as n from legacy_imports
     where input_sha256 is not null
     group by input_sha256 having count(*) > 1
   ) d) as legacy_imports_sharing_a_duplicate_hash,
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
  (select count(*) from (
     select game_log_import_id, event_identity
     from public.game_log_events
     where event_identity is not null
       and event_type in ('tile_placed', 'tile_removed')
     group by game_log_import_id, event_identity having count(*) > 1
   ) d) as duplicate_legacy_placement_identities;

-- The duplicate legacy source pair, identified for the documented
-- data-integrity follow-up (game ids only; no source content).
select input_sha256, count(*) as import_count,
  array_agg(game_id order by created_at) as game_ids
from public.game_log_imports
where input_sha256 is not null
group by input_sha256
having count(*) > 1;

-- Expansion-state distribution (missing final Venus stays null, never zero).
select venus_next_state, colonies_state, count(*) as games,
  count(*) filter (where final_venus_scale is not null) as non_null_final_venus,
  count(*) filter (where backfill_version is not null) as backfilled
from public.game_expansion_facts
group by 1, 2
order by 1, 2;
