/**
 * Canonical win-point differential calculation (Phase 2, Step 2.4).
 *
 * The approved definition is winner score minus the highest non-winning
 * score. Tied-first handling has no approved numeric policy, so this module
 * preserves it as an indeterminate eligibility result rather than emitting
 * the legacy zero value.
 */

import {
  missingMetric,
  observedMetric,
  unavailableMetric,
  type MetricValue,
} from '@/lib/metrics/metric-value';
import type { AnalyticsCoverageEvaluation } from '../coverage';
import type {
  AnalyticsEligibilityReason,
  AnalyticsEligibilityResult,
  AnalyticsGameOutcomeStatus,
} from '../eligibility';

export type WinPointDifferentialInput = {
  outcome: AnalyticsGameOutcomeStatus;
  winnerScore: MetricValue;
  nonWinnerScores: readonly MetricValue[];
  eligibility: AnalyticsEligibilityResult;
  coverage: AnalyticsCoverageEvaluation;
};

export type WinPointDifferentialEvaluation = {
  outcome: AnalyticsGameOutcomeStatus;
  winnerScore: MetricValue;
  highestNonWinningScore: MetricValue;
  value: MetricValue;
  eligibility: AnalyticsEligibilityResult;
  coverage: AnalyticsCoverageEvaluation;
};

function reason(
  code: AnalyticsEligibilityReason['code'],
  explanation: string,
): AnalyticsEligibilityReason {
  return { code, explanation };
}

function result(
  input: WinPointDifferentialInput,
  highestNonWinningScore: MetricValue,
  value: MetricValue,
  eligibility: AnalyticsEligibilityResult,
): WinPointDifferentialEvaluation {
  return {
    outcome: input.outcome,
    winnerScore: input.winnerScore,
    highestNonWinningScore,
    value,
    eligibility,
    coverage: input.coverage,
  };
}

function coverageGate(
  input: WinPointDifferentialInput,
): WinPointDifferentialEvaluation | null {
  switch (input.coverage.status) {
    case 'complete':
      return null;
    case 'none':
      return result(
        input,
        missingMetric(),
        missingMetric(),
        {
          status: 'ineligible',
          reasons: [
            reason('missing-required-observation', 'No final-score observations were recorded.'),
          ],
        },
      );
    case 'no-eligible-records':
      return result(
        input,
        missingMetric(),
        missingMetric(),
        {
          status: 'not-applicable',
          reasons: [
            reason('metric-requirement-not-met', 'No eligible winner observation exists.'),
          ],
        },
      );
    case 'partial':
      return result(
        input,
        missingMetric(),
        unavailableMetric('Partial final-score coverage cannot produce an exact margin.'),
        {
          status: 'ineligible',
          reasons: [
            reason('incomplete-required-coverage', 'Final-score coverage is partial.'),
          ],
        },
      );
    case 'unknown':
      return result(
        input,
        missingMetric(),
        unavailableMetric('Final-score coverage is unknown.'),
        {
          status: 'indeterminate',
          reasons: [reason('insufficient-evidence', input.coverage.reason.explanation)],
        },
      );
    case 'capability-unavailable':
      return result(
        input,
        missingMetric(),
        unavailableMetric('The final-score capability is unavailable.'),
        {
          status: 'unavailable',
          reasons: [
            reason('unavailable-capability', input.coverage.capability.reason.explanation),
          ],
        },
      );
    case 'invalid':
      return result(
        input,
        missingMetric(),
        unavailableMetric('Final-score coverage is invalid.'),
        {
          status: 'indeterminate',
          reasons: [
            reason('insufficient-evidence', 'Final-score coverage is internally inconsistent.'),
          ],
        },
      );
  }
}

function unavailableOperandResult(
  input: WinPointDifferentialInput,
  highestNonWinningScore: MetricValue,
  value: MetricValue,
  code: AnalyticsEligibilityReason['code'],
  explanation: string,
): WinPointDifferentialEvaluation {
  return result(input, highestNonWinningScore, value, {
    status: code === 'unavailable-capability' ? 'unavailable' : 'ineligible',
    reasons: [reason(code, explanation)],
  });
}

