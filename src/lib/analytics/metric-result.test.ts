import { describe, expect, it } from 'vitest';
import {
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
} from '@/lib/metrics/metric-value';
import type {
  NonExecutableAnalyticsCapability,
  SupportedAnalyticsCapability,
} from './capabilities';
import { evaluateAnalyticsCoverage } from './coverage';
import type { AnalyticsMetricDefinition } from './metric-contracts';
import {
  capabilityUnavailableAnalyticsMetricResult,
  createReadyAnalyticsMetricResult,
  isCapabilityUnavailableAnalyticsMetricResult,
  isLoadErrorAnalyticsMetricResult,
  isReadyAnalyticsMetricResult,
  validateAnalyticsMetricResult,
  type AnalyticsMetricResult,
  type ReadyAnalyticsMetricResult,
} from './metric-result';
import { evaluateAnalyticsMinimumSample, type AnalyticsSample } from './sample';
import { createDefaultAnalyticsFilterState } from './filters';

const supportedCapability: SupportedAnalyticsCapability = {
  key: 'placement-and-winners',
  status: 'supported',
  scopes: { supported: ['group'] },
};

const blockedCapability: NonExecutableAnalyticsCapability = {
  key: 'placement-and-winners',
  status: 'requires-new-fields',
  reason: {
    code: 'required-facts-not-persisted',
    explanation: 'Winner facts are not persisted.',
  },
  scopes: { supported: [] },
  missingData: [{ key: 'winner-facts', description: 'Winner facts.' }],
};

const definition: AnalyticsMetricDefinition = {
  identity: { id: 'metric:win-count', code: 'win-count', version: '1' },
  valueKind: 'count',
  aggregationKind: 'count',
  unit: { kind: 'count' },
  denominatorKind: 'observation-count',
  supportedScopes: ['group'],
  supportedFilters: ['date-range', 'minimum-sample'],
  minimumSamplePolicy: { kind: 'none' },
  capabilityRequirements: [
    { capabilityKey: 'placement-and-winners', necessity: 'required' },
  ],
  explicitZeroValid: true,
  partialCoverage: 'allowed',
  insufficientEvidence: 'applies',
  provenance: 'required',
  requiresIncludedObservations: true,
  interpretation: { mode: 'observational', causalClaimsAllowed: false },
};

const sample: AnalyticsSample = {
  definition: {
    population: {
      population: 'authorized-group-games',
      requiresGlobalOptIn: false,
      groupId: 'group-1',
    },
    observationUnit: { kind: 'game' },
    filters: createDefaultAnalyticsFilterState(),
  },
  counts: { candidate: 4, eligible: 4, included: 4, excluded: 0 },
  exclusions: [],
  denominator: {
    kind: 'observation-count',
    source: 'included',
    value: 4,
    observationUnit: { kind: 'game' },
  },
};

const evidence = {
  sources: [{ kind: 'persisted-table', reference: 'game_players' }],
  qualifyingGameCount: 4,
} as const;

const calculationVersion = {
  definitionId: 'metric:win-count',
  version: '1',
} as const;

function readyResult(
  overrides: Partial<ReadyAnalyticsMetricResult> = {},
): ReadyAnalyticsMetricResult {
  return {
    status: 'ready',
    definition,
    scope: 'group',
    value: observedMetric(0),
    sample,
    coverage: evaluateAnalyticsCoverage({
      eligibleRecords: 4,
      recordsWithRequiredData: 4,
    }),
    eligibility: { status: 'eligible' },
    minimumSample: evaluateAnalyticsMinimumSample({
      policy: definition.minimumSamplePolicy,
      sampleCount: sample.counts.included,
    }),
    capabilities: [supportedCapability],
    evidence,
    calculationVersion,
    ...overrides,
  };
}

