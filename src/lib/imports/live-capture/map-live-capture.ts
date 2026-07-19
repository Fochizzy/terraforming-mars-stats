// Pure mapping from both persistence origins into the one canonical capture
// model (Workstream 3). No I/O here — the repository boundary
// (src/lib/db/game-capture-compat-repo.ts) fetches rows and this module maps
// and validates them. Every mapping rule is documented in
// docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md.

import {
  evaluateMechanicSemantics,
  type MechanicSemanticViolation,
} from '../canonical-data-semantics';
import type {
  GameLogEventConfidenceLevel,
  GameLogEventReviewState,
} from '../game-log-event-contract';
import type { ExpansionDetectionState } from '../parse-terraforming-mars-expansion-mechanics';
import type {
  CanonicalCaptureAttribution,
  CanonicalCaptureEvent,
  CanonicalCaptureIssue,
  CanonicalCapturePlacement,
  CanonicalExpansionFacts,
  CanonicalMapDetection,
  CanonicalParserRun,
  CanonicalCaptureSource,
  CanonicalUnsupportedEvidence,
  LiveCaptureEventRow,
  LiveCaptureMapDetectionRow,
  LiveCapturePlacementRow,
  LiveCaptureParserRunRow,
  LiveCaptureSourceRow,
  LiveCaptureUnsupportedEvidenceRow,
} from './contract';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const CONFIDENCE_VALUES: readonly GameLogEventConfidenceLevel[] = [
  'high',
  'medium',
  'low',
];

/**
 * Normalize a stored confidence value. An out-of-contract value is reported by
 * the caller as an `invalid_row` issue and conservatively treated as 'low' —
 * visibility is preserved without inventing certainty.
 */
function normalizeConfidence(value: string | null | undefined): {
  confidence: GameLogEventConfidenceLevel;
  valid: boolean;
} {
  if (
    value &&
    (CONFIDENCE_VALUES as readonly string[]).includes(value)
  ) {
    return { confidence: value as GameLogEventConfidenceLevel, valid: true };
  }
  return { confidence: 'low', valid: false };
}

/**
 * The documented, deterministic review-state derivation for live-site v2 rows.
 * v2 carries no human-review lifecycle, so 'reviewed'/'rejected' never derive
 * from it; a row needs review exactly when its own facts say it is not a
 * clean, attributed, resolved parse.
 */
function deriveLiveCaptureReviewState(input: {
  attributionStatus: string;
  confidence: GameLogEventConfidenceLevel;
  coverageState: string | null;
  unresolvedIdentity: boolean;
}): GameLogEventReviewState {
  if (
    input.unresolvedIdentity ||
    input.attributionStatus === 'explicit_unresolved' ||
    input.confidence === 'low' ||
    (input.coverageState !== null &&
      ['unsupported_pattern', 'conflicting', 'parser_failure'].includes(
        input.coverageState,
      ))
  ) {
    return 'needs_review';
  }
  return 'not_required';
}

const CAPTURE_ATTRIBUTION_VALUES: readonly CanonicalCaptureAttribution[] = [
  'explicit_stable',
  'explicit_unresolved',
  'unattributed',
  'not_applicable',
];

