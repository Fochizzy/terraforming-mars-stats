import { describe, expect, it } from 'vitest';
import {
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
} from '@/lib/metrics/metric-value';
import { evaluateAnalyticsCoverage, unknownAnalyticsCoverage } from '../coverage';
import { createDefaultAnalyticsFilterState } from '../filters';
import type { AnalyticsSample } from '../sample';
import { buildAnalyticsSampleCounts } from '../sample';
import {
  aggregatePurchaseConversion,
  calculateEndHandCarryover,
  calculateHandUtilization,
  calculatePurchaseConversion,
  calculatePurchasedHandShare,
} from './card-acquisition';

const eligible = { status: 'eligible' } as const;
const completeCoverage = evaluateAnalyticsCoverage({
  eligibleRecords: 1,
  recordsWithRequiredData: 1,
});

function playerGameSample(input: {
  candidate: number;
  eligible?: number;
  included?: number;
  denominator?: number;
}): AnalyticsSample {
  const eligibleCount = input.eligible ?? input.candidate;
  const included = input.included ?? eligibleCount;
  const counts = buildAnalyticsSampleCounts({
    candidate: input.candidate,
    eligible: eligibleCount,
    included,
  });
  return {
    definition: {
      population: {
        population: 'authorized-group-games',
        requiresGlobalOptIn: false,
        groupId: 'group-1',
      },
      observationUnit: { kind: 'player-game' },
      filters: createDefaultAnalyticsFilterState(),
    },
    counts,
    exclusions:
      counts.excluded === 0
        ? []
        : [
            {
              stage: 'inclusion',
              reason: {
                code: 'missing-required-observation',
                explanation: 'Required card-acquisition facts were not recorded.',
              },
              count: counts.excluded,
            },
          ],
    denominator: {
      kind: 'metric-value',
      metricId: 'metric:cards-seen',
      value: input.denominator ?? 0,
      unitCode: 'cards',
    },
  };
}

describe('per-player-game card-acquisition calculations', () => {
  it('preserves an explicit zero purchase conversion', () => {
    const result = calculatePurchaseConversion({
      observationId: 'game-a:player-a',
      eligibility: eligible,
      coverage: completeCoverage,
      cardsPurchased: observedMetric(0),
      cardsSeen: observedMetric(4),
    });

    expect(result.value).toEqual({ kind: 'observed', value: 0 });
    expect(result.eligibility).toEqual(eligible);
  });

  it('uses each approved numerator and denominator relationship without aliases', () => {
    const shared = { observationId: 'game-a:player-a', eligibility: eligible, coverage: completeCoverage };
    expect(
      calculatePurchasedHandShare({
        ...shared,
        cardsPurchased: observedMetric(3),
        totalHandAcquisitions: observedMetric(10),
      }).value,
    ).toEqual({ kind: 'observed', value: 0.3 });
    expect(
      calculateHandUtilization({
        ...shared,
        cardsPlayed: observedMetric(4),
        totalHandAcquisitions: observedMetric(10),
      }).value,
    ).toEqual({ kind: 'observed', value: 0.4 });
    expect(
      calculateEndHandCarryover({
        ...shared,
        cardsRemaining: observedMetric(2),
        totalHandAcquisitions: observedMetric(10),
      }).value,
    ).toEqual({ kind: 'observed', value: 0.2 });
  });

  it('keeps missing and zero denominators unavailable rather than treating either as zero', () => {
    const missingDenominator = calculatePurchaseConversion({
      observationId: 'missing-denominator',
      eligibility: eligible,
      coverage: completeCoverage,
      cardsPurchased: observedMetric(2),
      cardsSeen: missingMetric(),
    });
    const zeroDenominator = calculatePurchaseConversion({
      observationId: 'zero-denominator',
      eligibility: eligible,
      coverage: completeCoverage,
      cardsPurchased: observedMetric(2),
      cardsSeen: observedMetric(0),
    });

    expect(missingDenominator.value.kind).toBe('unavailable');
    expect(missingDenominator.eligibility).toMatchObject({
      status: 'ineligible',
      reasons: [{ code: 'missing-denominator' }],
    });
    expect(zeroDenominator.value.kind).toBe('unavailable');
    expect(zeroDenominator.eligibility).toMatchObject({
      status: 'ineligible',
      reasons: [{ code: 'zero-denominator' }],
    });
  });

  it('does not turn partial or unknown coverage into a plausible rate', () => {
    const partial = calculatePurchaseConversion({
      observationId: 'partial-coverage',
      eligibility: eligible,
      coverage: evaluateAnalyticsCoverage({
        eligibleRecords: 2,
        recordsWithRequiredData: 1,
      }),
      cardsPurchased: observedMetric(2),
      cardsSeen: observedMetric(4),
    });
    const unknown = calculatePurchaseConversion({
      observationId: 'unknown-coverage',
      eligibility: eligible,
      coverage: unknownAnalyticsCoverage({
        code: 'coverage-not-measured',
        explanation: 'The source has not been measured.',
      }),
      cardsPurchased: observedMetric(2),
      cardsSeen: observedMetric(4),
    });

    expect(partial.value.kind).toBe('unavailable');
    expect(partial.eligibility.status).toBe('ineligible');
    expect(unknown.value.kind).toBe('unavailable');
    expect(unknown.eligibility.status).toBe('indeterminate');
  });

  it('keeps unavailable and partial operands non-exact', () => {
    const unavailable = calculatePurchaseConversion({
      observationId: 'unavailable-operand',
      eligibility: eligible,
      coverage: completeCoverage,
      cardsPurchased: unavailableMetric('Purchase events are unavailable.'),
      cardsSeen: observedMetric(4),
    });
    const partial = calculatePurchaseConversion({
      observationId: 'partial-operand',
      eligibility: eligible,
      coverage: completeCoverage,
      cardsPurchased: partialMetric(2),
      cardsSeen: observedMetric(4),
    });

    expect(unavailable.value.kind).toBe('unavailable');
    expect(unavailable.eligibility).toMatchObject({
      status: 'unavailable',
      reasons: [{ code: 'unavailable-capability' }],
    });
    expect(partial.value.kind).toBe('unavailable');
    expect(partial.eligibility).toMatchObject({
      status: 'ineligible',
      reasons: [{ code: 'incomplete-required-coverage' }],
    });
  });
});