describe('ready analytics metric results', () => {
  it('accepts observed zero as a real value and keeps it JSON-safe', () => {
    const result = createReadyAnalyticsMetricResult(readyResult());
    expect(result.value).toEqual({ kind: 'observed', value: 0 });
    expect(JSON.parse(JSON.stringify(result)).value.value).toBe(0);
    expect(validateAnalyticsMetricResult(result)).toEqual([]);
  });

  it('keeps nonzero, missing, unavailable, and partial values distinct', () => {
    expect(
      validateAnalyticsMetricResult(readyResult({ value: observedMetric(3) })),
    ).toEqual([]);
    expect(
      validateAnalyticsMetricResult(readyResult({ value: missingMetric() })),
    ).toEqual([]);
    expect(
      validateAnalyticsMetricResult(
        readyResult({ value: unavailableMetric('Denominator is not available') }),
      ),
    ).toEqual([]);
    expect(
      validateAnalyticsMetricResult(
        readyResult({
          value: partialMetric(2),
          coverage: evaluateAnalyticsCoverage({
            eligibleRecords: 4,
            recordsWithRequiredData: 2,
          }),
        }),
      ),
    ).toEqual([]);
  });

  it('rejects invalid ready value combinations', () => {
    const zeroDisallowed = validateAnalyticsMetricResult(
      readyResult({
        definition: { ...definition, explicitZeroValid: false },
      }),
    );
    expect(zeroDisallowed).toContainEqual(
      expect.objectContaining({ code: 'explicit-zero-not-allowed' }),
    );

    const noIncluded: AnalyticsSample = {
      ...sample,
      counts: { candidate: 0, eligible: 0, included: 0, excluded: 0 },
      denominator: {
        kind: 'observation-count',
        source: 'included',
        value: 0,
        observationUnit: { kind: 'game' },
      },
    };
    expect(
      validateAnalyticsMetricResult(readyResult({ sample: noIncluded })),
    ).toContainEqual(
      expect.objectContaining({
        code: 'observed-value-without-required-sample',
      }),
    );

    const partialIssues = validateAnalyticsMetricResult(
      readyResult({
        definition: { ...definition, partialCoverage: 'not-allowed' },
        value: partialMetric(2),
      }),
    );
    expect(partialIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'partial-value-disallowed' }),
        expect.objectContaining({
          code: 'partial-value-without-partial-coverage',
        }),
      ]),
    );

    expect(
      validateAnalyticsMetricResult(readyResult({ value: unavailableMetric() })),
    ).toContainEqual(
      expect.objectContaining({ code: 'unavailable-value-missing-reason' }),
    );
  });

  it('rejects invalid sample, coverage, eligibility, and evidence payloads', () => {
    expect(
      validateAnalyticsMetricResult(
        readyResult({
          sample: {
            ...sample,
            counts: { candidate: 4, eligible: 4, included: 4, excluded: 1 },
          },
        }),
      ),
    ).toContainEqual(expect.objectContaining({ code: 'sample-invalid' }));
    expect(
      validateAnalyticsMetricResult(
        readyResult({
          coverage: evaluateAnalyticsCoverage({
            eligibleRecords: 2,
            recordsWithRequiredData: 3,
          }),
        }),
      ),
    ).toContainEqual(expect.objectContaining({ code: 'coverage-invalid' }));
    expect(
      validateAnalyticsMetricResult(
        readyResult({ eligibility: { status: 'ineligible', reasons: [] } }),
      ),
    ).toContainEqual(expect.objectContaining({ code: 'eligibility-invalid' }));
    expect(
      validateAnalyticsMetricResult(readyResult({ evidence: { sources: [] } })),
    ).toContainEqual(expect.objectContaining({ code: 'evidence-invalid' }));
  });

  it('rejects missing or unavailable required capabilities', () => {
    expect(
      validateAnalyticsMetricResult(readyResult({ capabilities: [] })),
    ).toContainEqual(
      expect.objectContaining({ code: 'required-capability-missing' }),
    );

    const issues = validateAnalyticsMetricResult(
      readyResult({ capabilities: [blockedCapability] }),
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'required-capability-non-executable' }),
        expect.objectContaining({
          code: 'eligible-with-unavailable-required-capability',
        }),
      ]),
    );
  });

  it('rejects zero denominators for observed rate-like values', () => {
    const rateDefinition: AnalyticsMetricDefinition = {
      ...definition,
      identity: { id: 'metric:win-rate', code: 'win-rate', version: '1' },
      valueKind: 'percentage',
      aggregationKind: 'ratio-of-totals',
      unit: { kind: 'percentage' },
      denominatorKind: 'metric-value',
    };
    const rateSample: AnalyticsSample = {
      ...sample,
      denominator: {
        kind: 'metric-value',
        metricId: 'metric:eligible-games',
        value: 0,
        unitCode: 'games',
      },
    };
    expect(
      validateAnalyticsMetricResult(
        readyResult({ definition: rateDefinition, sample: rateSample }),
      ),
    ).toContainEqual(expect.objectContaining({ code: 'rate-denominator-zero' }));
  });

  it('keeps minimum-sample evaluation tied to policy and included count', () => {
    const minPolicy = { kind: 'caller-provided', threshold: 5 } as const;
    const minDefinition: AnalyticsMetricDefinition = {
      ...definition,
      minimumSamplePolicy: minPolicy,
    };
    expect(
      validateAnalyticsMetricResult(
        readyResult({
          definition: minDefinition,
          minimumSample: {
            status: 'met',
            policy: minPolicy,
            sampleCount: 4,
            threshold: 5,
          },
        }),
      ),
    ).toContainEqual(expect.objectContaining({ code: 'minimum-sample-mismatch' }));
  });
});

