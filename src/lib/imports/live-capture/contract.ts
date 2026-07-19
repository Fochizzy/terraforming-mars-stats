// Live-site data-capture v2 compatibility contract (Workstream 3).
//
// The live site's `data-capture-hardening-v2` release (parser
// `tm-data-capture-v2`, ledger migration 20260719132042, verified applied to
// production 2026-07-19) persists canonical capture facts in the
// `game_capture_*` tables. The redesign consumes those facts through a
// versioned adapter at the repository boundary — it never duplicates them into
// parallel redesign tables, never overwrites them, and never requires
// reparsing the raw source when a trustworthy canonical capture exists.
//
// This file defines:
//  1. the raw row shapes the adapter reads (subset of columns; the immutable
//     original source text is deliberately never selected), and
//  2. the one canonical model both origins map into — future live-site v2
//     captures and the redesign's own legacy import persistence
//     (game_log_imports + game_log_events + game_expansion_facts).
//
// Authoritative mapping specification:
// docs/redesign/reference/LIVE-SITE-DATA-CAPTURE-V2-COMPATIBILITY.md

import type {
  GameLogEventConfidenceLevel,
  GameLogEventReviewState,
} from '../game-log-event-contract';
import type { ExpansionDetectionState } from '../parse-terraforming-mars-expansion-mechanics';

/** Parser versions of the live-site capture contract this adapter understands. */
export const SUPPORTED_LIVE_CAPTURE_PARSER_VERSIONS = [
  'tm-data-capture-v2',
] as const;

export type SupportedLiveCaptureParserVersion =
  (typeof SUPPORTED_LIVE_CAPTURE_PARSER_VERSIONS)[number];

export function isSupportedLiveCaptureParserVersion(
  version: string,
): version is SupportedLiveCaptureParserVersion {
  return (
    SUPPORTED_LIVE_CAPTURE_PARSER_VERSIONS as readonly string[]
  ).includes(version);
}

// ---------------------------------------------------------------------------
// Raw live-site v2 row shapes (as read through the Data API)
// ---------------------------------------------------------------------------

export type LiveCaptureParserRunRow = {
  coverage: Record<string, unknown>;
  coverage_state: string;
  game_id: string;
  game_log_import_id: string | null;
  id: string;
  parser_ran_at: string;
  parser_version: string;
  provenance: string;
  source_id: string | null;
  source_sha256: string;
  workflow_version: string | null;
};

/** The immutable original source text column is intentionally excluded. */
export type LiveCaptureSourceRow = {
  export_generated_at: string | null;
  game_id: string;
  game_log_import_id: string;
  id: string;
  imported_at: string;
  source_byte_length: number;
  source_format: string;
  source_route: string | null;
  source_sha256: string;
  upstream_app_version: string | null;
};

export type LiveCaptureEventRow = {
  amount: number | null;
  attribution_status: string;
  canonical_entity_id: string | null;
  confidence: string;
  coverage_state: string;
  detail: Record<string, unknown>;
  event_category: string;
  event_sequence: number;
  event_type: string;
  event_uid: string;
  game_id: string;
  game_player_id: string | null;
  generation_number: number | null;
  id: string;
  normalized_text: string | null;
  parameter_type: string | null;
  parser_run_id: string;
  player_id: string | null;
  provenance: string;
  source_line_number: number | null;
  source_sha256: string;
  source_text: string;
  value_after: number | null;
  value_before: number | null;
};

export type LiveCapturePlacementRow = {
  attribution_status: string;
  board_position: number | null;
  board_row: number | null;
  canonical_board_space_id: string | null;
  confidence: string;
  event_id: string | null;
  event_sequence: number;
  game_id: string;
  game_player_id: string | null;
  generation_number: number | null;
  id: string;
  map_code: string | null;
  map_id: string | null;
  ownership_state: string | null;
  parser_run_id: string;
  parser_version: string;
  placement_action: string;
  placement_uid: string;
  player_id: string | null;
  provenance: string;
  raw_actor_text: string | null;
  raw_evidence: string;
  source_card_or_action: string | null;
  tile_type: string;
  upstream_numeric_space_id: number | null;
};

export type LiveCaptureMapDetectionRow = {
  candidate_map_codes: string[];
  confidence: string;
  conflict_state: string | null;
  detected_map_code: string | null;
  detected_map_id: string | null;
  detection_state: string;
  exported_map_value: string | null;
  game_id: string;
  game_log_import_id: string | null;
  id: string;
  objective_evidence: Record<string, unknown>;
  ocean_evidence: Record<string, unknown>;
  parser_run_id: string;
  parser_version: string;
  provenance: string;
  randomized_objectives: boolean | null;
  unsupported_map: boolean;
};

export type LiveCaptureUnsupportedEvidenceRow = {
  game_id: string;
  id: string;
  normalized_pattern: string | null;
  parser_run_id: string;
  parser_version: string;
  raw_evidence: string;
  reason: string;
  source_line_number: number | null;
};

// ---------------------------------------------------------------------------
// Canonical model (one shape for both origins)
// ---------------------------------------------------------------------------

export type CanonicalCaptureOrigin = 'live_capture_v2' | 'redesign_legacy_import';

/** Which evidence system backs this game's canonical capture. */
export type CanonicalCaptureAvailability =
  | 'live_capture_v2'
  | 'legacy_import'
  | 'none';

export type CanonicalCaptureAttribution =
  | 'explicit_stable'
  | 'explicit_unresolved'
  | 'unattributed'
  | 'not_applicable';

