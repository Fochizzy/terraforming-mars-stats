import { describe, expect, it } from 'vitest';
import {
  metricFromNullable,
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
} from '@/lib/metrics/metric-value';
import type { NonExecutableAnalyticsCapability } from './capabilities';
import {
  capabilityUnavailableAnalyticsValue,
  isCapabilityUnavailableAnalyticsValue,
  isLoadErrorAnalyticsValue,
  isReadyAnalyticsValue,
  loadErrorAnalyticsValue,
  readyAnalyticsValue,
  type AnalyticsValueResult,
} from './value-availability';

const blockedCapability: NonExecutableAnalyticsCapability = {
  key: 'cards-purchased-by-generation',
  status: 'requires-new-fields',
  reason: {
    code: 'required-facts-not-persisted',
    explanation: 'No purchase facts are persisted.',
  },
  scopes: { supported: [] },
  missingData: [
    { key: 'card-purchase-facts', description: 'Purchase events or aggregates.' },
  ],
};

describe('ready analytics values', () => {
  it('preserves an explicit observed zero as a value, never as missing', () => {
    const zero = readyAnalyticsValue(observedMetric(0));
    expect(zero.status).toBe('ready');
    expect(zero.value).toEqual({ kind: 'observed', value: 0 });

    const missing = readyAnalyticsValue(missingMetric());
    expect(missing.value.kind).toBe('missing');
    expect(zero.value).not.toEqual(missing.value);
  });

  it('keeps a nonzero observed value intact', () => {
    const result = readyAnalyticsValue(observedMetric(41.5));
    expect(result.value).toEqual({ kind: 'observed', value: 41.5 });
  });

  it('carries partial values together with their coverage context', () => {
    const result = readyAnalyticsValue(partialMetric(12), {
      coverage: { eligibleRecords: 20, recordsWithRequiredData: 12 },
      warnings: [
        { code: 'partial-source-coverage', message: 'Only some sources recorded.' },
      ],
    });
    expect(result.value.kind).toBe('partial');
    expect(result.coverage?.recordsWithRequiredData).toBe(12);
    expect(result.warnings).toHaveLength(1);
  });

  it('keeps a subject-level unavailable metric inside a ready envelope', () => {
    const result = readyAnalyticsValue(
      unavailableMetric('Denominator is zero for this player'),
    );
    expect(result.status).toBe('ready');
    expect(result.value.kind).toBe('unavailable');
    expect(isCapabilityUnavailableAnalyticsValue(result)).toBe(false);
  });

  it('stays compatible with the Phase 1 nullable wrapper', () => {
    expect(readyAnalyticsValue(metricFromNullable(null)).value.kind).toBe(
      'missing',
    );
    expect(readyAnalyticsValue(metricFromNullable(0)).value).toEqual({
      kind: 'observed',
      value: 0,
    });
  });

  it('can attach evidence and a calculation version', () => {
    const result = readyAnalyticsValue(observedMetric(3), {
      evidence: {
        sources: [{ kind: 'persisted-table', reference: 'game_players' }],
        qualifyingGameCount: 8,
      },
      calculationVersion: { definitionId: 'demo-definition', version: '1' },
    });
    expect(result.evidence?.qualifyingGameCount).toBe(8);
    expect(result.calculationVersion?.definitionId).toBe('demo-definition');
  });
});

describe('capability-unavailable analytics values', () => {
  it('wraps a non-executable capability with its typed reason', () => {
    const result = capabilityUnavailableAnalyticsValue(blockedCapability);
    expect(result.status).toBe('capability-unavailable');
    expect(result.capability.reason.code).toBe('required-facts-not-persisted');
    expect(result.capability.missingData).toHaveLength(1);
  });

  it('rejects an executable capability at runtime', () => {
    const executable = {
      key: 'placement-and-winners',
      status: 'supported',
      scopes: { supported: ['group'] },
    } as unknown as NonExecutableAnalyticsCapability;
    expect(() => capabilityUnavailableAnalyticsValue(executable)).toThrow(
      /executable capability/i,
    );
  });
});

describe('load-error analytics values', () => {
  it('represents a failed load distinctly from absent data', () => {
    const error = loadErrorAnalyticsValue({
      message: 'Analytics could not be loaded',
      code: 'query-failed',
      retryable: true,
    });
    expect(error.status).toBe('load-error');
    expect(error.error.retryable).toBe(true);

    const emptyButLoaded = readyAnalyticsValue(missingMetric(), {
      coverage: { eligibleRecords: 0, recordsWithRequiredData: 0 },
    });
    expect(emptyButLoaded.status).toBe('ready');
    expect(error.status).not.toBe(emptyButLoaded.status);
  });
});

describe('result discrimination', () => {
  const results: readonly AnalyticsValueResult[] = [
    readyAnalyticsValue(observedMetric(0)),
    capabilityUnavailableAnalyticsValue(blockedCapability),
    loadErrorAnalyticsValue({ message: 'failed' }),
  ];

  it('narrows each result through exactly one guard', () => {
    const [ready, blocked, failed] = results;
    expect(isReadyAnalyticsValue(ready!)).toBe(true);
    expect(isCapabilityUnavailableAnalyticsValue(ready!)).toBe(false);
    expect(isLoadErrorAnalyticsValue(ready!)).toBe(false);

    expect(isCapabilityUnavailableAnalyticsValue(blocked!)).toBe(true);
    expect(isReadyAnalyticsValue(blocked!)).toBe(false);

    expect(isLoadErrorAnalyticsValue(failed!)).toBe(true);
    expect(isReadyAnalyticsValue(failed!)).toBe(false);
  });

  it('keeps the three states mutually distinct', () => {
    expect(new Set(results.map((result) => result.status)).size).toBe(3);
  });

  it('round-trips every state through JSON without loss', () => {
    for (const result of results) {
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    }
  });
});
