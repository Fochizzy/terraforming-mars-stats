import { describe, expect, it } from 'vitest';
import {
  createDefaultAnalyticsFilterState,
  createEmptyAnalyticsSelectionState,
} from './filters';
import {
  analyticsObservationUnitKey,
  analyticsSampleBasis,
  buildAnalyticsSampleCounts,
  evaluateAnalyticsMinimumSample,
  normalizeAnalyticsSample,
  validateAnalyticsMinimumSamplePolicy,
  validateAnalyticsSample,
  type AnalyticsSample,
} from './sample';

const population = {
  population: 'authorized-group-games',
  requiresGlobalOptIn: false,
  groupId: 'group-1',
} as const;

const baseDefinition = {
  population,
  observationUnit: { kind: 'game' } as const,
  filters: createDefaultAnalyticsFilterState(),
};

const missingObservationReason = {
  code: 'missing-required-observation',
  explanation: 'The required observation was not recorded.',
} as const;

describe('analytics sample counts', () => {
  it('separates candidate, eligible, included, and excluded observations', () => {
    expect(
      buildAnalyticsSampleCounts({ candidate: 12, eligible: 10, included: 7 }),
    ).toEqual({ candidate: 12, eligible: 10, included: 7, excluded: 5 });
  });

  it('rejects impossible count relationships before a sample is built', () => {
    expect(() =>
      buildAnalyticsSampleCounts({ candidate: 2, eligible: 3, included: 2 }),
    ).toThrow(/eligible/i);
    expect(() =>
      buildAnalyticsSampleCounts({ candidate: 3, eligible: 2, included: 3 }),
    ).toThrow(/included/i);
  });

  it('supports standard and metric-specific observation-unit keys', () => {
    expect(analyticsObservationUnitKey({ kind: 'player-game' })).toBe(
      'player-game',
    );
    expect(
      analyticsObservationUnitKey({ kind: 'metric-specific', key: 'card-seen' }),
    ).toBe('metric-specific:card-seen');
  });
});

describe('analytics sample validation', () => {
  const validSample: AnalyticsSample = {
    definition: baseDefinition,
    counts: { candidate: 6, eligible: 5, included: 4, excluded: 2 },
    exclusions: [
      { stage: 'eligibility', reason: missingObservationReason, count: 2 },
    ],
    denominator: {
      kind: 'observation-count',
      source: 'included',
      value: 4,
      observationUnit: { kind: 'game' },
    },
  };

  it('accepts an internally consistent sample ledger', () => {
    expect(validateAnalyticsSample(validSample)).toEqual([]);
  });

  it('requires excluded observations to carry structured reasons', () => {
    expect(
      validateAnalyticsSample({ ...validSample, exclusions: [] }),
    ).toContainEqual(
      expect.objectContaining({ code: 'missing-exclusion-breakdown' }),
    );
    expect(
      validateAnalyticsSample({
        ...validSample,
        exclusions: [
          { stage: 'eligibility', reason: missingObservationReason, count: 1 },
        ],
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'exclusion-breakdown-mismatch' }),
    );
  });

  it('keeps observation denominators tied to the declared count source', () => {
    expect(
      validateAnalyticsSample({
        ...validSample,
        denominator: {
          kind: 'observation-count',
          source: 'eligible',
          value: 4,
          observationUnit: { kind: 'game' },
        },
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'denominator-count-mismatch' }),
    );
  });

  it('allows a zero metric denominator to round-trip without becoming missing', () => {
    const sample: AnalyticsSample = {
      ...validSample,
      denominator: {
        kind: 'metric-value',
        metricId: 'terraforming-rating-total',
        value: 0,
        unitCode: 'points',
      },
    };
    expect(JSON.parse(JSON.stringify(sample)).denominator.value).toBe(0);
    expect(validateAnalyticsSample(sample)).toEqual([]);
  });

  it('normalizes exclusion order deterministically without mutating input', () => {
    const input: AnalyticsSample = Object.freeze({
      ...validSample,
      exclusions: Object.freeze([
        Object.freeze({
          stage: 'inclusion',
          reason: { ...missingObservationReason, code: 'invalid-or-stale-filter' },
          count: 1,
        }),
        Object.freeze({
          stage: 'eligibility',
          reason: missingObservationReason,
          count: 1,
        }),
      ]),
    }) as AnalyticsSample;
    const before = JSON.stringify(input);
    const normalized = normalizeAnalyticsSample(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(normalized.exclusions.map((entry) => entry.stage)).toEqual([
      'eligibility',
      'inclusion',
    ]);
  });
});

describe('selection versus sample basis', () => {
  it('does not let comparison selection change the analytical sample', () => {
    const selectionA = {
      state: {
        ...createEmptyAnalyticsSelectionState(),
        entities: [{ kind: 'player', playerId: 'player-a' }] as const,
      },
      role: 'comparison-only',
    } as const;
    const selectionB = {
      state: {
        ...createEmptyAnalyticsSelectionState(),
        entities: [{ kind: 'player', playerId: 'player-b' }] as const,
      },
      role: 'comparison-only',
    } as const;

    expect(
      analyticsSampleBasis({ ...baseDefinition, selectionContext: selectionA }),
    ).toEqual(
      analyticsSampleBasis({ ...baseDefinition, selectionContext: selectionB }),
    );
  });
});

describe('minimum-sample policies', () => {
  it('distinguishes no threshold, met, not met, cannot evaluate, and insufficient evidence', () => {
    expect(
      evaluateAnalyticsMinimumSample({
        policy: { kind: 'none' },
        sampleCount: 0,
      }).status,
    ).toBe('no-threshold');
    expect(
      evaluateAnalyticsMinimumSample({
        policy: { kind: 'metric-specific', threshold: 3, policyRef: 'policy-1' },
        sampleCount: 3,
      }).status,
    ).toBe('met');
    expect(
      evaluateAnalyticsMinimumSample({
        policy: { kind: 'caller-provided', threshold: 3 },
        sampleCount: 2,
      }).status,
    ).toBe('not-met');
    expect(
      evaluateAnalyticsMinimumSample({
        policy: { kind: 'caller-provided', threshold: 3 },
        sampleCount: null,
      }).status,
    ).toBe('cannot-evaluate');
    expect(
      evaluateAnalyticsMinimumSample({
        policy: { kind: 'caller-provided', threshold: 3 },
        sampleCount: 3,
        insufficientEvidence: {
          code: 'documented-insufficient-evidence',
          explanation: 'The supporting population has not been verified.',
        },
      }).status,
    ).toBe('insufficient-evidence');
  });

  it('validates metric-specific and caller-provided thresholds explicitly', () => {
    expect(
      validateAnalyticsMinimumSamplePolicy({
        kind: 'metric-specific',
        threshold: 3,
        policyRef: '',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'blank-minimum-sample-policy-ref' }),
    );
    expect(
      validateAnalyticsMinimumSamplePolicy({
        kind: 'caller-provided',
        threshold: 2.5,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'invalid-minimum-sample-threshold' }),
    );
  });
});
