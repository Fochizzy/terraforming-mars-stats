import { describe, expect, it } from 'vitest';
import { coverageFraction } from '@/lib/metrics/metric-value';
import {
  analyticsCoverageRatio,
  analyticsCoverageStatus,
  normalizeAnalyticsCoverage,
  toCoverageObservation,
  validateAnalyticsCoverage,
  type AnalyticsCoverage,
} from './coverage';

describe('analyticsCoverageRatio', () => {
  it('reports complete, partial, and explicit zero coverage', () => {
    expect(
      analyticsCoverageRatio({ eligibleRecords: 20, recordsWithRequiredData: 20 }),
    ).toBe(1);
    expect(
      analyticsCoverageRatio({ eligibleRecords: 20, recordsWithRequiredData: 12 }),
    ).toBeCloseTo(0.6);
    expect(
      analyticsCoverageRatio({ eligibleRecords: 20, recordsWithRequiredData: 0 }),
    ).toBe(0);
  });

  it('refuses a percentage when the denominator is not positive or valid', () => {
    expect(
      analyticsCoverageRatio({ eligibleRecords: 0, recordsWithRequiredData: 0 }),
    ).toBeNull();
    expect(
      analyticsCoverageRatio({ eligibleRecords: -5, recordsWithRequiredData: 0 }),
    ).toBeNull();
    expect(
      analyticsCoverageRatio({
        eligibleRecords: Number.NaN,
        recordsWithRequiredData: 0,
      }),
    ).toBeNull();
    expect(
      analyticsCoverageRatio({ eligibleRecords: 2.5, recordsWithRequiredData: 1 }),
    ).toBeNull();
    expect(
      analyticsCoverageRatio({ eligibleRecords: 5, recordsWithRequiredData: 7 }),
    ).toBeNull();
  });
});

describe('analyticsCoverageStatus', () => {
  it('distinguishes complete, partial, none, and no-eligible-records', () => {
    expect(
      analyticsCoverageStatus({ eligibleRecords: 4, recordsWithRequiredData: 4 }),
    ).toBe('complete');
    expect(
      analyticsCoverageStatus({ eligibleRecords: 4, recordsWithRequiredData: 1 }),
    ).toBe('partial');
    expect(
      analyticsCoverageStatus({ eligibleRecords: 4, recordsWithRequiredData: 0 }),
    ).toBe('none');
    expect(
      analyticsCoverageStatus({ eligibleRecords: 0, recordsWithRequiredData: 0 }),
    ).toBe('no-eligible-records');
  });

  it('never confuses zero coverage with an empty eligible population', () => {
    const zeroCoverage = { eligibleRecords: 9, recordsWithRequiredData: 0 };
    const noEligible = { eligibleRecords: 0, recordsWithRequiredData: 0 };
    expect(analyticsCoverageStatus(zeroCoverage)).toBe('none');
    expect(analyticsCoverageRatio(zeroCoverage)).toBe(0);
    expect(analyticsCoverageStatus(noEligible)).toBe('no-eligible-records');
    expect(analyticsCoverageRatio(noEligible)).toBeNull();
  });

  it('reports invalid for structurally impossible counts', () => {
    expect(
      analyticsCoverageStatus({ eligibleRecords: 3, recordsWithRequiredData: 5 }),
    ).toBe('invalid');
    expect(
      analyticsCoverageStatus({
        eligibleRecords: -1,
        recordsWithRequiredData: 0,
      }),
    ).toBe('invalid');
    expect(
      analyticsCoverageStatus({
        eligibleRecords: Number.POSITIVE_INFINITY,
        recordsWithRequiredData: 1,
      }),
    ).toBe('invalid');
  });
});

describe('toCoverageObservation', () => {
  it('matches the Phase 1 coverage fraction for valid and zero denominators', () => {
    const cases = [
      { eligibleRecords: 20, recordsWithRequiredData: 12 },
      { eligibleRecords: 8, recordsWithRequiredData: 0 },
      { eligibleRecords: 0, recordsWithRequiredData: 0 },
    ];
    for (const counts of cases) {
      expect(coverageFraction(toCoverageObservation(counts))).toBe(
        analyticsCoverageRatio(counts),
      );
    }
  });
});

