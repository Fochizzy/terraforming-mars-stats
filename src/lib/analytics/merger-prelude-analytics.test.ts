import { describe, expect, it } from 'vitest';
import { calculateMergerPreludeAvailability } from './merger-prelude-analytics';

describe('calculateMergerPreludeAvailability', () => {
  it('uses the guaranteed rule as the availability denominator and preserves usage separately', () => {
    const result = calculateMergerPreludeAvailability([
      {
        gameId: 'game-1', gamePlayerId: 'gp-1', manualSelection: true,
        resolvedHighConfidenceLogSelection: true, logCoverage: 'merger-play-resolved',
        rule: { guaranteedMergerOffer: true, source: 'historical_policy' },
      },
      {
        gameId: 'game-1', gamePlayerId: 'gp-2', manualSelection: false,
        resolvedHighConfidenceLogSelection: false, logCoverage: 'sufficient-no-merger',
        rule: { guaranteedMergerOffer: true, source: 'historical_policy' },
      },
    ]);

    expect(result.usageRate).toMatchObject({ numerator: 1, denominator: 2, value: 0.5 });
    expect(result.availabilityRate).toMatchObject({ numerator: 2, denominator: 2, value: 1 });
    expect(result.selectionRateGivenAvailability).toMatchObject({ numerator: 1, denominator: 2, value: 0.5 });
    expect(result.offerSourceCounts).toMatchObject({ 'guaranteed-variant': 2, 'random-offer': 0 });
    expect(result.randomOfferSelectionRate).toMatchObject({
      denominator: 0,
      value: null,
      status: 'unavailable-zero-denominator',
    });
  });

  it('does not convert unknown availability or incomplete logs into variant-off', () => {
    const result = calculateMergerPreludeAvailability([
      {
        gameId: 'legacy', gamePlayerId: 'gp-1', manualSelection: false,
        resolvedHighConfidenceLogSelection: false, logCoverage: 'incomplete',
        rule: { guaranteedMergerOffer: null, source: 'unknown' },
      },
    ]);

    expect(result.availabilityRate).toMatchObject({
      numerator: 0,
      denominator: 1,
      value: null,
      status: 'partial-unknown-availability',
    });
    expect(result.unknownRulePlayerGames).toBe(1);
    expect(result.reconciliation).toEqual(['imported-log-incomplete']);
  });

  it('counts a confirmed selection with an unknown game rule as availability-known but source-unknown', () => {
    const result = calculateMergerPreludeAvailability([
      {
        gameId: 'legacy', gamePlayerId: 'gp-1', manualSelection: true,
        resolvedHighConfidenceLogSelection: false, logCoverage: 'no-import',
        rule: { guaranteedMergerOffer: null, source: 'unknown' },
      },
    ]);

    expect(result.availabilityRate.value).toBe(1);
    expect(result.offerSourceCounts.unknown).toBe(1);
    expect(result.reconciliation).toEqual(['manual-selection-log-missing']);
  });

  it('uses deterministic review categories for unresolved actors and conflicts', () => {
    expect(
      calculateMergerPreludeAvailability([
        {
          gameId: 'game-1', gamePlayerId: 'gp-1', manualSelection: false,
          resolvedHighConfidenceLogSelection: false, logActorUnresolved: true,
          logCoverage: 'merger-play-unresolved',
          rule: { guaranteedMergerOffer: true, source: 'group_default' },
        },
        {
          gameId: 'game-1', gamePlayerId: 'gp-2', manualSelection: true,
          resolvedHighConfidenceLogSelection: false, logCoverage: 'sufficient-no-merger',
          rule: { guaranteedMergerOffer: true, source: 'group_default' },
        },
      ]).reconciliation,
    ).toEqual(['log-actor-unresolved', 'explicit-conflict-requiring-review']);
  });
});