export type CanonicalCaptureSource = {
  /**
   * Byte-faithful hash of the original source as stored by v2, or the
   * server-derived hash of the stored (trimmed) legacy raw_log_text. The two
   * are different digests over different byte sequences; `hashScope` says
   * which one this is.
   */
  sha256: string | null;
  hashScope: 'original_source_bytes' | 'stored_trimmed_log_text';
  byteLength: number | null;
  exportGeneratedAt: string | null;
  gameLogImportId: string | null;
  importedAt: string | null;
  sourceFormat: string | null;
  sourceRoute: string | null;
  upstreamAppVersion: string | null;
};

export type CanonicalParserRun = {
  coverage: Record<string, unknown>;
  coverageState: string | null;
  gameLogImportId: string | null;
  /** v2 run id, or the legacy game_log_imports row id acting as the run. */
  id: string;
  parserRanAt: string | null;
  parserVersion: string;
  provenance: string | null;
  sourceSha256: string | null;
  workflowVersion: string | null;
};

export type CanonicalCaptureEvent = {
  amount: number | null;
  attributionStatus: CanonicalCaptureAttribution;
  canonicalEntityId: string | null;
  confidence: GameLogEventConfidenceLevel;
  detail: Record<string, unknown>;
  eventCategory: string;
  eventSequence: number;
  eventType: string;
  eventUid: string;
  gamePlayerId: string | null;
  generationNumber: number | null;
  parameterType: string | null;
  playerId: string | null;
  provenance: string | null;
  reviewState: GameLogEventReviewState;
  sourceLineNumber: number | null;
  sourceText: string;
  valueAfter: number | null;
  valueBefore: number | null;
};

export type CanonicalCapturePlacement = {
  attributionStatus: CanonicalCaptureAttribution;
  boardPosition: number | null;
  boardRow: number | null;
  canonicalBoardSpaceId: string | null;
  confidence: GameLogEventConfidenceLevel;
  eventSequence: number;
  eventUid: string | null;
  generationNumber: number | null;
  gamePlayerId: string | null;
  mapCode: string | null;
  mapId: string | null;
  ownerGamePlayerId: string | null;
  ownerPlayerId: string | null;
  /**
   * 'owned'/'neutral'/'unowned'/'unresolved' come from v2; legacy
   * 'explicit_owner' maps to 'owned', and legacy 'unknown'/'not_applicable'
   * are preserved as themselves. Null means the source carried no ownership
   * fact at all.
   */
  ownershipState:
    | 'owned'
    | 'neutral'
    | 'unowned'
    | 'unresolved'
    | 'unknown'
    | 'not_applicable'
    | null;
  placementAction:
    | 'place'
    | 'replace'
    | 'remove'
    | 'convert'
    | 'ownership_change'
    | 'unresolved';
  placementUid: string;
  playerId: string | null;
  provenance: string | null;
  rawActorText: string | null;
  rawEvidence: string;
  reviewState: GameLogEventReviewState;
  sourceCardOrAction: string | null;
  /**
   * `upstream_tile_code` is the fine-grained legacy vocabulary (e.g.
   * `mining_rights`, `moon_mine`); `capture_coarse_class` is the v2 vocabulary
   * (ocean/city/greenery/special/neutral/unresolved). The value is preserved
   * verbatim in its own vocabulary — the adapter does not translate between
   * them, because inventing a classification is not its job.
   */
  tileType: string | null;
  tileTypeVocabulary: 'upstream_tile_code' | 'capture_coarse_class';
  upstreamNumericSpaceId: number | null;
};

export type CanonicalMapDetection = {
  candidateMapCodes: string[];
  confidence: GameLogEventConfidenceLevel | null;
  conflictState: string | null;
  detectedMapCode: string | null;
  detectedMapId: string | null;
  detectionState: string;
  exportedMapValue: string | null;
  objectiveEvidence: Record<string, unknown>;
  oceanEvidence: Record<string, unknown>;
  provenance: string | null;
  randomizedObjectives: boolean | null;
  reviewState: GameLogEventReviewState;
  unsupportedMap: boolean;
};

export type CanonicalUnsupportedEvidence = {
  normalizedPattern: string | null;
  rawEvidence: string;
  reason: string;
  reviewState: GameLogEventReviewState;
  sourceLineNumber: number | null;
};

export type CanonicalExpansionFacts = {
  backfillVersion: string | null;
  backfilledAt: string | null;
  coloniesState: ExpansionDetectionState;
  colonyBuiltCount: number;
  colonyTradeCount: number;
  detectionProvenance: Record<string, unknown>;
  finalVenusScale: number | null;
  parserVersion: string | null;
  sourceCoverage: Record<string, unknown>;
  sourceGameLogImportId: string | null;
  venusEventCount: number;
  venusNextState: ExpansionDetectionState;
};

export type CanonicalCaptureIssue = {
  code:
    | 'duplicate_event_identity'
    | 'duplicate_placement_identity'
    | 'unsupported_contract_version'
    | 'semantic_violation'
    | 'invalid_row';
  message: string;
};

export type CanonicalGameCapture = {
  availability: CanonicalCaptureAvailability;
  /** Whether the live-site v2 capture schema exists in the connected database. */
  captureSchemaPresent: boolean;
  events: CanonicalCaptureEvent[];
  expansionFacts: CanonicalExpansionFacts | null;
  issues: CanonicalCaptureIssue[];
  mapDetection: CanonicalMapDetection | null;
  /**
   * Parser versions observed on this game's v2 runs that this adapter does
   * not understand. A run with an unknown version is never guessed at — it is
   * reported here and the adapter falls back to the newest supported run, or
   * to the legacy import shape when none exists.
   */
  observedUnsupportedParserVersions: string[];
  origin: CanonicalCaptureOrigin | null;
  parserRun: CanonicalParserRun | null;
  placements: CanonicalCapturePlacement[];
  source: CanonicalCaptureSource | null;
  unsupportedEvidence: CanonicalUnsupportedEvidence[];
};