describe('validateAnalyticsCoverage', () => {
  const valid: AnalyticsCoverage = {
    eligibleRecords: 10,
    recordsWithRequiredData: 7,
    recordsMissingRequiredData: 3,
    consideredRecords: 12,
    exclusions: [{ code: 'unfinalized-game', count: 2 }],
    missingDataReasons: [{ code: 'source-not-recorded', count: 3 }],
    sourceDimensions: [
      { sourceKey: 'research-offers', eligibleRecords: 10, recordsWithRequiredData: 7 },
    ],
  };

  it('accepts an internally consistent ledger', () => {
    expect(validateAnalyticsCoverage(valid)).toEqual([]);
  });

  it('rejects negative and non-integer counts', () => {
    expect(
      validateAnalyticsCoverage({
        eligibleRecords: -1,
        recordsWithRequiredData: 0,
      }),
    ).toContainEqual(expect.objectContaining({ code: 'negative-count' }));
    expect(
      validateAnalyticsCoverage({
        eligibleRecords: 1.5,
        recordsWithRequiredData: 0,
      }),
    ).toContainEqual(expect.objectContaining({ code: 'non-integer-count' }));
  });

  it('rejects covered counts above the eligible denominator', () => {
    expect(
      validateAnalyticsCoverage({
        eligibleRecords: 3,
        recordsWithRequiredData: 4,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'covered-exceeds-eligible' }),
    );
  });

  it('rejects a missing-records count that does not reconcile', () => {
    expect(
      validateAnalyticsCoverage({
        eligibleRecords: 10,
        recordsWithRequiredData: 7,
        recordsMissingRequiredData: 2,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'missing-count-mismatch' }),
    );
  });

  it('rejects a considered total below the eligible count', () => {
    expect(
      validateAnalyticsCoverage({
        eligibleRecords: 10,
        recordsWithRequiredData: 7,
        consideredRecords: 6,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'considered-below-eligible' }),
    );
  });

  it('rejects blank and duplicate breakdown codes', () => {
    const issues = validateAnalyticsCoverage({
      eligibleRecords: 4,
      recordsWithRequiredData: 4,
      exclusions: [
        { code: '', count: 1 },
        { code: 'tie-policy', count: 1 },
        { code: 'tie-policy', count: 2 },
      ],
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'blank-breakdown-code' }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-breakdown-code' }),
    );
  });

  it('validates each source dimension independently', () => {
    const issues = validateAnalyticsCoverage({
      eligibleRecords: 10,
      recordsWithRequiredData: 10,
      sourceDimensions: [
        { sourceKey: 'draft-receipts', eligibleRecords: 10, recordsWithRequiredData: 11 },
        { sourceKey: 'draft-receipts', eligibleRecords: 10, recordsWithRequiredData: 2 },
        { sourceKey: ' ', eligibleRecords: 10, recordsWithRequiredData: 2 },
      ],
    });
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'covered-exceeds-eligible',
        path: 'sourceDimensions[0].recordsWithRequiredData',
      }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-source-key' }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'blank-source-key' }),
    );
  });
});

describe('source-dimensional coverage', () => {
  it('lets one source stay partial while another is complete', () => {
    const research = {
      sourceKey: 'research-offers',
      eligibleRecords: 10,
      recordsWithRequiredData: 10,
    };
    const drafts = {
      sourceKey: 'draft-receipts',
      eligibleRecords: 10,
      recordsWithRequiredData: 4,
    };
    expect(analyticsCoverageStatus(research)).toBe('complete');
    expect(analyticsCoverageStatus(drafts)).toBe('partial');
    expect(analyticsCoverageRatio(drafts)).toBeCloseTo(0.4);
  });
});

describe('normalizeAnalyticsCoverage', () => {
  it('fills the derivable missing-records count without inventing data', () => {
    const normalized = normalizeAnalyticsCoverage({
      eligibleRecords: 10,
      recordsWithRequiredData: 7,
    });
    expect(normalized.recordsMissingRequiredData).toBe(3);
  });

  it('leaves an explicit missing-records count untouched', () => {
    const normalized = normalizeAnalyticsCoverage({
      eligibleRecords: 10,
      recordsWithRequiredData: 7,
      recordsMissingRequiredData: 3,
    });
    expect(normalized.recordsMissingRequiredData).toBe(3);
  });

  it('does not derive a missing count from invalid inputs', () => {
    const normalized = normalizeAnalyticsCoverage({
      eligibleRecords: 3,
      recordsWithRequiredData: 5,
    });
    expect(normalized.recordsMissingRequiredData).toBeUndefined();
  });

  it('orders breakdowns and source dimensions deterministically', () => {
    const normalized = normalizeAnalyticsCoverage({
      eligibleRecords: 6,
      recordsWithRequiredData: 2,
      exclusions: [
        { code: 'zebra', count: 1 },
        { code: 'alpha', count: 2 },
      ],
      missingDataReasons: [
        { code: 'later', count: 3 },
        { code: 'earlier', count: 1 },
      ],
      sourceDimensions: [
        { sourceKey: 'second', eligibleRecords: 6, recordsWithRequiredData: 1 },
        { sourceKey: 'first', eligibleRecords: 6, recordsWithRequiredData: 2 },
      ],
    });
    expect(normalized.exclusions?.map((entry) => entry.code)).toEqual([
      'alpha',
      'zebra',
    ]);
    expect(normalized.missingDataReasons?.map((entry) => entry.code)).toEqual([
      'earlier',
      'later',
    ]);
    expect(
      normalized.sourceDimensions?.map((dimension) => dimension.sourceKey),
    ).toEqual(['first', 'second']);
  });

  it('never merges duplicate codes and never mutates its input', () => {
    const input: AnalyticsCoverage = Object.freeze({
      eligibleRecords: 6,
      recordsWithRequiredData: 2,
      exclusions: Object.freeze([
        Object.freeze({ code: 'dup', count: 1 }),
        Object.freeze({ code: 'dup', count: 2 }),
      ]),
    }) as AnalyticsCoverage;
    const before = JSON.stringify(input);
    const normalized = normalizeAnalyticsCoverage(input);
    expect(JSON.stringify(input)).toBe(before);
    expect(normalized.exclusions).toHaveLength(2);
    expect(normalized).not.toBe(input);
  });
});