describe('non-ready analytics metric results', () => {
  it('distinguishes loading, load errors, unavailable capability, and insufficient evidence', () => {
    const results: readonly AnalyticsMetricResult[] = [
      { status: 'loading', definition, scope: 'group' },
      {
        status: 'load-error',
        definition,
        scope: 'group',
        error: { message: 'Query failed', retryable: true },
      },
      {
        status: 'capability-unavailable',
        definition,
        scope: 'group',
        capability: blockedCapability,
        evidence,
      },
      {
        status: 'insufficient-evidence',
        definition,
        scope: 'group',
        reason: {
          code: 'minimum-sample-not-met',
          explanation: 'Only two eligible games are available.',
        },
        evidence,
      },
      readyResult(),
    ];

    expect(new Set(results.map((result) => result.status)).size).toBe(5);
    expect(isLoadErrorAnalyticsMetricResult(results[1]!)).toBe(true);
    expect(isCapabilityUnavailableAnalyticsMetricResult(results[2]!)).toBe(true);
    expect(isReadyAnalyticsMetricResult(results[4]!)).toBe(true);
  });

  it('validates user-safe reasons for load and insufficient-evidence states', () => {
    expect(
      validateAnalyticsMetricResult({
        status: 'load-error',
        definition,
        scope: 'group',
        error: { message: '' },
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'load-error-blank-message' }),
    );
    expect(
      validateAnalyticsMetricResult({
        status: 'insufficient-evidence',
        definition,
        scope: 'group',
        reason: { code: 'coverage-unknown', explanation: ' ' },
        evidence,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'insufficient-evidence-blank-reason' }),
    );
  });

  it('rejects executable capabilities in unavailable envelopes', () => {
    expect(() =>
      capabilityUnavailableAnalyticsMetricResult({
        definition,
        scope: 'group',
        capability:
          supportedCapability as unknown as NonExecutableAnalyticsCapability,
        evidence,
      }),
    ).toThrow(/executable capability/i);
  });

  it('requires provenance whenever the metric definition demands it', () => {
    expect(
      validateAnalyticsMetricResult(readyResult({ evidence: undefined })),
    ).toContainEqual(
      expect.objectContaining({ code: 'required-provenance-missing' }),
    );
  });
});
