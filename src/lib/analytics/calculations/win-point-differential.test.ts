import { describe, expect, it } from 'vitest';
import {
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
} from '@/lib/metrics/metric-value';
import { evaluateAnalyticsCoverage, unknownAnalyticsCoverage } from '../coverage';
import { calculateWinPointDifferential } from './win-point-differential';

const eligible = { status: 'eligible' } as const;
const completeCoverage = evaluateAnalyticsCoverage({
  eligibleRecords: 1,
  recordsWithRequiredData: 1,
});

describe('canonical win-point differential', () => {
  it('uses the highest non-winning score, independent of competitor order', () => {
    const result = calculateWinPointDifferential({
      outcome: 'winner',
      eligibility: eligible,
      coverage: completeCoverage,
      winnerScore: observedMetric(82),
      nonWinnerScores: [observedMetric(70), observedMetric(78)],
    });

    expect(result.highestNonWinningScore).toEqual({ kind: 'observed', value: 78 });
    expect(result.value).toEqual({ kind: 'observed', value: 4 });
    expect(result.eligibility).toEqual(eligible);
  });

  it('preserves a valid zero margin for a sole winner decided by a tiebreaker', () => {
    const result = calculateWinPointDifferential({
      outcome: 'winner',
      eligibility: eligible,
      coverage: completeCoverage,
      winnerScore: observedMetric(75),
      nonWinnerScores: [observedMetric(75)],
    });

    expect(result.value).toEqual({ kind: 'observed', value: 0 });
  });

  it('does not fabricate the legacy zero for tied first', () => {
    const result = calculateWinPointDifferential({
      outcome: 'tied-first',
      eligibility: eligible,
      coverage: completeCoverage,
      winnerScore: observedMetric(82),
      nonWinnerScores: [observedMetric(82), observedMetric(70)],
    });

    expect(result.value.kind).toBe('unavailable');
    expect(result.eligibility).toMatchObject({
      status: 'indeterminate',
      reasons: [{ code: 'tied-first-policy-unresolved' }],
    });
  });

  it('marks non-winners not applicable and missing competitor scores non-exact', () => {
    const nonWinner = calculateWinPointDifferential({
      outcome: 'non-winner',
      eligibility: eligible,
      coverage: completeCoverage,
      winnerScore: observedMetric(70),
      nonWinnerScores: [observedMetric(82)],
    });
    const missingCompetitor = calculateWinPointDifferential({
      outcome: 'winner',
      eligibility: eligible,
      coverage: completeCoverage,
      winnerScore: observedMetric(82),
      nonWinnerScores: [missingMetric()],
    });

    expect(nonWinner.value.kind).toBe('missing');
    expect(nonWinner.eligibility.status).toBe('not-applicable');
    expect(missingCompetitor.value.kind).toBe('unavailable');
    expect(missingCompetitor.eligibility).toMatchObject({
      status: 'ineligible',
      reasons: [{ code: 'missing-required-observation' }],
    });
  });

  it('keeps partial and unknown score coverage non-exact', () => {
    const partial = calculateWinPointDifferential({
      outcome: 'winner',
      eligibility: eligible,
      coverage: evaluateAnalyticsCoverage({
        eligibleRecords: 2,
        recordsWithRequiredData: 1,
      }),
      winnerScore: observedMetric(82),
      nonWinnerScores: [observedMetric(78)],
    });
    const unknown = calculateWinPointDifferential({
      outcome: 'winner',
      eligibility: eligible,
      coverage: unknownAnalyticsCoverage({
        code: 'coverage-not-measured',
        explanation: 'Score coverage has not been measured.',
      }),
      winnerScore: observedMetric(82),
      nonWinnerScores: [observedMetric(78)],
    });

    expect(partial.value.kind).toBe('unavailable');
    expect(partial.eligibility.status).toBe('ineligible');
    expect(unknown.value.kind).toBe('unavailable');
    expect(unknown.eligibility.status).toBe('indeterminate');
  });

  it('does not calculate from unavailable or partial final-score operands', () => {
    const unavailable = calculateWinPointDifferential({
      outcome: 'winner',
      eligibility: eligible,
      coverage: completeCoverage,
      winnerScore: unavailableMetric('Winner score is unavailable.'),
      nonWinnerScores: [observedMetric(78)],
    });
    const partial = calculateWinPointDifferential({
      outcome: 'winner',
      eligibility: eligible,
      coverage: completeCoverage,
      winnerScore: observedMetric(82),
      nonWinnerScores: [partialMetric(78)],
    });

    expect(unavailable.value.kind).toBe('unavailable');
    expect(unavailable.eligibility.status).toBe('unavailable');
    expect(partial.value.kind).toBe('unavailable');
    expect(partial.eligibility).toMatchObject({
      status: 'ineligible',
      reasons: [{ code: 'incomplete-required-coverage' }],
    });
  });
});
