export const GAME_LOG_EVENT_CONFIDENCE_LEVELS = [
  'high',
  'medium',
  'low',
  'reviewed',
] as const;

export type GameLogEventConfidenceLevel =
  (typeof GAME_LOG_EVENT_CONFIDENCE_LEVELS)[number];

export const TYPED_PLACEMENT_OWNERSHIP_STATES = [
  'explicit_owner',
  'unknown',
  'not_applicable',
] as const;

export type TypedPlacementOwnershipState =
  (typeof TYPED_PLACEMENT_OWNERSHIP_STATES)[number];

