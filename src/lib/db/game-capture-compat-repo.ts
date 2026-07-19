// Versioned live-capture compatibility adapter — repository boundary
// (Workstream 3).
//
// One read path returns the canonical capture model for a game regardless of
// which system persisted it:
//   * live-site v2 capture rows (game_capture_* — parser `tm-data-capture-v2`)
//     when a supported v2 parser run exists for the game;
//   * the redesign's legacy import persistence (game_log_imports +
//     game_log_events + game_expansion_facts) otherwise.
//
// Capability detection, not assumption: the first v2 query doubles as the
// schema probe. A database without the v2 schema (production before the
// live-site deployment, or a disposable test database) answers with
// "relation does not exist", which is treated as capability-absent — never as
// an error, never as parser failure, and never as confirmed absence.
//
// A game with no v2 rows is NOT a parser failure and NOT confirmed absence —
// it simply predates the v2 cutoff or was imported through the redesign path.
// The result's `availability` states which evidence system backs the model.

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  isSupportedLiveCaptureParserVersion,
  type CanonicalGameCapture,
  type CanonicalCaptureIssue,
  type LiveCaptureEventRow,
  type LiveCaptureMapDetectionRow,
  type LiveCapturePlacementRow,
  type LiveCaptureParserRunRow,
  type LiveCaptureSourceRow,
  type LiveCaptureUnsupportedEvidenceRow,
} from '@/lib/imports/live-capture/contract';
import {
  evaluateExpansionSemantics,
  mapExpansionFacts,
  mapLegacyEvents,
  mapLegacyMapDetection,
  mapLegacyParserRun,
  mapLegacyPlacements,
  mapLegacySource,
  mapLiveCaptureEvents,
  mapLiveCaptureMapDetection,
  mapLiveCapturePlacements,
  mapLiveCaptureParserRun,
  mapLiveCaptureSource,
  mapLiveCaptureUnsupportedEvidence,
  type ExpansionFactsRow,
  type LegacyGameLogEventRow,
  type LegacyGameLogImportRow,
} from '@/lib/imports/live-capture/map-live-capture';

const PARSER_RUN_COLUMNS =
  'id, game_id, game_log_import_id, source_id, source_sha256, parser_version, workflow_version, coverage_state, coverage, provenance, parser_ran_at';

const SOURCE_COLUMNS =
  'id, game_id, game_log_import_id, source_format, source_route, source_sha256, source_byte_length, upstream_app_version, export_generated_at, imported_at';

const EVENT_COLUMNS =
  'id, event_uid, game_id, parser_run_id, source_sha256, event_sequence, generation_number, player_id, game_player_id, attribution_status, event_category, event_type, canonical_entity_id, source_line_number, source_text, normalized_text, parameter_type, value_before, value_after, amount, confidence, coverage_state, provenance, detail';

const PLACEMENT_COLUMNS =
  'id, placement_uid, game_id, event_id, parser_run_id, event_sequence, generation_number, player_id, game_player_id, raw_actor_text, attribution_status, map_id, map_code, canonical_board_space_id, upstream_numeric_space_id, board_row, board_position, tile_type, placement_action, ownership_state, source_card_or_action, raw_evidence, confidence, parser_version, provenance';

const MAP_DETECTION_COLUMNS =
  'id, game_id, parser_run_id, game_log_import_id, exported_map_value, detection_state, detected_map_id, detected_map_code, candidate_map_codes, ocean_evidence, objective_evidence, randomized_objectives, conflict_state, unsupported_map, confidence, parser_version, provenance';

const UNSUPPORTED_COLUMNS =
  'id, game_id, parser_run_id, source_line_number, raw_evidence, normalized_pattern, reason, parser_version';

const LEGACY_IMPORT_COLUMNS =
  'id, created_at, detected_source, parser_version, parse_status, line_count, unparsed_line_count, input_sha256, confidence_summary';

const LEGACY_EVENT_COLUMNS =
  'event_order, event_type, generation_number, game_player_id, player_id, confidence_level, raw_line, payload, colony_id, event_identity, parameter_steps, parameter_before, parameter_after, source_entity, parser_version, event_provenance, map_id, placement_action, placement_board, placement_format, source_space_id, board_space, board_row, board_position, source_line_number, ownership_state, owner_player_id, owner_game_player_id, tile_type, resource_amount, resource_type';

