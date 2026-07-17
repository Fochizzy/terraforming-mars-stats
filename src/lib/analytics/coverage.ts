/**
 * Structural coverage contracts (Phase 2, Step 2.1).
 *
 * Coverage records how much of an eligible population actually carries the
 * data a capability needs. It is structural and generic: counts, ratios, and
 * statuses only. No universal low-coverage or low-sample threshold exists
 * here — threshold interpretation is Step 2.3 work — and the canonical
 * exclusion/missing-reason vocabulary is also registered in Step 2.3, so
 * breakdown entries carry stable caller-supplied codes for now.
 *
 * Zero coverage with a positive eligible denominator is a real observation
 * (`none`, ratio `0`). A non-positive or missing denominator is not `0%`: the
 * ratio is `null` and the status is `no-eligible-records`.
 */

import type { CoverageObservation } from '@/lib/metrics/metric-value';
import {
  isAnalyticsCapabilityExecutable,
  type NonExecutableAnalyticsCapability,
} from './capabilities';

/** A count of records attributed to one stable reason code. */
export type AnalyticsCoverageBreakdownEntry = {
  /**
   * Stable machine-readable reason code. Step 2.3 registers the canonical
   * exclusion and missing-data vocabularies; until then callers supply their
   * own stable codes.
   */
  code: string;
  count: number;
  /** Optional human-readable description; never identity. */
  description?: string;
};

/**
 * Coverage of one source dimension (for example one opportunity source of a
 * future Cards Seen capability). "Some events recorded" is not full event
 * coverage, so each dimension carries its own eligible/covered counts.
 */
export type AnalyticsSourceCoverage = {
  /** Stable source-dimension key. */
  sourceKey: string;
  /** Eligible records for which this source could have been recorded. */
  eligibleRecords: number;
  /** Eligible records where this source was actually recorded. */
  recordsWithRequiredData: number;
  /** Optional human-readable label; never identity. */
  label?: string;
};

/**
 * Structural coverage ledger. `consideredRecords` (when present) counts the
 * population before eligibility; `eligibleRecords` splits into records with
 * and without the required data.
 */
export type AnalyticsCoverage = {
  /** Records eligible for the capability after eligibility rules. */
  eligibleRecords: number;
  /** Eligible records that carry the required data. */
  recordsWithRequiredData: number;
  /**
   * Eligible records missing required data. When present it must equal
   * `eligibleRecords - recordsWithRequiredData`.
   */
  recordsMissingRequiredData?: number;
  /** Total records considered before eligibility, when known. */
  consideredRecords?: number;
  /**
   * Eligible records for which the underlying source/capability was available,
   * when source availability was measured independently from recording.
   */
  availableRecords?: number;
  /** Eligible records for which the source/capability was unavailable. */
  unavailableRecords?: number;
  /** Records excluded before eligibility, by stable reason code. */
  exclusions?: readonly AnalyticsCoverageBreakdownEntry[];
  /** Missing-data reasons for eligible records without required data. */
  missingDataReasons?: readonly AnalyticsCoverageBreakdownEntry[];
  /** Source-dimensional coverage for source-specific partial data. */
  sourceDimensions?: readonly AnalyticsSourceCoverage[];
};

/** The minimal counts every ratio/status helper needs. */
export type AnalyticsCoverageCounts = Pick<
  AnalyticsCoverage,
  'eligibleRecords' | 'recordsWithRequiredData'
>;

export const ANALYTICS_COVERAGE_STATUSES = [
  'complete',
  'partial',
  'none',
  'no-eligible-records',
  'invalid',
] as const;

export type AnalyticsCoverageStatus =
  (typeof ANALYTICS_COVERAGE_STATUSES)[number];

