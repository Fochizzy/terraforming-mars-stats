/**
 * Analytical sample, denominator, and minimum-sample contracts (Phase 2,
 * Step 2.3).
 *
 * A sample is more precise than a single `sampleSize`: it records the
 * candidate population, the eligible population, the observations actually
 * included, and every exclusion. Filters are part of the sample definition;
 * comparison/highlight selection is carried only as non-sample context and
 * never changes the population by itself.
 */

import type {
  AnalyticsFilterState,
  AnalyticsSelectionState,
} from './filters';
import type { AnalyticsDatasetContext } from './scopes';
import type { AnalyticsEligibilityReason } from './eligibility';

export const ANALYTICS_OBSERVATION_UNIT_KINDS = [
  'game',
  'player',
  'player-game',
  'corporation',
  'card',
  'prelude',
  'generation',
  'metric-specific',
] as const;

export type AnalyticsObservationUnitKind =
  (typeof ANALYTICS_OBSERVATION_UNIT_KINDS)[number];

export type StandardAnalyticsObservationUnit = {
  kind: Exclude<AnalyticsObservationUnitKind, 'metric-specific'>;
};

export type MetricSpecificAnalyticsObservationUnit = {
  kind: 'metric-specific';
  /** Stable technical key such as `card-opportunity`; never a display label. */
  key: string;
};

export type AnalyticsObservationUnit =
  | StandardAnalyticsObservationUnit
  | MetricSpecificAnalyticsObservationUnit;

export function analyticsObservationUnitKey(
  unit: AnalyticsObservationUnit,
): string {
  return unit.kind === 'metric-specific' ? `metric-specific:${unit.key}` : unit.kind;
}

export const ANALYTICS_SELECTION_SAMPLE_ROLES = [
  'comparison-only',
  'highlight-only',
  'focus-only',
] as const;

export type AnalyticsSelectionSampleRole =
  (typeof ANALYTICS_SELECTION_SAMPLE_ROLES)[number];

export type AnalyticsSampleSelectionContext = {
  state: AnalyticsSelectionState;
  /** Selection is descriptive context only and cannot narrow the sample. */
  role: AnalyticsSelectionSampleRole;
};

export type AnalyticsSampleDefinition = {
  population: AnalyticsDatasetContext;
  observationUnit: AnalyticsObservationUnit;
  /** Step 2.2 normalized filters that actually narrow the sample. */
  filters: AnalyticsFilterState;
  /** Step 2.2 selection state, explicitly excluded from sample construction. */
  selectionContext?: AnalyticsSampleSelectionContext;
};

export type AnalyticsSampleCounts = {
  candidate: number;
  eligible: number;
  included: number;
  excluded: number;
};

export const ANALYTICS_SAMPLE_EXCLUSION_STAGES = [
  'eligibility',
  'inclusion',
] as const;

export type AnalyticsSampleExclusionStage =
  (typeof ANALYTICS_SAMPLE_EXCLUSION_STAGES)[number];

export type AnalyticsSampleExclusion = {
  stage: AnalyticsSampleExclusionStage;
  reason: AnalyticsEligibilityReason;
  count: number;
};

export const ANALYTICS_DENOMINATOR_KINDS = [
  'not-applicable',
  'observation-count',
  'metric-value',
] as const;

export type AnalyticsDenominatorKind =
  (typeof ANALYTICS_DENOMINATOR_KINDS)[number];

export const ANALYTICS_OBSERVATION_DENOMINATOR_SOURCES = [
  'candidate',
  'eligible',
  'included',
  'available',
] as const;

export type AnalyticsObservationDenominatorSource =
  (typeof ANALYTICS_OBSERVATION_DENOMINATOR_SOURCES)[number];

export type AnalyticsDenominator =
  | { kind: 'not-applicable' }
  | {
      kind: 'observation-count';
      source: AnalyticsObservationDenominatorSource;
      value: number;
      observationUnit: AnalyticsObservationUnit;
    }
  | {
      kind: 'metric-value';
      /** Stable identity of the denominator metric; never a display label. */
      metricId: string;
      value: number;
      /** Stable unit code. Presentation chooses the label and formatting. */
      unitCode: string;
    };

export type AnalyticsSample = {
  definition: AnalyticsSampleDefinition;
  counts: AnalyticsSampleCounts;
  exclusions: readonly AnalyticsSampleExclusion[];
  denominator: AnalyticsDenominator;
};

function isCount(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0;
}