export function calculateWinPointDifferential(
  input: WinPointDifferentialInput,
): WinPointDifferentialEvaluation {
  if (input.outcome === 'non-winner') {
    return result(input, missingMetric(), missingMetric(), {
      status: 'not-applicable',
      reasons: [
        reason('metric-requirement-not-met', 'Win point differential applies to winners only.'),
      ],
    });
  }
  if (input.outcome === 'tied-first') {
    return result(
      input,
      missingMetric(),
      unavailableMetric('Tied-first win point differential has no approved numeric policy.'),
      {
        status: 'indeterminate',
        reasons: [
          reason(
            'tied-first-policy-unresolved',
            'The tied-first win-point-differential policy has not been approved.',
          ),
        ],
      },
    );
  }

  const gated = coverageGate(input);
  if (gated !== null) return gated;
  if (input.eligibility.status !== 'eligible') {
    return result(
      input,
      missingMetric(),
      unavailableMetric('The winner observation is not eligible for this metric.'),
      input.eligibility,
    );
  }
  if (input.winnerScore.kind === 'missing') {
    return unavailableOperandResult(
      input,
      missingMetric(),
      missingMetric(),
      'missing-required-observation',
      'The winner final score was not recorded.',
    );
  }
  if (input.winnerScore.kind === 'unavailable') {
    return unavailableOperandResult(
      input,
      missingMetric(),
      unavailableMetric('The winner final score is unavailable.'),
      'unavailable-capability',
      'The winner final score is unavailable.',
    );
  }
  if (input.winnerScore.kind === 'partial') {
    return unavailableOperandResult(
      input,
      missingMetric(),
      unavailableMetric('A partial winner score cannot produce an exact margin.'),
      'incomplete-required-coverage',
      'The winner final score is partial.',
    );
  }
  if (!Number.isFinite(input.winnerScore.value)) {
    return unavailableOperandResult(
      input,
      missingMetric(),
      unavailableMetric('The winner final score is not finite.'),
      'metric-requirement-not-met',
      'The winner final score is not finite.',
    );
  }
  if (input.nonWinnerScores.length === 0) {
    return unavailableOperandResult(
      input,
      missingMetric(),
      unavailableMetric('No non-winning final score is available for comparison.'),
      'metric-requirement-not-met',
      'A highest non-winning score is required.',
    );
  }

  const observedNonWinnerScores: number[] = [];
  for (const score of input.nonWinnerScores) {
    if (score.kind === 'missing') {
      return unavailableOperandResult(
        input,
        missingMetric(),
        unavailableMetric('A non-winning final score was not recorded.'),
        'missing-required-observation',
        'Every non-winning final score is required to find the highest one.',
      );
    }
    if (score.kind === 'unavailable') {
      return unavailableOperandResult(
        input,
        missingMetric(),
        unavailableMetric('A non-winning final score is unavailable.'),
        'unavailable-capability',
        'A required non-winning final score is unavailable.',
      );
    }
    if (score.kind === 'partial' || !Number.isFinite(score.value)) {
      return unavailableOperandResult(
        input,
        missingMetric(),
        unavailableMetric('A partial or invalid non-winning score cannot produce an exact margin.'),
        'incomplete-required-coverage',
        'Every non-winning final score must be complete and finite.',
      );
    }
    observedNonWinnerScores.push(score.value);
  }

  const highest = Math.max(...observedNonWinnerScores);
  const margin = input.winnerScore.value - highest;
  if (margin < 0) {
    return unavailableOperandResult(
      input,
      observedMetric(highest),
      unavailableMetric('Winner score is lower than the highest non-winning score.'),
      'metric-requirement-not-met',
      'Winner and final-score inputs are internally inconsistent.',
    );
  }

  return result(input, observedMetric(highest), observedMetric(margin), {
    status: 'eligible',
  });
}