function isCount(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

function areCoverageCountsValid(counts: AnalyticsCoverageCounts): boolean {
  return (
    isCount(counts.eligibleRecords) &&
    isCount(counts.recordsWithRequiredData) &&
    counts.recordsWithRequiredData <= counts.eligibleRecords
  );
}

/**
 * Coverage fraction in `[0, 1]`, or `null` when the denominator is not a
 * positive valid count. `null` means "no displayable percentage", never `0%`.
 */
export function analyticsCoverageRatio(
  counts: AnalyticsCoverageCounts,
): number | null {
  if (!areCoverageCountsValid(counts) || counts.eligibleRecords === 0) {
    return null;
  }
  return counts.recordsWithRequiredData / counts.eligibleRecords;
}

/** Structural coverage status; interpretation thresholds are Step 2.3 work. */
export function analyticsCoverageStatus(
  counts: AnalyticsCoverageCounts,
): AnalyticsCoverageStatus {
  if (!areCoverageCountsValid(counts)) {
    return 'invalid';
  }
  if (counts.eligibleRecords === 0) {
    return 'no-eligible-records';
  }
  if (counts.recordsWithRequiredData === 0) {
    return 'none';
  }
  if (counts.recordsWithRequiredData === counts.eligibleRecords) {
    return 'complete';
  }
  return 'partial';
}

/**
 * Adapter to the Phase 1 {@link CoverageObservation} shape so shared
 * presentation primitives can render the same counts without a second model.
 */
export function toCoverageObservation(
  counts: AnalyticsCoverageCounts,
): CoverageObservation {
  return {
    covered: counts.recordsWithRequiredData,
    total: counts.eligibleRecords,
  };
}

export const ANALYTICS_COVERAGE_ISSUE_CODES = [
  'negative-count',
  'non-integer-count',
  'covered-exceeds-eligible',
  'missing-count-mismatch',
  'considered-below-eligible',
  'availability-count-mismatch',
  'covered-exceeds-available',
  'blank-breakdown-code',
  'duplicate-breakdown-code',
  'blank-source-key',
  'duplicate-source-key',
] as const;

export type AnalyticsCoverageIssueCode =
  (typeof ANALYTICS_COVERAGE_ISSUE_CODES)[number];

export type AnalyticsCoverageIssue = {
  code: AnalyticsCoverageIssueCode;
  message: string;
  path?: string;
};

function countIssues(value: number, path: string): AnalyticsCoverageIssue[] {
  const issues: AnalyticsCoverageIssue[] = [];
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    issues.push({
      code: 'non-integer-count',
      message: `"${path}" must be a finite integer`,
      path,
    });
    return issues;
  }
  if (value < 0) {
    issues.push({
      code: 'negative-count',
      message: `"${path}" must not be negative`,
      path,
    });
  }
  return issues;
}

function breakdownIssues(
  entries: readonly AnalyticsCoverageBreakdownEntry[],
  path: string,
): AnalyticsCoverageIssue[] {
  const issues: AnalyticsCoverageIssue[] = [];
  const seenCodes = new Set<string>();
  entries.forEach((entry, index) => {
    const entryPath = `${path}[${index}]`;
    if (entry.code.trim() === '') {
      issues.push({
        code: 'blank-breakdown-code',
        message: `"${entryPath}.code" must not be blank`,
        path: `${entryPath}.code`,
      });
    } else if (seenCodes.has(entry.code)) {
      issues.push({
        code: 'duplicate-breakdown-code',
        message: `Reason code "${entry.code}" appears more than once in "${path}"`,
        path: entryPath,
      });
    } else {
      seenCodes.add(entry.code);
    }
    issues.push(...countIssues(entry.count, `${entryPath}.count`));
  });
  return issues;
}

/**
 * Structural validation of a coverage ledger. Returns an empty array when the
 * ledger is internally consistent.
 */