/** Builds reconciled counts without silently accepting impossible samples. */
export function buildAnalyticsSampleCounts(input: {
  candidate: number;
  eligible: number;
  included: number;
}): AnalyticsSampleCounts {
  if (![input.candidate, input.eligible, input.included].every(isCount)) {
    throw new Error('Analytics sample counts must be nonnegative finite integers');
  }
  if (input.eligible > input.candidate) {
    throw new Error('Eligible observations cannot exceed candidate observations');
  }
  if (input.included > input.eligible) {
    throw new Error('Included observations cannot exceed eligible observations');
  }
  return {
    ...input,
    excluded: input.candidate - input.included,
  };
}

/**
 * Returns only the fields that define the sample. Selection context is
 * deliberately omitted, proving that highlight/comparison state cannot alter
 * the population unless it was first expressed as a real Step 2.2 filter.
 */
export function analyticsSampleBasis(definition: AnalyticsSampleDefinition) {
  return {
    population: definition.population,
    observationUnit: definition.observationUnit,
    filters: definition.filters,
  };
}

export const ANALYTICS_MINIMUM_SAMPLE_POLICY_KINDS = [
  'none',
  'metric-specific',
  'caller-provided',
] as const;

export type AnalyticsMinimumSamplePolicy =
  | { kind: 'none' }
  | { kind: 'metric-specific'; threshold: number; policyRef: string }
  | { kind: 'caller-provided'; threshold: number };

export const ANALYTICS_MINIMUM_SAMPLE_STATUSES = [
  'no-threshold',
  'met',
  'not-met',
  'cannot-evaluate',
  'insufficient-evidence',
] as const;

export type AnalyticsMinimumSampleStatus =
  (typeof ANALYTICS_MINIMUM_SAMPLE_STATUSES)[number];

export type AnalyticsMinimumSampleReason = {
  code: 'sample-count-unavailable' | 'documented-insufficient-evidence';
  explanation: string;
};

export type AnalyticsMinimumSampleEvaluation =
  | { status: 'no-threshold'; policy: { kind: 'none' } }
  | {
      status: 'met' | 'not-met';
      policy: Exclude<AnalyticsMinimumSamplePolicy, { kind: 'none' }>;
      sampleCount: number;
      threshold: number;
    }
  | {
      status: 'cannot-evaluate';
      policy: Exclude<AnalyticsMinimumSamplePolicy, { kind: 'none' }>;
      reason: AnalyticsMinimumSampleReason;
    }
  | {
      status: 'insufficient-evidence';
      policy: AnalyticsMinimumSamplePolicy;
      reason: AnalyticsMinimumSampleReason;
    };

export function evaluateAnalyticsMinimumSample(input: {
  policy: AnalyticsMinimumSamplePolicy;
  sampleCount: number | null;
  insufficientEvidence?: AnalyticsMinimumSampleReason;
}): AnalyticsMinimumSampleEvaluation {
  if (input.insufficientEvidence !== undefined) {
    return {
      status: 'insufficient-evidence',
      policy: input.policy,
      reason: input.insufficientEvidence,
    };
  }
  if (input.policy.kind === 'none') {
    return { status: 'no-threshold', policy: input.policy };
  }
  if (input.sampleCount === null || !isCount(input.sampleCount)) {
    return {
      status: 'cannot-evaluate',
      policy: input.policy,
      reason: {
        code: 'sample-count-unavailable',
        explanation: 'The included observation count is not available',
      },
    };
  }
  return {
    status:
      input.sampleCount >= input.policy.threshold ? 'met' : 'not-met',
    policy: input.policy,
    sampleCount: input.sampleCount,
    threshold: input.policy.threshold,
  };
}

export const ANALYTICS_SAMPLE_ISSUE_CODES = [
  'invalid-count',
  'eligible-exceeds-candidate',
  'included-exceeds-eligible',
  'excluded-count-mismatch',
  'exclusion-breakdown-mismatch',
  'missing-exclusion-breakdown',
  'blank-metric-specific-unit',
  'blank-denominator-metric-id',
  'blank-denominator-unit',
  'invalid-denominator',
  'denominator-count-mismatch',
  'invalid-minimum-sample-threshold',
  'blank-minimum-sample-policy-ref',
] as const;

export type AnalyticsSampleIssueCode =
  (typeof ANALYTICS_SAMPLE_ISSUE_CODES)[number];

export type AnalyticsSampleIssue = {
  code: AnalyticsSampleIssueCode;
  message: string;
  path?: string;
};

function countIssue(value: number, path: string): AnalyticsSampleIssue[] {
  return isCount(value)
    ? []
    : [{ code: 'invalid-count', message: `${path} must be a nonnegative integer`, path }];
}

