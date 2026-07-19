// One shared confidence + review-state contract for canonical game-log events.
//
// Confidence describes evidence strength only. Review state describes the
// human-review lifecycle only. The two are never overloaded into one value:
// an unresolved parse is low-confidence evidence that needs review, while an
// importer-corrected value is high-confidence evidence that has been reviewed.
// The database enforces the same two value sets
// (migration 20260719234500_separate_event_confidence_from_review_state.sql).

export const GAME_LOG_EVENT_CONFIDENCE_LEVELS = [
  'high',
  'medium',
  'low',
] as const;

export type GameLogEventConfidenceLevel =
  (typeof GAME_LOG_EVENT_CONFIDENCE_LEVELS)[number];

export const GAME_LOG_EVENT_REVIEW_STATES = [
  'not_required',
  'needs_review',
  'reviewed',
  'rejected',
] as const;

export type GameLogEventReviewState =
  (typeof GAME_LOG_EVENT_REVIEW_STATES)[number];

export type GameLogEventReviewContract = {
  confidenceLevel: GameLogEventConfidenceLevel;
  reviewState: GameLogEventReviewState;
};

/**
 * Shared mapping from an import-evidence resolution to the split contract.
 *
 * - `exact` and `alias` are canonical catalog matches (aliases are verified,
 *   non-fuzzy catalog rows), so they are high-confidence and need no review.
 * - `corrected` is an explicit importer decision made in the review UI, so it
 *   is high-confidence evidence that has already been reviewed.
 * - `ambiguous` and `unknown` evidence cannot be persisted as a canonical
 *   event; callers that still see one must flag it for review.
 */
export function reviewContractForResolution(
  resolution: 'alias' | 'ambiguous' | 'corrected' | 'exact' | 'unknown',
): GameLogEventReviewContract {
  switch (resolution) {
    case 'exact':
    case 'alias':
      return { confidenceLevel: 'high', reviewState: 'not_required' };
    case 'corrected':
      return { confidenceLevel: 'high', reviewState: 'reviewed' };
    case 'ambiguous':
    case 'unknown':
      return { confidenceLevel: 'low', reviewState: 'needs_review' };
  }
}

/**
 * Split contract for parser output that either resolved a canonical identity
 * or preserved an unresolved value for human review (unknown tile labels,
 * unknown colony names).
 */
export function reviewContractForCanonicalResolution(
  isCanonical: boolean,
): GameLogEventReviewContract {
  return isCanonical
    ? { confidenceLevel: 'high', reviewState: 'not_required' }
    : { confidenceLevel: 'low', reviewState: 'needs_review' };
}

export const TYPED_PLACEMENT_OWNERSHIP_STATES = [
  'explicit_owner',
  'unknown',
  'not_applicable',
] as const;

export type TypedPlacementOwnershipState =
  (typeof TYPED_PLACEMENT_OWNERSHIP_STATES)[number];
