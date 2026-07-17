import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ANALYTICS_DEFINITIONS,
  CANONICAL_ANALYTICS_FORMULA_VERSION,
  CARD_ACQUISITION_RATE_FORMULA_CODES,
  canonicalAnalyticsCalculationVersion,
  getCanonicalAnalyticsDefinition,
  getCanonicalCardAcquisitionRateDefinition,
  validateCanonicalAnalyticsDefinitions,
} from './canonical-definitions';

describe('canonical analytics definitions', () => {
  it('contains only internally valid, uniquely versioned definitions', () => {
    expect(validateCanonicalAnalyticsDefinitions()).toEqual([]);
    expect(
      new Set(
        CANONICAL_ANALYTICS_DEFINITIONS.map(
          (definition) => `${definition.identity.id}@${definition.identity.version}`,
        ),
      ).size,
    ).toBe(CANONICAL_ANALYTICS_DEFINITIONS.length);
    expect(
      CANONICAL_ANALYTICS_DEFINITIONS.every(
        (definition) => definition.identity.version === CANONICAL_ANALYTICS_FORMULA_VERSION,
      ),
    ).toBe(true);
  });

  it('keeps the five recorded card-acquisition concepts distinct', () => {
    const recorded = CANONICAL_ANALYTICS_DEFINITIONS.filter(
      (definition) => definition.formula.kind === 'recorded-count',
    );
    const sourceFacts = recorded.flatMap((definition) =>
      definition.formula.kind === 'recorded-count'
        ? [definition.formula.sourceFact]
        : [],
    );
    expect(sourceFacts.sort()).toEqual([
      'cards-played',
      'cards-purchased',
      'cards-remaining',
      'cards-seen',
      'total-hand-acquisitions',
    ]);
    expect(recorded.every((definition) => definition.minimumSamplePolicy.kind === 'none')).toBe(
      true,
    );
  });

  it('registers ratio-of-totals and median-per-player-game separately for each approved rate', () => {
    CARD_ACQUISITION_RATE_FORMULA_CODES.forEach((rate) => {
      const ratio = getCanonicalCardAcquisitionRateDefinition({
        rate,
        aggregation: 'ratio-of-totals',
      });
      const median = getCanonicalCardAcquisitionRateDefinition({
        rate,
        aggregation: 'median-per-observation-rate',
      });
      expect(ratio.identity.id).not.toBe(median.identity.id);
      expect(ratio.aggregationKind).toBe('ratio-of-totals');
      expect(median.aggregationKind).toBe('median-per-observation-rate');
      expect(ratio.minimumSamplePolicy).toEqual({ kind: 'none' });
      expect(median.minimumSamplePolicy).toEqual({ kind: 'none' });
    });
  });

  it('records the unresolved tied-first policy instead of a legacy numeric result', () => {
    const definition = getCanonicalAnalyticsDefinition('metric:win-point-differential');
    expect(definition?.formula).toMatchObject({
      kind: 'win-point-differential',
      comparison: 'highest-non-winning-score',
      tiedFirst: 'unresolved-no-numeric-value',
    });
  });

  it('exposes a stable calculation version without presentation copy', () => {
    const definition = getCanonicalAnalyticsDefinition(
      'metric:purchase-conversion:ratio-of-totals',
    );
    expect(definition).toBeDefined();
    expect(canonicalAnalyticsCalculationVersion(definition!)).toEqual({
      definitionId: 'metric:purchase-conversion:ratio-of-totals',
      version: '1',
      methodologyRef: 'docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md',
    });
  });
});