export function validateAnalyticsMinimumSamplePolicy(
  policy: AnalyticsMinimumSamplePolicy,
): readonly AnalyticsSampleIssue[] {
  if (policy.kind === 'none') return [];
  const issues: AnalyticsSampleIssue[] = [];
  if (!isCount(policy.threshold)) {
    issues.push({
      code: 'invalid-minimum-sample-threshold',
      message: 'Minimum-sample threshold must be a nonnegative integer',
      path: 'threshold',
    });
  }
  if (policy.kind === 'metric-specific' && policy.policyRef.trim() === '') {
    issues.push({
      code: 'blank-minimum-sample-policy-ref',
      message: 'A metric-specific threshold must reference its approved policy',
      path: 'policyRef',
    });
  }
  return issues;
}

export function validateAnalyticsSample(
  sample: AnalyticsSample,
): readonly AnalyticsSampleIssue[] {
  const issues: AnalyticsSampleIssue[] = [];
  const { counts } = sample;
  (['candidate', 'eligible', 'included', 'excluded'] as const).forEach((key) => {
    issues.push(...countIssue(counts[key], `counts.${key}`));
  });
  if (isCount(counts.candidate) && isCount(counts.eligible) && counts.eligible > counts.candidate) {
    issues.push({
      code: 'eligible-exceeds-candidate',
      message: 'Eligible observations cannot exceed candidate observations',
      path: 'counts.eligible',
    });
  }
  if (isCount(counts.eligible) && isCount(counts.included) && counts.included > counts.eligible) {
    issues.push({
      code: 'included-exceeds-eligible',
      message: 'Included observations cannot exceed eligible observations',
      path: 'counts.included',
    });
  }
  if (
    isCount(counts.candidate) &&
    isCount(counts.included) &&
    isCount(counts.excluded) &&
    counts.excluded !== counts.candidate - counts.included
  ) {
    issues.push({
      code: 'excluded-count-mismatch',
      message: 'Excluded observations must equal candidate minus included observations',
      path: 'counts.excluded',
    });
  }

  const exclusionTotal = sample.exclusions.reduce((total, exclusion, index) => {
    issues.push(...countIssue(exclusion.count, `exclusions[${index}].count`));
    return total + exclusion.count;
  }, 0);
  if (counts.excluded > 0 && sample.exclusions.length === 0) {
    issues.push({
      code: 'missing-exclusion-breakdown',
      message: 'Excluded observations require structured exclusion reasons',
      path: 'exclusions',
    });
  } else if (isCount(counts.excluded) && exclusionTotal !== counts.excluded) {
    issues.push({
      code: 'exclusion-breakdown-mismatch',
      message: 'Exclusion reason counts must add up to the excluded count',
      path: 'exclusions',
    });
  }

  if (
    sample.definition.observationUnit.kind === 'metric-specific' &&
    sample.definition.observationUnit.key.trim() === ''
  ) {
    issues.push({
      code: 'blank-metric-specific-unit',
      message: 'A metric-specific observation unit requires a stable key',
      path: 'definition.observationUnit.key',
    });
  }

  const denominator = sample.denominator;
  if (denominator.kind !== 'not-applicable') {
    if (!Number.isFinite(denominator.value) || denominator.value < 0) {
      issues.push({
        code: 'invalid-denominator',
        message: 'Denominator must be a finite nonnegative value',
        path: 'denominator.value',
      });
    }
  }
  if (denominator.kind === 'metric-value') {
    if (denominator.metricId.trim() === '') {
      issues.push({
        code: 'blank-denominator-metric-id',
        message: 'Metric-value denominator requires a stable metric ID',
        path: 'denominator.metricId',
      });
    }
    if (denominator.unitCode.trim() === '') {
      issues.push({
        code: 'blank-denominator-unit',
        message: 'Metric-value denominator requires a stable unit code',
        path: 'denominator.unitCode',
      });
    }
  }
  if (denominator.kind === 'observation-count' && denominator.source !== 'available') {
    const expected = counts[denominator.source];
    if (denominator.value !== expected) {
      issues.push({
        code: 'denominator-count-mismatch',
        message: `Denominator does not match the ${denominator.source} observation count`,
        path: 'denominator.value',
      });
    }
  }
  return issues;
}

/** Deterministically orders exclusions without mutating the caller's sample. */
export function normalizeAnalyticsSample(sample: AnalyticsSample): AnalyticsSample {
  return {
    ...sample,
    exclusions: [...sample.exclusions].sort((left, right) => {
      const leftKey = `${left.stage}:${left.reason.code}`;
      const rightKey = `${right.stage}:${right.reason.code}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    }),
  };
}
