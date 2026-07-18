import { describe, expect, it } from 'vitest';
import type { GameReview } from '@/features/games/finalize-game';
import { logGameDraftSchema } from '@/lib/validation/log-game';
import { LOG_GAME_WORKFLOW_STEP_LABELS } from './log-game-entry';
import {
  MANUAL_ENTRY_STEPS,
  MANUAL_ENTRY_STEP_COUNT,
  REVIEW_ISSUE_STEP_MAP,
  getAdjacentManualEntryStepId,
  getManualEntryStep,
  getManualEntryStepIndex,
  resolveActiveManualEntryStepId,
  resolveManualEntryStepErrors,
  resolveManualEntryStepForFieldPath,
  resolveManualEntryStepStatus,
  type ManualEntryStepId,
} from './manual-entry-steps';

function buildReview(
  issues: Array<{
    code: GameReview['issues'][number]['code'];
    severity: 'error' | 'warning';
  }>,
): Pick<GameReview, 'issues'> {
  return {
    issues: issues.map((issue) => ({
      code: issue.code,
      message: `test ${issue.code}`,
      severity: issue.severity,
    })),
  };
}

describe('manual entry step registry', () => {
  it('registers six unique steps in the canonical deterministic order', () => {
    const ids = MANUAL_ENTRY_STEPS.map((step) => step.id);

    expect(ids).toEqual([
      'setup',
      'players',
      'milestones',
      'scores',
      'details',
      'review',
    ]);
    expect(new Set(ids).size).toBe(MANUAL_ENTRY_STEP_COUNT);
    expect(MANUAL_ENTRY_STEP_COUNT).toBe(6);
  });

  it('sources every visible label from the centralized Step 4.1 vocabulary', () => {
    for (const step of MANUAL_ENTRY_STEPS) {
      expect(step.label).toBe(LOG_GAME_WORKFLOW_STEP_LABELS[step.id]);
    }
  });

  it('provides a nonempty distinct short label and description for each step', () => {
    const shortLabels = MANUAL_ENTRY_STEPS.map((step) => step.shortLabel);

    for (const step of MANUAL_ENTRY_STEPS) {
      expect(step.shortLabel.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
      expect(step.headingId).toContain(step.id);
    }

    expect(new Set(shortLabels).size).toBe(MANUAL_ENTRY_STEP_COUNT);
  });

  it('marks every current step revisitable and none conditionally available', () => {
    for (const step of MANUAL_ENTRY_STEPS) {
      expect(step.canRevisit).toBe(true);
      expect(step.conditional).toBe(false);
    }
  });

  it('resolves active steps deterministically with a safe fallback', () => {
    expect(resolveActiveManualEntryStepId('scores')).toBe('scores');
    expect(resolveActiveManualEntryStepId('review')).toBe('review');
    expect(resolveActiveManualEntryStepId('unknown-step')).toBe('setup');
    expect(resolveActiveManualEntryStepId(undefined)).toBe('setup');
    expect(resolveActiveManualEntryStepId(null)).toBe('setup');
  });

  it('never produces an invalid step index through lookups or adjacency', () => {
    for (const step of MANUAL_ENTRY_STEPS) {
      expect(getManualEntryStep(step.id).id).toBe(step.id);
      expect(getManualEntryStepIndex(step.id)).toBeGreaterThanOrEqual(0);
      expect(getManualEntryStepIndex(step.id)).toBeLessThan(
        MANUAL_ENTRY_STEP_COUNT,
      );
    }

    expect(getAdjacentManualEntryStepId('setup', 'previous')).toBeNull();
    expect(getAdjacentManualEntryStepId('setup', 'next')).toBe('players');
    expect(getAdjacentManualEntryStepId('review', 'next')).toBeNull();
    expect(getAdjacentManualEntryStepId('review', 'previous')).toBe('details');
  });

  it('maps every existing review issue code to exactly one step', () => {
    const mappedCodes = Object.keys(REVIEW_ISSUE_STEP_MAP);

    expect(mappedCodes.sort()).toEqual(
      [
        'player_count_mismatch',
        'missing_corporation',
        'missing_score_fields',
        'invalid_map_milestone',
        'missing_milestone_winner',
        'milestone_points_mismatch',
        'invalid_map_award',
        'missing_award_funder',
        'missing_award_first_place',
        'award_points_mismatch',
        'invalid_card_breakdown',
      ].sort(),
    );

    for (const stepId of Object.values(REVIEW_ISSUE_STEP_MAP)) {
      expect(MANUAL_ENTRY_STEPS.some((step) => step.id === stepId)).toBe(true);
    }
  });

  it('attributes blocking issues to steps and ignores warning severity', () => {
    const counts = resolveManualEntryStepErrors(
      buildReview([
        { code: 'missing_corporation', severity: 'error' },
        { code: 'missing_milestone_winner', severity: 'error' },
        { code: 'missing_score_fields', severity: 'error' },
        // The existing style-modifier warning reuses this code; it must not
        // count against the Scores step.
        { code: 'missing_score_fields', severity: 'warning' },
      ]),
    );

    expect(counts.players).toBe(1);
    expect(counts.milestones).toBe(1);
    expect(counts.scores).toBe(1);
    expect(counts.setup).toBe(0);
    expect(counts.details).toBe(0);
    expect(counts.review).toBe(0);
  });

  it('resolves step status as current, error, completed, or upcoming', () => {
    const errorCounts = resolveManualEntryStepErrors(
      buildReview([{ code: 'missing_corporation', severity: 'error' }]),
    );
    const visitedStepIds = new Set<ManualEntryStepId>(['setup', 'players']);

    expect(
      resolveManualEntryStepStatus({
        activeStepId: 'setup',
        errorCounts,
        stepId: 'setup',
        visitedStepIds,
      }),
    ).toBe('current');
    expect(
      resolveManualEntryStepStatus({
        activeStepId: 'setup',
        errorCounts,
        stepId: 'players',
        visitedStepIds,
      }),
    ).toBe('error');
    expect(
      resolveManualEntryStepStatus({
        activeStepId: 'players',
        errorCounts,
        stepId: 'setup',
        visitedStepIds,
      }),
    ).toBe('completed');
    expect(
      resolveManualEntryStepStatus({
        activeStepId: 'setup',
        errorCounts,
        stepId: 'scores',
        visitedStepIds,
      }),
    ).toBe('upcoming');
  });

  it('keeps unvisited steps with attributed errors out of the error state', () => {
    const errorCounts = resolveManualEntryStepErrors(
      buildReview([{ code: 'missing_corporation', severity: 'error' }]),
    );

    expect(
      resolveManualEntryStepStatus({
        activeStepId: 'setup',
        errorCounts,
        stepId: 'players',
        visitedStepIds: new Set<ManualEntryStepId>(['setup']),
      }),
    ).toBe('upcoming');
  });

  it('associates every persisted form field with exactly one step', () => {
    const schemaFields = Object.keys(logGameDraftSchema.shape);
    const workflowIdentityFields = [
      'gameId',
      'groupId',
      'importedPlayerResolutions',
    ];

    for (const field of schemaFields) {
      const stepId = resolveManualEntryStepForFieldPath(field);

      if (workflowIdentityFields.includes(field)) {
        expect(stepId).toBeNull();
      } else {
        expect(stepId).not.toBeNull();
      }
    }

    const claimedFields = MANUAL_ENTRY_STEPS.flatMap(
      (step) => step.formSections,
    );

    expect(new Set(claimedFields).size).toBe(claimedFields.length);
    for (const field of claimedFields) {
      expect(schemaFields).toContain(field);
    }
  });

  it('resolves nested field paths to the owning step', () => {
    expect(resolveManualEntryStepForFieldPath('playedOn')).toBe('setup');
    expect(resolveManualEntryStepForFieldPath('generationCount')).toBe('setup');
    expect(
      resolveManualEntryStepForFieldPath('playerSelections.p1.corporationId'),
    ).toBe('players');
    expect(
      resolveManualEntryStepForFieldPath('milestoneClaims.m1.winnerPlayerId'),
    ).toBe('milestones');
    expect(
      resolveManualEntryStepForFieldPath('playerScores.p1.trPoints'),
    ).toBe('scores');
    expect(
      resolveManualEntryStepForFieldPath('playerStyles.p1.keyCardIds.0'),
    ).toBe('details');
    expect(resolveManualEntryStepForFieldPath('notes')).toBe('review');
    expect(resolveManualEntryStepForFieldPath('gameId')).toBeNull();
    expect(resolveManualEntryStepForFieldPath('groupId')).toBeNull();
  });
});