const EXPANSION_FACT_COLUMNS =
  'venus_next_state, colonies_state, final_venus_scale, venus_event_count, colony_built_count, colony_trade_count, parser_version, source_coverage, detection_provenance, source_game_log_import_id, backfill_version, backfilled_at';

/** Missing-relation answers that mean "the v2 capture schema is not here". */
function isMissingRelationError(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /relation .* does not exist/i.test(error.message ?? '') ||
    /could not find the table/i.test(error.message ?? '')
  );
}

/** Missing-column answers (legacy schema before a gated migration applies). */
function isMissingColumnError(error: {
  code?: string;
  message?: string;
}): boolean {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column .* does not exist/i.test(error.message ?? '')
  );
}

function chooseParserRun(runs: LiveCaptureParserRunRow[]): {
  chosen: LiveCaptureParserRunRow | null;
  unsupportedVersions: string[];
} {
  const supported = runs.filter((run) =>
    isSupportedLiveCaptureParserVersion(run.parser_version),
  );
  const unsupportedVersions = [
    ...new Set(
      runs
        .filter((run) => !isSupportedLiveCaptureParserVersion(run.parser_version))
        .map((run) => run.parser_version),
    ),
  ].sort();
  const chosen =
    [...supported].sort((a, b) =>
      (b.parser_ran_at ?? '').localeCompare(a.parser_ran_at ?? ''),
    )[0] ?? null;
  return { chosen, unsupportedVersions };
}