describe('card-acquisition aggregate calculations', () => {
  it('calculates ratio-of-totals and median per-player-game rate separately', () => {
    const result = aggregatePurchaseConversion({
      observations: [
        {
          observationId: 'game-b:player-b',
          eligibility: eligible,
          coverage: completeCoverage,
          cardsPurchased: observedMetric(9),
          cardsSeen: observedMetric(10),
        },
        {
          observationId: 'game-a:player-a',
          eligibility: eligible,
          coverage: completeCoverage,
          cardsPurchased: observedMetric(1),
          cardsSeen: observedMetric(2),
        },
      ],
      sample: playerGameSample({ candidate: 2, denominator: 12 }),
      coverage: evaluateAnalyticsCoverage({
        eligibleRecords: 2,
        recordsWithRequiredData: 2,
      }),
    });

    expect(result.numeratorTotal).toEqual({ kind: 'observed', value: 10 });
    expect(result.denominatorTotal).toEqual({ kind: 'observed', value: 12 });
    expect(result.ratioOfTotals).toEqual({ kind: 'observed', value: 10 / 12 });
    expect(result.medianPerObservationRate).toEqual({ kind: 'observed', value: 0.7 });
    expect(result.includedObservationIds).toEqual(['game-a:player-a', 'game-b:player-b']);
  });

  it('marks aggregate totals partial and rates unavailable when aggregate coverage is partial', () => {
    const result = aggregatePurchaseConversion({
      observations: [
        {
          observationId: 'game-a:player-a',
          eligibility: eligible,
          coverage: completeCoverage,
          cardsPurchased: observedMetric(1),
          cardsSeen: observedMetric(2),
        },
        {
          observationId: 'game-b:player-b',
          eligibility: eligible,
          coverage: completeCoverage,
          cardsPurchased: observedMetric(9),
          cardsSeen: observedMetric(10),
        },
      ],
      sample: playerGameSample({ candidate: 2, denominator: 12 }),
      coverage: evaluateAnalyticsCoverage({
        eligibleRecords: 2,
        recordsWithRequiredData: 1,
      }),
    });

    expect(result.numeratorTotal).toEqual({ kind: 'partial', value: 10 });
    expect(result.denominatorTotal).toEqual({ kind: 'partial', value: 12 });
    expect(result.ratioOfTotals.kind).toBe('unavailable');
    expect(result.medianPerObservationRate.kind).toBe('unavailable');
  });

  it('rejects a sample whose included count does not match calculated observations', () => {
    expect(() =>
      aggregatePurchaseConversion({
        observations: [
          {
            observationId: 'game-a:player-a',
            eligibility: eligible,
            coverage: completeCoverage,
            cardsPurchased: observedMetric(1),
            cardsSeen: observedMetric(2),
          },
        ],
        sample: playerGameSample({ candidate: 2, included: 2, denominator: 2 }),
        coverage: evaluateAnalyticsCoverage({
          eligibleRecords: 2,
          recordsWithRequiredData: 2,
        }),
      }),
    ).toThrow(/included count/i);
  });
});