function normalizeAttribution(value: string): {
  attribution: CanonicalCaptureAttribution;
  valid: boolean;
} {
  if ((CAPTURE_ATTRIBUTION_VALUES as readonly string[]).includes(value)) {
    return { attribution: value as CanonicalCaptureAttribution, valid: true };
  }
  return { attribution: 'explicit_unresolved', valid: false };
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

// ---------------------------------------------------------------------------
// Live-site v2 origin
// ---------------------------------------------------------------------------

export function mapLiveCaptureParserRun(
  row: LiveCaptureParserRunRow,
): CanonicalParserRun {
  return {
    coverage: row.coverage ?? {},
    coverageState: row.coverage_state,
    gameLogImportId: row.game_log_import_id,
    id: row.id,
    parserRanAt: row.parser_ran_at,
    parserVersion: row.parser_version,
    provenance: row.provenance,
    sourceSha256: row.source_sha256,
    workflowVersion: row.workflow_version,
  };
}

export function mapLiveCaptureSource(
  row: LiveCaptureSourceRow,
): CanonicalCaptureSource {
  return {
    byteLength: row.source_byte_length,
    exportGeneratedAt: row.export_generated_at,
    gameLogImportId: row.game_log_import_id,
    hashScope: 'original_source_bytes',
    importedAt: row.imported_at,
    sha256: row.source_sha256,
    sourceFormat: row.source_format,
    sourceRoute: row.source_route,
    upstreamAppVersion: row.upstream_app_version,
  };
}

export function mapLiveCaptureEvents(rows: LiveCaptureEventRow[]): {
  events: CanonicalCaptureEvent[];
  issues: CanonicalCaptureIssue[];
} {
  const issues: CanonicalCaptureIssue[] = [];

  for (const uid of findDuplicates(rows.map((row) => row.event_uid))) {
    issues.push({
      code: 'duplicate_event_identity',
      message: `duplicate live-capture event_uid ${uid}`,
    });
  }

  const events = rows.map((row): CanonicalCaptureEvent => {
    const { confidence, valid: confidenceValid } = normalizeConfidence(
      row.confidence,
    );
    const { attribution, valid: attributionValid } = normalizeAttribution(
      row.attribution_status,
    );
    if (!confidenceValid || !attributionValid) {
      issues.push({
        code: 'invalid_row',
        message: `live-capture event ${row.event_uid} carries out-of-contract confidence or attribution`,
      });
    }
    return {
      amount: row.amount,
      attributionStatus: attribution,
      canonicalEntityId: row.canonical_entity_id,
      confidence,
      detail: row.detail ?? {},
      eventCategory: row.event_category,
      eventSequence: row.event_sequence,
      eventType: row.event_type,
      eventUid: row.event_uid,
      gamePlayerId: row.game_player_id,
      generationNumber: row.generation_number,
      parameterType: row.parameter_type,
      playerId: row.player_id,
      provenance: row.provenance,
      reviewState: deriveLiveCaptureReviewState({
        attributionStatus: row.attribution_status,
        confidence,
        coverageState: row.coverage_state,
        unresolvedIdentity: row.event_category === 'unsupported',
      }),
      sourceLineNumber: row.source_line_number,
      sourceText: row.source_text,
      valueAfter: row.value_after,
      valueBefore: row.value_before,
    };
  });

  return { events, issues };
}

export function mapLiveCapturePlacements(rows: LiveCapturePlacementRow[]): {
  issues: CanonicalCaptureIssue[];
  placements: CanonicalCapturePlacement[];
} {
  const issues: CanonicalCaptureIssue[] = [];

  for (const uid of findDuplicates(rows.map((row) => row.placement_uid))) {
    issues.push({
      code: 'duplicate_placement_identity',
      message: `duplicate live-capture placement_uid ${uid}`,
    });
  }

  const placements = rows.map((row): CanonicalCapturePlacement => {
    const { confidence, valid: confidenceValid } = normalizeConfidence(
      row.confidence,
    );
    const { attribution, valid: attributionValid } = normalizeAttribution(
      row.attribution_status,
    );
    if (!confidenceValid || !attributionValid) {
      issues.push({
        code: 'invalid_row',
        message: `live-capture placement ${row.placement_uid} carries out-of-contract confidence or attribution`,
      });
    }
    const unresolvedIdentity =
      row.tile_type === 'unresolved' ||
      row.placement_action === 'unresolved' ||
      row.ownership_state === 'unresolved';
    return {
      attributionStatus: attribution,
      boardPosition: row.board_position,
      boardRow: row.board_row,
      canonicalBoardSpaceId: row.canonical_board_space_id,
      confidence,
      eventSequence: row.event_sequence,
      eventUid: null,
      gamePlayerId: row.game_player_id,
      generationNumber: row.generation_number,
      mapCode: row.map_code,
      mapId: row.map_id,
      ownerGamePlayerId: null,
      ownerPlayerId: null,
      ownershipState:
        (row.ownership_state as CanonicalCapturePlacement['ownershipState']) ??
        null,
      placementAction:
        row.placement_action as CanonicalCapturePlacement['placementAction'],
      placementUid: row.placement_uid,
      playerId: row.player_id,
      provenance: row.provenance,
      rawActorText: row.raw_actor_text,
      rawEvidence: row.raw_evidence,
      reviewState: deriveLiveCaptureReviewState({
        attributionStatus: row.attribution_status,
        confidence,
        coverageState: null,
        unresolvedIdentity,
      }),
      sourceCardOrAction: row.source_card_or_action,
      tileType: row.tile_type,
      tileTypeVocabulary: 'capture_coarse_class',
      upstreamNumericSpaceId: row.upstream_numeric_space_id,
    };
  });

  return { issues, placements };
}

export function mapLiveCaptureMapDetection(
  row: LiveCaptureMapDetectionRow,
): CanonicalMapDetection {
  const { confidence } = normalizeConfidence(row.confidence);
  return {
    candidateMapCodes: row.candidate_map_codes ?? [],
    confidence,
    conflictState: row.conflict_state,
    detectedMapCode: row.detected_map_code,
    detectedMapId: row.detected_map_id,
    detectionState: row.detection_state,
    exportedMapValue: row.exported_map_value,
    objectiveEvidence: row.objective_evidence ?? {},
    oceanEvidence: row.ocean_evidence ?? {},
    provenance: row.provenance,
    randomizedObjectives: row.randomized_objectives,
    reviewState:
      row.detection_state === 'confident'
        ? 'not_required'
        : 'needs_review',
    unsupportedMap: row.unsupported_map,
  };
}

export function mapLiveCaptureUnsupportedEvidence(
  rows: LiveCaptureUnsupportedEvidenceRow[],
): CanonicalUnsupportedEvidence[] {
  return rows.map((row) => ({
    normalizedPattern: row.normalized_pattern,
    rawEvidence: row.raw_evidence,
    reason: row.reason,
    // Unsupported source evidence is by definition awaiting parser
    // improvement or human review; it is never confirmed absence and never a
    // zero.
    reviewState: 'needs_review',
    sourceLineNumber: row.source_line_number,
  }));
}

// ---------------------------------------------------------------------------
// Redesign legacy origin (game_log_imports + game_log_events)
// ---------------------------------------------------------------------------

export type LegacyGameLogImportRow = {
  confidence_summary: Record<string, unknown> | null;
  created_at: string;
  detected_source: string | null;
  id: string;
  input_sha256: string | null;
  line_count: number | null;
  parse_status: string | null;
  parser_version: string | null;
  unparsed_line_count: number | null;
};

export type LegacyGameLogEventRow = {
  board_position: number | null;
  board_row: number | null;
  board_space: string | null;
  colony_id: string | null;
  confidence_level: string;
  event_identity: string | null;
  event_order: number;
  event_provenance: string | null;
  event_type: string;
  game_player_id: string | null;
  generation_number: number | null;
  map_id: string | null;
  owner_game_player_id: string | null;
  owner_player_id: string | null;
  ownership_state: string | null;
  parameter_after: number | null;
  parameter_before: number | null;
  parameter_steps: number | null;
  parser_version: string | null;
  payload: Record<string, unknown> | null;
  placement_action: string | null;
  placement_board: string | null;
  placement_format: string | null;
  player_id: string | null;
  raw_line: string;
  resource_amount: number | null;
  resource_type: string | null;
  /** Absent until migration 20260719234500 is applied to the environment. */
  review_state?: string | null;
  source_entity: string | null;
  source_line_number: number | null;
  source_space_id: string | null;
  tile_type: string | null;
};

/**
 * Legacy event_type → canonical event category. Types with no honest v2
 * equivalent map to 'legacy_other' rather than being forced into a v2
 * category they do not mean.
 */
const LEGACY_EVENT_CATEGORY: Record<string, string> = {
  award_funded: 'award',
  card_bought: 'card_play',
  card_drawn: 'card_play',
  card_hand_initialized: 'card_play',
  card_hand_snapshot: 'card_play',
  card_played: 'card_play',
  card_returned_to_hand: 'card_play',
  cards_discarded: 'card_play',
  colony_built: 'colony',
  colony_setup_added: 'colony',
  colony_track_decreased: 'colony',
  colony_track_increased: 'colony',
  colony_traded: 'colony',
  corporation_selected: 'card_play',
  first_player_selected: 'legacy_other',
  generation_started: 'generation',
  global_parameter_changed: 'global_parameter',
  milestone_claimed: 'milestone',
  player_identified: 'legacy_other',
  prelude_played: 'card_play',
  resource_changed: 'resource',
  terraforming_rating_changed: 'legacy_other',
  terraforming_rating_snapshot: 'legacy_other',
  tile_placed: 'tile_placement',
  tile_removed: 'tile_placement',
  venus_scale_decreased: 'venus',
  venus_scale_increased: 'venus',
};

/**
 * Split contract for a legacy row. Rows written after migration
 * 20260719234500 carry review_state directly; older rows that still hold the
 * overloaded confidence 'reviewed' are split by exactly the same
 * payload-deterministic rule the migration applies.
 */
function legacyReviewContract(row: LegacyGameLogEventRow): {
  confidence: GameLogEventConfidenceLevel;
  issues: CanonicalCaptureIssue[];
  reviewState: GameLogEventReviewState;
} {
  const issues: CanonicalCaptureIssue[] = [];

  if (row.confidence_level === 'reviewed') {
    const corrected = row.payload?.['resolution'] === 'corrected';
    return {
      confidence: corrected ? 'high' : 'low',
      issues,
      reviewState: corrected ? 'reviewed' : 'needs_review',
    };
  }

  const { confidence, valid } = normalizeConfidence(row.confidence_level);
  if (!valid) {
    issues.push({
      code: 'invalid_row',
      message: `legacy event order ${row.event_order} carries out-of-contract confidence ${row.confidence_level}`,
    });
  }

  const storedReviewState = row.review_state;
  if (
    storedReviewState === 'not_required' ||
    storedReviewState === 'needs_review' ||
    storedReviewState === 'reviewed' ||
    storedReviewState === 'rejected'
  ) {
    return { confidence, issues, reviewState: storedReviewState };
  }

  return { confidence, issues, reviewState: 'not_required' };
}

function legacyAttribution(
  row: LegacyGameLogEventRow,
): CanonicalCaptureAttribution {
  if (row.player_id) {
    return 'explicit_stable';
  }
  const payload = row.payload ?? {};
  if (payload['attribution'] === 'world_government') {
    return 'unattributed';
  }
  const actor = payload['actor'] ?? payload['normalized_actor'];
  if (typeof actor === 'string' && actor.trim() !== '') {
    return 'explicit_unresolved';
  }
  return 'not_applicable';
}

function legacyEventUid(row: LegacyGameLogEventRow): string {
  // event_identity is the deterministic identity when present. The fallback
  // is derived from the stored event order — stable across rereads of the
  // same rows, never random, and clearly labelled as derived.
  return row.event_identity ?? `legacy-order:${row.event_order}`;
}

export function mapLegacyEvents(rows: LegacyGameLogEventRow[]): {
  events: CanonicalCaptureEvent[];
  issues: CanonicalCaptureIssue[];
} {
  const issues: CanonicalCaptureIssue[] = [];

  for (const uid of findDuplicates(rows.map(legacyEventUid))) {
    issues.push({
      code: 'duplicate_event_identity',
      message: `duplicate legacy event identity ${uid}`,
    });
  }

  const events = rows.map((row): CanonicalCaptureEvent => {
    const contract = legacyReviewContract(row);
    issues.push(...contract.issues);
    return {
      amount: row.resource_amount ?? row.parameter_steps,
      attributionStatus: legacyAttribution(row),
      canonicalEntityId: row.colony_id,
      confidence: contract.confidence,
      detail: row.payload ?? {},
      eventCategory: LEGACY_EVENT_CATEGORY[row.event_type] ?? 'legacy_other',
      eventSequence: row.event_order,
      eventType: row.event_type,
      eventUid: legacyEventUid(row),
      gamePlayerId: row.game_player_id,
      generationNumber: row.generation_number,
      parameterType:
        row.event_type === 'venus_scale_increased' ||
        row.event_type === 'venus_scale_decreased'
          ? 'venus'
          : null,
      playerId: row.player_id,
      provenance: row.event_provenance,
      reviewState: contract.reviewState,
      sourceLineNumber: row.source_line_number,
      sourceText: row.raw_line,
      valueAfter: row.parameter_after,
      valueBefore: row.parameter_before,
    };
  });

  return { events, issues };
}

export function mapLegacyPlacements(rows: LegacyGameLogEventRow[]): {
  issues: CanonicalCaptureIssue[];
  placements: CanonicalCapturePlacement[];
} {
  const issues: CanonicalCaptureIssue[] = [];
  const tileRows = rows.filter(
    (row) => row.event_type === 'tile_placed' || row.event_type === 'tile_removed',
  );

  for (const uid of findDuplicates(tileRows.map(legacyEventUid))) {
    issues.push({
      code: 'duplicate_placement_identity',
      message: `duplicate legacy placement identity ${uid}`,
    });
  }

  const placements = tileRows.map((row): CanonicalCapturePlacement => {
    const contract = legacyReviewContract(row);
    issues.push(...contract.issues);
    const payload = row.payload ?? {};
    const actor = payload['actor'];
    return {
      attributionStatus: legacyAttribution(row),
      boardPosition: row.board_position,
      boardRow: row.board_row,
      canonicalBoardSpaceId: row.board_space,
      confidence: contract.confidence,
      eventSequence: row.event_order,
      eventUid: legacyEventUid(row),
      gamePlayerId: row.game_player_id,
      generationNumber: row.generation_number,
      mapCode: null,
      mapId: row.map_id,
      ownerGamePlayerId: row.owner_game_player_id,
      ownerPlayerId: row.owner_player_id,
      ownershipState:
        row.ownership_state === 'explicit_owner'
          ? 'owned'
          : ((row.ownership_state as CanonicalCapturePlacement['ownershipState']) ??
            null),
      placementAction: row.event_type === 'tile_placed' ? 'place' : 'remove',
      placementUid: legacyEventUid(row),
      playerId: row.player_id,
      provenance: row.event_provenance,
      rawActorText: typeof actor === 'string' ? actor : null,
      rawEvidence: row.raw_line,
      reviewState: contract.reviewState,
      sourceCardOrAction: row.source_entity,
      tileType: row.tile_type,
      tileTypeVocabulary: 'upstream_tile_code',
      upstreamNumericSpaceId:
        row.board_space && /^\d+$/.test(row.board_space)
          ? Number(row.board_space)
          : null,
    };
  });

  return { issues, placements };
}

type LegacyMapBlock = {
  board_conflicts?: unknown[];
  candidates?: Array<{ code?: string }>;
  detected_map_id?: string | null;
  detected_state?: string;
  map_source?: string;
  objective_configuration?: string;
  ocean_space_ids?: string[];
  selected_map_id?: string | null;
};

export function mapLegacyMapDetection(
  confidenceSummary: Record<string, unknown> | null,
): CanonicalMapDetection | null {
  const block = confidenceSummary?.['map'] as LegacyMapBlock | undefined;
  if (!block || typeof block !== 'object') {
    return null;
  }
  const detectionState =
    typeof block.detected_state === 'string' ? block.detected_state : 'missing';
  return {
    candidateMapCodes: (block.candidates ?? []).flatMap((candidate) =>
      typeof candidate?.code === 'string' ? [candidate.code] : [],
    ),
    confidence: null,
    conflictState:
      (block.board_conflicts ?? []).length > 0 ? 'unresolved' : null,
    detectedMapCode: null,
    detectedMapId:
      typeof block.detected_map_id === 'string' ? block.detected_map_id : null,
    detectionState,
    exportedMapValue: null,
    objectiveEvidence: {
      objective_configuration: block.objective_configuration ?? null,
    },
    oceanEvidence: { ocean_space_ids: block.ocean_space_ids ?? [] },
    provenance:
      typeof block.map_source === 'string' ? block.map_source : null,
    randomizedObjectives:
      block.objective_configuration === undefined
        ? null
        : typeof block.objective_configuration === 'string' &&
          block.objective_configuration.startsWith('randomized'),
    reviewState: detectionState === 'confident' ? 'not_required' : 'needs_review',
    unsupportedMap: false,
  };
}

export function mapLegacyParserRun(
  row: LegacyGameLogImportRow,
): CanonicalParserRun {
  return {
    coverage: {
      line_count: row.line_count,
      parse_status: row.parse_status,
      unparsed_line_count: row.unparsed_line_count,
    },
    coverageState: null,
    gameLogImportId: row.id,
    id: row.id,
    parserRanAt: row.created_at,
    parserVersion: row.parser_version ?? 'unknown',
    provenance: 'redesign_game_log_import',
    sourceSha256: row.input_sha256,
    workflowVersion: null,
  };
}

export function mapLegacySource(
  row: LegacyGameLogImportRow,
): CanonicalCaptureSource {
  return {
    byteLength: null,
    exportGeneratedAt: null,
    gameLogImportId: row.id,
    hashScope: 'stored_trimmed_log_text',
    importedAt: row.created_at,
    sha256: row.input_sha256,
    sourceFormat: row.detected_source,
    sourceRoute: null,
    upstreamAppVersion: null,
  };
}

// ---------------------------------------------------------------------------
// Shared expansion facts + semantics
// ---------------------------------------------------------------------------

export type ExpansionFactsRow = {
  backfill_version: string | null;
  backfilled_at: string | null;
  colonies_state: string;
  colony_built_count: number;
  colony_trade_count: number;
  detection_provenance: Record<string, unknown> | null;
  final_venus_scale: number | null;
  parser_version: string | null;
  source_coverage: Record<string, unknown> | null;
  source_game_log_import_id: string | null;
  venus_event_count: number;
  venus_next_state: string;
};

export function mapExpansionFacts(
  row: ExpansionFactsRow,
): CanonicalExpansionFacts {
  return {
    backfillVersion: row.backfill_version,
    backfilledAt: row.backfilled_at,
    coloniesState: row.colonies_state as ExpansionDetectionState,
    colonyBuiltCount: row.colony_built_count,
    colonyTradeCount: row.colony_trade_count,
    detectionProvenance: row.detection_provenance ?? {},
    finalVenusScale: row.final_venus_scale,
    parserVersion: row.parser_version,
    sourceCoverage: row.source_coverage ?? {},
    sourceGameLogImportId: row.source_game_log_import_id,
    venusEventCount: row.venus_event_count,
    venusNextState: row.venus_next_state as ExpansionDetectionState,
  };
}

/**
 * Evaluate the game-level mechanic states against the observed canonical
 * events using the shared semantic matrix. Violations become adapter issues
 * — they are surfaced, never silently reinterpreted.
 */
export function evaluateExpansionSemantics(input: {
  events: CanonicalCaptureEvent[];
  facts: CanonicalExpansionFacts;
}): CanonicalCaptureIssue[] {
  const blankRows = input.events.filter(
    (event) => event.eventUid.trim() === '' || event.sourceText.trim() === '',
  ).length;

  const venusViolations = evaluateMechanicSemantics({
    blankChildRowCount: blankRows,
    derivedEventCount: input.facts.venusEventCount,
    eventRowCount: input.events.filter(
      (event) => event.eventCategory === 'venus',
    ).length,
    finalValue: input.facts.finalVenusScale,
    state: input.facts.venusNextState,
  });
  const colonyViolations = evaluateMechanicSemantics({
    blankChildRowCount: 0,
    derivedEventCount:
      input.facts.colonyBuiltCount + input.facts.colonyTradeCount,
    eventRowCount: input.events.filter(
      (event) => event.eventCategory === 'colony',
    ).length,
    finalValue: null,
    state: input.facts.coloniesState,
  });

  return [...venusViolations, ...colonyViolations].map(
    (violation: MechanicSemanticViolation): CanonicalCaptureIssue => ({
      code: 'semantic_violation',
      message: violation.message,
    }),
  );
}