export async function readCanonicalGameCapture(input: {
  gameId: string;
}): Promise<CanonicalGameCapture> {
  const supabase = await createSupabaseServerClient();
  const issues: CanonicalCaptureIssue[] = [];

  // 1. Probe + fetch v2 parser runs in one query.
  let captureSchemaPresent = true;
  let runs: LiveCaptureParserRunRow[] = [];
  {
    const { data, error } = await supabase
      .from('game_capture_parser_runs')
      .select(PARSER_RUN_COLUMNS)
      .eq('game_id', input.gameId);
    if (error) {
      if (isMissingRelationError(error)) {
        captureSchemaPresent = false;
      } else {
        throw error;
      }
    } else {
      runs = (data ?? []) as unknown as LiveCaptureParserRunRow[];
    }
  }

  const { chosen, unsupportedVersions } = chooseParserRun(runs);
  for (const version of unsupportedVersions) {
    issues.push({
      code: 'unsupported_contract_version',
      message: `live-capture parser run with unsupported parser_version ${version} was observed and left untouched`,
    });
  }

  // 2. Expansion facts are shared by both origins.
  const factsResult = await supabase
    .from('game_expansion_facts')
    .select(EXPANSION_FACT_COLUMNS)
    .eq('game_id', input.gameId)
    .maybeSingle();
  if (factsResult.error) {
    throw factsResult.error;
  }
  const expansionFacts = factsResult.data
    ? mapExpansionFacts(factsResult.data as unknown as ExpansionFactsRow)
    : null;

  // 3. Preferred origin: a supported live-capture v2 run.
  if (chosen) {
    const [events, placements, mapDetections, unsupported, sources] =
      await Promise.all([
        supabase
          .from('game_capture_events')
          .select(EVENT_COLUMNS)
          .eq('parser_run_id', chosen.id)
          .order('event_sequence', { ascending: true }),
        supabase
          .from('game_capture_board_placements')
          .select(PLACEMENT_COLUMNS)
          .eq('parser_run_id', chosen.id)
          .order('event_sequence', { ascending: true }),
        supabase
          .from('game_capture_map_detections')
          .select(MAP_DETECTION_COLUMNS)
          .eq('parser_run_id', chosen.id),
        supabase
          .from('game_capture_unsupported_evidence')
          .select(UNSUPPORTED_COLUMNS)
          .eq('parser_run_id', chosen.id)
          .order('source_line_number', { ascending: true }),
        supabase
          .from('game_capture_import_sources')
          .select(SOURCE_COLUMNS)
          .eq('game_id', input.gameId),
      ]);

    for (const result of [events, placements, mapDetections, unsupported, sources]) {
      if (result.error) {
        throw result.error;
      }
    }

    const mappedEvents = mapLiveCaptureEvents(
      (events.data ?? []) as unknown as LiveCaptureEventRow[],
    );
    const mappedPlacements = mapLiveCapturePlacements(
      (placements.data ?? []) as unknown as LiveCapturePlacementRow[],
    );
    issues.push(...mappedEvents.issues, ...mappedPlacements.issues);

    const sourceRow =
      ((sources.data ?? []) as unknown as LiveCaptureSourceRow[]).find(
        (row) =>
          row.id === chosen.source_id ||
          (chosen.game_log_import_id !== null &&
            row.game_log_import_id === chosen.game_log_import_id),
      ) ?? null;

    if (expansionFacts) {
      issues.push(
        ...evaluateExpansionSemantics({
          events: mappedEvents.events,
          facts: expansionFacts,
        }),
      );
    }

    const detectionRow = ((mapDetections.data ??
      []) as unknown as LiveCaptureMapDetectionRow[])[0];

    return {
      availability: 'live_capture_v2',
      captureSchemaPresent,
      events: mappedEvents.events,
      expansionFacts,
      issues,
      mapDetection: detectionRow
        ? mapLiveCaptureMapDetection(detectionRow)
        : null,
      observedUnsupportedParserVersions: unsupportedVersions,
      origin: 'live_capture_v2',
      parserRun: mapLiveCaptureParserRun(chosen),
      placements: mappedPlacements.placements,
      source: sourceRow ? mapLiveCaptureSource(sourceRow) : null,
      unsupportedEvidence: mapLiveCaptureUnsupportedEvidence(
        (unsupported.data ?? []) as unknown as LiveCaptureUnsupportedEvidenceRow[],
      ),
    };
  }

  // 4. Legacy origin: the latest redesign game-log import for the game.
  const importResult = await supabase
    .from('game_log_imports')
    .select(LEGACY_IMPORT_COLUMNS)
    .eq('game_id', input.gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (importResult.error) {
    throw importResult.error;
  }
  const importRow = importResult.data as unknown as LegacyGameLogImportRow | null;

  if (!importRow) {
    // No import evidence at all. Expansion facts may still exist (for example
    // the historical owner-confirmed absence rows) and are returned as-is.
    return {
      availability: 'none',
      captureSchemaPresent,
      events: [],
      expansionFacts,
      issues,
      mapDetection: null,
      observedUnsupportedParserVersions: unsupportedVersions,
      origin: null,
      parserRun: null,
      placements: [],
      source: null,
      unsupportedEvidence: [],
    };
  }

  // review_state exists only after gated migration 20260719234500; select it
  // when available and fall back to the pre-split column list otherwise.
  let legacyEventRows: LegacyGameLogEventRow[] = [];
  {
    const withReviewState = await supabase
      .from('game_log_events')
      .select(`${LEGACY_EVENT_COLUMNS}, review_state`)
      .eq('game_log_import_id', importRow.id)
      .order('event_order', { ascending: true });
    if (withReviewState.error) {
      if (!isMissingColumnError(withReviewState.error)) {
        throw withReviewState.error;
      }
      const withoutReviewState = await supabase
        .from('game_log_events')
        .select(LEGACY_EVENT_COLUMNS)
        .eq('game_log_import_id', importRow.id)
        .order('event_order', { ascending: true });
      if (withoutReviewState.error) {
        throw withoutReviewState.error;
      }
      legacyEventRows = (withoutReviewState.data ??
        []) as unknown as LegacyGameLogEventRow[];
    } else {
      legacyEventRows = (withReviewState.data ??
        []) as unknown as LegacyGameLogEventRow[];
    }
  }

  const mappedEvents = mapLegacyEvents(legacyEventRows);
  const mappedPlacements = mapLegacyPlacements(legacyEventRows);
  issues.push(...mappedEvents.issues, ...mappedPlacements.issues);

  if (expansionFacts) {
    issues.push(
      ...evaluateExpansionSemantics({
        events: mappedEvents.events,
        facts: expansionFacts,
      }),
    );
  }

  return {
    availability: 'legacy_import',
    captureSchemaPresent,
    events: mappedEvents.events,
    expansionFacts,
    issues,
    mapDetection: mapLegacyMapDetection(importRow.confidence_summary),
    observedUnsupportedParserVersions: unsupportedVersions,
    origin: 'redesign_legacy_import',
    parserRun: mapLegacyParserRun(importRow),
    placements: mappedPlacements.placements,
    source: mapLegacySource(importRow),
    unsupportedEvidence: [],
  };
}
