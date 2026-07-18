// Canonical capture contract (v2) domain types.
//
// These are the parser's output. They are deliberately attribution-agnostic:
// the parser records the explicit source actor name and a preliminary
// attribution status, but never resolves a stable player id. Stable-id
// resolution happens later, only against exact game participants, so a parser
// rerun keeps deterministic identities regardless of roster state.

export const CAPTURE_PARSER_VERSION = 'tm-data-capture-v2';

export const mechanicStates = [
  'confirmed_present',
  'confirmed_absent',
  'incomplete_evidence',
  'unsupported_log_pattern',
  'conflicting_evidence',
] as const;
export type MechanicState = (typeof mechanicStates)[number];

export const coverageStates = [
  'complete',
  'partial',
  'unsupported_pattern',
  'conflicting',
  'parser_failure',
] as const;
export type CoverageState = (typeof coverageStates)[number];

export type ParserConfidence = 'high' | 'medium' | 'low';

// Attribution before stable-id resolution. `explicit_stable` is only ever set
// by the resolution layer once a source name maps to an exact participant.
export type PreAttributionStatus =
  | 'explicit_unresolved'
  | 'unattributed'
  | 'not_applicable';

export type EventCategory =
  | 'card_play'
  | 'tile_placement'
  | 'global_parameter'
  | 'venus'
  | 'colony'
  | 'milestone'
  | 'award'
  | 'standard_project'
  | 'generation'
  | 'pass'
  | 'action_order'
  | 'card_points'
  | 'resource'
  | 'unsupported';

export type ParameterType = 'temperature' | 'oxygen' | 'ocean' | 'venus';

export type CanonicalEvent = {
  amount: number | null;
  attributionStatus: PreAttributionStatus;
  canonicalEntityId: string | null;
  confidence: ParserConfidence;
  coverageState: CoverageState;
  detail: Record<string, unknown>;
  eventCategory: EventCategory;
  eventSequence: number;
  eventType: string;
  eventUid: string;
  generationNumber: number | null;
  normalizedText: string | null;
  parameterType: ParameterType | null;
  provenance: string;
  sourceLineNumber: number;
  sourcePlayerName: string | null;
  sourceText: string;
  valueAfter: number | null;
  valueBefore: number | null;
};

export type CanonicalTileType =
  | 'ocean'
  | 'city'
  | 'greenery'
  | 'special'
  | 'neutral'
  | 'unresolved';

export type PlacementAction =
  | 'place'
  | 'replace'
  | 'remove'
  | 'convert'
  | 'ownership_change'
  | 'unresolved';

export type OwnershipState = 'owned' | 'neutral' | 'unowned' | 'unresolved';

export type BoardPlacement = {
  attributionStatus: PreAttributionStatus;
  boardPosition: number | null;
  boardRow: number | null;
  canonicalBoardSpaceId: string | null;
  confidence: ParserConfidence;
  eventSequence: number;
  eventUid: string;
  generationNumber: number | null;
  mapCode: string | null;
  ownershipState: OwnershipState;
  placementAction: PlacementAction;
  placementUid: string;
  provenance: string;
  rawActorText: string | null;
  rawEvidence: string;
  sourceCardOrAction: string | null;
  sourcePlayerName: string | null;
  tileType: CanonicalTileType;
  upstreamNumericSpaceId: number | null;
};

export type MapDetectionState =
  | 'confident'
  | 'ambiguous'
  | 'conflicting'
  | 'missing'
  | 'unsupported';

export type MapDetection = {
  candidateMapCodes: string[];
  confidence: ParserConfidence;
  conflictState: 'none' | 'log_vs_screenshot' | 'multiple_candidates' | 'unresolved' | null;
  detectedMapCode: string | null;
  detectionState: MapDetectionState;
  exportedMapValue: string | null;
  objectiveEvidence: Record<string, unknown>;
  oceanEvidence: Record<string, unknown>;
  provenance: string;
  randomizedObjectives: boolean | null;
  unsupportedMap: boolean;
};

export type UnsupportedEvidence = {
  normalizedPattern: string | null;
  rawEvidence: string;
  reason: string;
  sourceLineNumber: number;
};

export type CaptureCoverage = {
  conflictingEvidence: number;
  duplicateCandidates: number;
  overallState: CoverageState;
  parserExceptions: number;
  recognizedLines: number;
  representedByEvents: number;
  totalLines: number;
  unresolvedBoardSpaces: number;
  unresolvedEntities: number;
  unresolvedPlayers: number;
  unresolvedTileTypes: number;
  unsupportedLines: number;
};

export type MechanicCapture = {
  events: CanonicalEvent[];
  finalVenusScale: number | null;
  state: MechanicState;
};

export type GameCaptureResult = {
  colonies: MechanicCapture;
  coverage: CaptureCoverage;
  events: CanonicalEvent[];
  mapDetection: MapDetection;
  parserVersion: typeof CAPTURE_PARSER_VERSION;
  placements: BoardPlacement[];
  sourceFormat: 'manual_web_import' | 'serialized_game' | 'upstream_log' | 'unknown';
  unsupported: UnsupportedEvidence[];
  venus: MechanicCapture;
};
