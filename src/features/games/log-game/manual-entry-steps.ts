import type { GameReview } from '@/features/games/finalize-game';
import type { LogGameDraftInput } from '@/lib/validation/log-game';
import { LOG_GAME_WORKFLOW_STEP_LABELS } from './log-game-entry';

/**
 * One typed registry for the manual-entry wizard steps. Visible labels stay
 * sourced from the canonical Step 4.1 vocabulary in `log-game-entry.ts`; this
 * registry adds order, responsive labels, descriptions, focus targets, and
 * completion/error resolution without duplicating the persisted form schema.
 */
export type ManualEntryStepId = keyof typeof LOG_GAME_WORKFLOW_STEP_LABELS;

export type ManualEntryStepDefinition = {
  id: ManualEntryStepId;
  /** Canonical visible label shared with Step 4.1 section vocabulary. */
  label: string;
  /** Compact label for narrow-width step navigation. */
  shortLabel: string;
  /** Step description rendered under the active-step heading. */
  description: string;
  /** DOM id of the step heading used as the focus target on step changes. */
  headingId: string;
  /**
   * Top-level `LogGameDraftInput` fields edited on this step. This associates
   * existing schema errors with a step for visibility; it does not restate or
   * change the persisted schema itself.
   */
  formSections: readonly (keyof LogGameDraftInput)[];
  /** Every current manual-entry step supports revisiting at any time. */
  canRevisit: boolean;
  /** No current manual-entry step is conditionally available. */
  conditional: boolean;
};

export const MANUAL_ENTRY_STEPS: readonly ManualEntryStepDefinition[] = [
  {
    id: 'setup',
    label: LOG_GAME_WORKFLOW_STEP_LABELS.setup,
    shortLabel: 'Setup',
    description:
      'Record the played date, map, player count, generations, promo sets, and the saved Merger rule.',
    headingId: 'manual-entry-step-setup-heading',
    formSections: [
      'playedOn',
      'mapId',
      'objectiveConfiguration',
      'playerCount',
      'generationCount',
      'promoSetSlugs',
      'guaranteedMergerOffer',
      'mergerOfferRuleSource',
    ],
    canRevisit: true,
    conditional: false,
  },
  {
    id: 'players',
    label: LOG_GAME_WORKFLOW_STEP_LABELS.players,
    shortLabel: 'Players',
    description:
      'Pick saved players from the roster or type a full name to create that player on save, then assign corporations and Preludes.',
    headingId: 'manual-entry-step-players-heading',
    formSections: ['selectedPlayerIds', 'playerSelections'],
    canRevisit: true,
    conditional: false,
  },
  {
    id: 'milestones',
    label: LOG_GAME_WORKFLOW_STEP_LABELS.milestones,
    shortLabel: 'Milestones',
    description:
      'Record claimed milestones, funded awards, and who placed on each award for the selected map.',
    headingId: 'manual-entry-step-milestones-heading',
    formSections: ['milestoneClaims', 'awardClaims'],
    canRevisit: true,
    conditional: false,
  },
  {
    id: 'scores',
    label: LOG_GAME_WORKFLOW_STEP_LABELS.scores,
    shortLabel: 'Scores',
    description:
      'Total card points are required; microbe, animal, and Jovian breakdowns stay optional.',
    headingId: 'manual-entry-step-scores-heading',
    formSections: ['playerScores'],
    canRevisit: true,
    conditional: false,
  },
  {
    id: 'details',
    label: LOG_GAME_WORKFLOW_STEP_LABELS.details,
    shortLabel: 'Details',
    description:
      'Optionally record declared style, style modifiers, and key cards from the cached catalog.',
    headingId: 'manual-entry-step-details-heading',
    formSections: ['playerStyles'],
    canRevisit: true,
    conditional: false,
  },
  {
    id: 'review',
    label: LOG_GAME_WORKFLOW_STEP_LABELS.review,
    shortLabel: 'Review',
    description:
      'Check validation issues and optional-data coverage, add notes, then save the draft or finalize the game.',
    headingId: 'manual-entry-step-review-heading',
    formSections: ['notes'],
    canRevisit: true,
    conditional: false,
  },
];

export const MANUAL_ENTRY_STEP_COUNT = MANUAL_ENTRY_STEPS.length;

const STEP_INDEX_BY_ID = new Map<ManualEntryStepId, number>(
  MANUAL_ENTRY_STEPS.map((step, index) => [step.id, index]),
);