export function validateAnalyticsCoverage(
  coverage: AnalyticsCoverage,
): readonly AnalyticsCoverageIssue[] {
  const issues: AnalyticsCoverageIssue[] = [];

  issues.push(...countIssues(coverage.eligibleRecords, 'eligibleRecords'));
  issues.push(
    ...countIssues(coverage.recordsWithRequiredData, 'recordsWithRequiredData'),
  );
  if (
    isCount(coverage.eligibleRecords) &&
    isCount(coverage.recordsWithRequiredData) &&
    coverage.recordsWithRequiredData > coverage.eligibleRecords
  ) {
    issues.push({
      code: 'covered-exceeds-eligible',
      message:
        'recordsWithRequiredData must not exceed eligibleRecords',
      path: 'recordsWithRequiredData',
    });
  }

  if (coverage.recordsMissingRequiredData !== undefined) {
    issues.push(
      ...countIssues(
        coverage.recordsMissingRequiredData,
        'recordsMissingRequiredData',
      ),
    );
    if (
      isCount(coverage.eligibleRecords) &&
      isCount(coverage.recordsWithRequiredData) &&
      isCount(coverage.recordsMissingRequiredData) &&
      coverage.recordsMissingRequiredData !==
        coverage.eligibleRecords - coverage.recordsWithRequiredData
    ) {
      issues.push({
        code: 'missing-count-mismatch',
        message:
          'recordsMissingRequiredData must equal eligibleRecords - recordsWithRequiredData',
        path: 'recordsMissingRequiredData',
      });
    }
  }

  if (coverage.consideredRecords !== undefined) {
    issues.push(
      ...countIssues(coverage.consideredRecords, 'consideredRecords'),
    );
    if (
      isCount(coverage.consideredRecords) &&
      isCount(coverage.eligibleRecords) &&
      coverage.consideredRecords < coverage.eligibleRecords
    ) {
      issues.push({
        code: 'considered-below-eligible',
        message: 'consideredRecords must not be below eligibleRecords',
        path: 'consideredRecords',
      });
    }
  }

  if (coverage.availableRecords !== undefined) {
    issues.push(...countIssues(coverage.availableRecords, 'availableRecords'));
  }
  if (coverage.unavailableRecords !== undefined) {
    issues.push(
      ...countIssues(coverage.unavailableRecords, 'unavailableRecords'),
    );
  }
  if (
    coverage.availableRecords !== undefined &&
    coverage.unavailableRecords !== undefined &&
    isCount(coverage.availableRecords) &&
    isCount(coverage.unavailableRecords) &&
    isCount(coverage.eligibleRecords) &&
    coverage.availableRecords + coverage.unavailableRecords !==
      coverage.eligibleRecords
  ) {
    issues.push({
      code: 'availability-count-mismatch',
      message:
        'availableRecords + unavailableRecords must equal eligibleRecords',
      path: 'availableRecords',
    });
  }
  if (
    coverage.availableRecords !== undefined &&
    isCount(coverage.availableRecords) &&
    isCount(coverage.recordsWithRequiredData) &&
    coverage.recordsWithRequiredData > coverage.availableRecords
  ) {
    issues.push({
      code: 'covered-exceeds-available',
      message: 'recordsWithRequiredData must not exceed availableRecords',
      path: 'recordsWithRequiredData',
    });
  }

  if (coverage.exclusions !== undefined) {
    issues.push(...breakdownIssues(coverage.exclusions, 'exclusions'));
  }
  if (coverage.missingDataReasons !== undefined) {
    issues.push(
      ...breakdownIssues(coverage.missingDataReasons, 'missingDataReasons'),
    );
  }

  if (coverage.sourceDimensions !== undefined) {
    const seenSourceKeys = new Set<string>();
    coverage.sourceDimensions.forEach((dimension, index) => {
      const dimensionPath = `sourceDimensions[${index}]`;
      if (dimension.sourceKey.trim() === '') {
        issues.push({
          code: 'blank-source-key',
          message: `"${dimensionPath}.sourceKey" must not be blank`,
          path: `${dimensionPath}.sourceKey`,
        });
      } else if (seenSourceKeys.has(dimension.sourceKey)) {
        issues.push({
          code: 'duplicate-source-key',
          message: `Source key "${dimension.sourceKey}" appears more than once`,
          path: dimensionPath,
        });
      } else {
        seenSourceKeys.add(dimension.sourceKey);
      }
      issues.push(
        ...countIssues(
          dimension.eligibleRecords,
          `${dimensionPath}.eligibleRecords`,
        ),
      );
      issues.push(
        ...countIssues(
          dimension.recordsWithRequiredData,
          `${dimensionPath}.recordsWithRequiredData`,
        ),
      );
      if (
        isCount(dimension.eligibleRecords) &&
        isCount(dimension.recordsWithRequiredData) &&
        dimension.recordsWithRequiredData > dimension.eligibleRecords
      ) {
        issues.push({
          code: 'covered-exceeds-eligible',
          message: `"${dimensionPath}" covered count must not exceed its eligible count`,
          path: `${dimensionPath}.recordsWithRequiredData`,
        });
      }
    });
  }

  return issues;
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Deterministic canonical form of a coverage ledger: fills in
 * `recordsMissingRequiredData` when derivable, and orders breakdown entries
 * and source dimensions by their stable codes/keys using plain code-unit
 * comparison (locale-independent). Pure — the input is never mutated, and
 * duplicates are never silently merged (validation reports them instead).
 */
export function normalizeAnalyticsCoverage(
  coverage: AnalyticsCoverage,
): AnalyticsCoverage {
  const normalized: AnalyticsCoverage = {
    ...coverage,
    ...(coverage.recordsMissingRequiredData === undefined &&
    isCount(coverage.eligibleRecords) &&
    isCount(coverage.recordsWithRequiredData) &&
    coverage.recordsWithRequiredData <= coverage.eligibleRecords
      ? {
          recordsMissingRequiredData:
            coverage.eligibleRecords - coverage.recordsWithRequiredData,
        }
      : {}),
    ...(coverage.exclusions === undefined
      ? {}
      : {
          exclusions: [...coverage.exclusions].sort((a, b) =>
            compareStrings(a.code, b.code),
          ),
        }),
    ...(coverage.missingDataReasons === undefined
      ? {}
      : {
          missingDataReasons: [...coverage.missingDataReasons].sort((a, b) =>
            compareStrings(a.code, b.code),
          ),
        }),
    ...(coverage.sourceDimensions === undefined
      ? {}
      : {
          sourceDimensions: [...coverage.sourceDimensions].sort((a, b) =>
            compareStrings(a.sourceKey, b.sourceKey),
          ),
        }),
  };
  return normalized;
}

export const ANALYTICS_COVERAGE_UNKNOWN_REASON_CODES = [
  'coverage-not-measured',
  'population-unverified',
  'source-coverage-unverified',
] as const;

export type AnalyticsCoverageUnknownReasonCode =
  (typeof ANALYTICS_COVERAGE_UNKNOWN_REASON_CODES)[number];

export type AnalyticsCoverageUnknownReason = {
  code: AnalyticsCoverageUnknownReasonCode;
  explanation: string;
};

export const ANALYTICS_COVERAGE_EVALUATION_STATUSES = [
  'complete',
  'partial',
  'none',
  'no-eligible-records',
  'unknown',
  'capability-unavailable',
  'invalid',
] as const;

export type MeasuredAnalyticsCoverageEvaluation = {
  status: Exclude<
    AnalyticsCoverageStatus,
    'invalid'
  >;
  coverage: AnalyticsCoverage;
  /** Numeric ratio for measured positive denominators; otherwise `null`. */
  ratio: number | null;
};

export type AnalyticsCoverageEvaluation =
  | MeasuredAnalyticsCoverageEvaluation
  | {
      status: 'unknown';
      reason: AnalyticsCoverageUnknownReason;
    }
  | {
      status: 'capability-unavailable';
      capability: NonExecutableAnalyticsCapability;
    }
  | {
      status: 'invalid';
      coverage: AnalyticsCoverage;
      issues: readonly AnalyticsCoverageIssue[];
    };

/**
 * Converts a measured ledger into a state. Invalid count combinations remain
 * explicitly invalid; they are never normalized into a plausible percentage.
 */
export function evaluateAnalyticsCoverage(
  coverage: AnalyticsCoverage,
): AnalyticsCoverageEvaluation {
  const normalized = normalizeAnalyticsCoverage(coverage);
  const issues = validateAnalyticsCoverage(normalized);
  if (issues.length > 0) {
    return { status: 'invalid', coverage: normalized, issues };
  }
  const status = analyticsCoverageStatus(normalized);
  if (status === 'invalid') {
    return {
      status: 'invalid',
      coverage: normalized,
      issues: [
        {
          code: 'covered-exceeds-eligible',
          message: 'Coverage counts are internally inconsistent',
        },
      ],
    };
  }
  return {
    status,
    coverage: normalized,
    ratio: analyticsCoverageRatio(normalized),
  };
}

export function unknownAnalyticsCoverage(
  reason: AnalyticsCoverageUnknownReason,
): AnalyticsCoverageEvaluation {
  return { status: 'unknown', reason };
}

export function capabilityUnavailableAnalyticsCoverage(
  capability: NonExecutableAnalyticsCapability,
): AnalyticsCoverageEvaluation {
  if (isAnalyticsCapabilityExecutable(capability)) {
    throw new Error(
      'An executable capability cannot make coverage capability-unavailable',
    );
  }
  return { status: 'capability-unavailable', capability };
}