export function getManualEntryStep(
  stepId: ManualEntryStepId,
): ManualEntryStepDefinition {
  const index = STEP_INDEX_BY_ID.get(stepId);

  if (index === undefined) {
    throw new Error(`Unknown manual-entry step: ${stepId}`);
  }

  return MANUAL_ENTRY_STEPS[index];
}

export function getManualEntryStepIndex(stepId: ManualEntryStepId): number {
  const index = STEP_INDEX_BY_ID.get(stepId);

  if (index === undefined) {
    throw new Error(`Unknown manual-entry step: ${stepId}`);
  }

  return index;
}

/**
 * Deterministic active-step resolution: an unknown or missing candidate
 * resolves to the first step rather than an invalid index.
 */
export function resolveActiveManualEntryStepId(
  candidate: string | null | undefined,
): ManualEntryStepId {
  const match = MANUAL_ENTRY_STEPS.find((step) => step.id === candidate);

  return match ? match.id : MANUAL_ENTRY_STEPS[0].id;
}

export function getAdjacentManualEntryStepId(
  stepId: ManualEntryStepId,
  direction: 'previous' | 'next',
): ManualEntryStepId | null {
  const index = getManualEntryStepIndex(stepId);
  const adjacentIndex = direction === 'previous' ? index - 1 : index + 1;

  if (adjacentIndex < 0 || adjacentIndex >= MANUAL_ENTRY_STEPS.length) {
    return null;
  }

  return MANUAL_ENTRY_STEPS[adjacentIndex].id;
}

type ReviewIssueCode = GameReview['issues'][number]['code'];

/**
 * Where each existing blocking review issue is corrected. This maps issues to
 * steps for error visibility only; it does not change any validation rule.
 * The `missing_score_fields` code is also reused today by a style-modifier
 * warning, so error attribution counts only `severity: 'error'` issues.
 */
export const REVIEW_ISSUE_STEP_MAP: Record<ReviewIssueCode, ManualEntryStepId> = {
  player_count_mismatch: 'players',
  missing_corporation: 'players',
  missing_score_fields: 'scores',
  invalid_card_breakdown: 'scores',
  milestone_points_mismatch: 'scores',
  award_points_mismatch: 'scores',
  invalid_map_milestone: 'milestones',
  missing_milestone_winner: 'milestones',
  invalid_map_award: 'milestones',
  missing_award_funder: 'milestones',
  missing_award_first_place: 'milestones',
};

export type ManualEntryStepErrorCounts = Record<ManualEntryStepId, number>;

export function resolveManualEntryStepErrors(
  review: Pick<GameReview, 'issues'>,
): ManualEntryStepErrorCounts {
  const counts: ManualEntryStepErrorCounts = {
    setup: 0,
    players: 0,
    milestones: 0,
    scores: 0,
    details: 0,
    review: 0,
  };

  for (const issue of review.issues) {
    if (issue.severity !== 'error') {
      continue;
    }

    counts[REVIEW_ISSUE_STEP_MAP[issue.code]] += 1;
  }

  return counts;
}

/**
 * Resolves which step edits a form field path such as
 * `playerScores.p1.trPoints`. Identity fields (`gameId`, `groupId`) belong to
 * the workflow rather than a step and resolve to null.
 */
export function resolveManualEntryStepForFieldPath(
  fieldPath: string,
): ManualEntryStepId | null {
  const topLevelField = fieldPath.split('.')[0];

  for (const step of MANUAL_ENTRY_STEPS) {
    if ((step.formSections as readonly string[]).includes(topLevelField)) {
      return step.id;
    }
  }

  return null;
}

export type ManualEntryStepStatus = 'current' | 'error' | 'completed' | 'upcoming';

/**
 * A step is completed when the user has visited it and no blocking review
 * issue is attributed to it. Visiting is presentation state only; it never
 * gates navigation or changes validation semantics.
 */
export function resolveManualEntryStepStatus({
  activeStepId,
  errorCounts,
  stepId,
  visitedStepIds,
}: {
  activeStepId: ManualEntryStepId;
  errorCounts: ManualEntryStepErrorCounts;
  stepId: ManualEntryStepId;
  visitedStepIds: ReadonlySet<ManualEntryStepId>;
}): ManualEntryStepStatus {
  if (stepId === activeStepId) {
    return 'current';
  }

  if (visitedStepIds.has(stepId) && errorCounts[stepId] > 0) {
    return 'error';
  }

  if (visitedStepIds.has(stepId)) {
    return 'completed';
  }

  return 'upcoming';
}
