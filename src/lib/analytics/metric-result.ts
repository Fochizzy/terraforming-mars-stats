/**
 * Complete metric result contracts (Phase 2, Step 2.3).
 *
 * This module composes the Phase 2 contracts without performing a metric
 * formula or query. It keeps loading, load failure, unavailable capability,
 * insufficient evidence, and ready values distinct so later repositories and
 * presentation code cannot collapse missing data into zero.
 */

import type { MetricValue } from '@/lib/metrics/metric-value';
import {
  isAnalyticsCapabilityExecutable,
  type AnalyticsCapabilityResult,
  type NonExecutableAnalyticsCapability,
} from './capabilities';
import type { AnalyticsScopeType } from './scopes';
import {
  type AnalyticsCoverageEvaluation,
} from './coverage';
import {
  validateAnalyticsEligibilityResult,
  type AnalyticsEligibilityResult,
} from './eligibility';
import {
  validateAnalyticsEvidence,
  type AnalyticsCalculationVersion,
  type AnalyticsEvidence,
} from './evidence';
import {
  isRateLikeMetricValueKind,
  validateAnalyticsMetricDefinition,
  type AnalyticsMetricDefinition,
  type AnalyticsMetricDefinitionIssue,
} from './metric-contracts';
import {
  evaluateAnalyticsMinimumSample,
  validateAnalyticsSample,
  type AnalyticsMinimumSampleEvaluation,
  type AnalyticsSample,
  type AnalyticsSampleIssue,
} from './sample';
import type {
  AnalyticsLoadError,
  AnalyticsResultWarning,
} from './value-availability';

export const ANALYTICS_METRIC_RESULT_STATUSES = [
  'loading',
  'load-error',
  'capability-unavailable',
  'insufficient-evidence',
  'ready',
] as const;

export type AnalyticsMetricResultStatus =
  (typeof ANALYTICS_METRIC_RESULT_STATUSES)[number];

export type AnalyticsMetricQueryMetadata = {
  /** Stable query/cache key chosen by the caller. */
  key?: string;
  /** ISO timestamp for request start, when known. */
  requestedAt?: string;
  /** ISO timestamp for request completion, when known. */
  completedAt?: string;
};

export type AnalyticsMetricResultBase = {
  definition: AnalyticsMetricDefinition;
  /** Route-owned scope type from Step 2.1. */
  scope: AnalyticsScopeType;
  query?: AnalyticsMetricQueryMetadata;
};

export type LoadingAnalyticsMetricResult = AnalyticsMetricResultBase & {
  status: 'loading';
};

export type LoadErrorAnalyticsMetricResult = AnalyticsMetricResultBase & {
  status: 'load-error';
  error: AnalyticsLoadError;
};

export type CapabilityUnavailableAnalyticsMetricResult =
  AnalyticsMetricResultBase & {
    status: 'capability-unavailable';
    capability: NonExecutableAnalyticsCapability;
    evidence?: AnalyticsEvidence;
    warnings?: readonly AnalyticsResultWarning[];
  };

export const ANALYTICS_METRIC_INSUFFICIENT_EVIDENCE_REASON_CODES = [
  'minimum-sample-not-met',
  'sample-unavailable',
  'coverage-unknown',
  'capability-insufficient-evidence',
  'eligibility-indeterminate',
  'metric-requirement-not-met',
] as const;

export type AnalyticsMetricInsufficientEvidenceReasonCode =
  (typeof ANALYTICS_METRIC_INSUFFICIENT_EVIDENCE_REASON_CODES)[number];

export type AnalyticsMetricInsufficientEvidenceReason = {
  code: AnalyticsMetricInsufficientEvidenceReasonCode;
  explanation: string;
  requirementKey?: string;
};

export type InsufficientEvidenceAnalyticsMetricResult =
  AnalyticsMetricResultBase & {
    status: 'insufficient-evidence';
    reason: AnalyticsMetricInsufficientEvidenceReason;
    sample?: AnalyticsSample;
    coverage?: AnalyticsCoverageEvaluation;
    eligibility?: AnalyticsEligibilityResult;
    minimumSample?: AnalyticsMinimumSampleEvaluation;
    capabilities?: readonly AnalyticsCapabilityResult[];
    evidence?: AnalyticsEvidence;
    calculationVersion?: AnalyticsCalculationVersion;
    warnings?: readonly AnalyticsResultWarning[];
  };

export type ReadyAnalyticsMetricResult = AnalyticsMetricResultBase & {
  status: 'ready';
  value: MetricValue;
  sample: AnalyticsSample;
  coverage: AnalyticsCoverageEvaluation;
  eligibility: AnalyticsEligibilityResult;
  minimumSample: AnalyticsMinimumSampleEvaluation;
  capabilities: readonly AnalyticsCapabilityResult[];
  evidence?: AnalyticsEvidence;
  calculationVersion?: AnalyticsCalculationVersion;
  warnings?: readonly AnalyticsResultWarning[];
};

export type AnalyticsMetricResult =
  | LoadingAnalyticsMetricResult
  | LoadErrorAnalyticsMetricResult
  | CapabilityUnavailableAnalyticsMetricResult
  | InsufficientEvidenceAnalyticsMetricResult
  | ReadyAnalyticsMetricResult;

export const ANALYTICS_METRIC_RESULT_ISSUE_CODES = [
  'metric-definition-invalid',
  'scope-unsupported-by-definition',
  'sample-invalid',
  'coverage-invalid',
  'eligibility-invalid',
  'observed-value-not-finite',
  'partial-value-not-finite',
  'explicit-zero-not-allowed',
  'observed-value-without-required-sample',
  'partial-value-disallowed',
  'partial-value-without-partial-coverage',
  'unavailable-value-missing-reason',
  'required-capability-missing',
  'required-capability-non-executable',
  'required-capability-status-not-accepted',
  'capability-unavailable-executable',
  'eligible-with-unavailable-required-capability',
  'rate-denominator-zero',
  'required-provenance-missing',
  'evidence-invalid',
  'load-error-blank-message',
  'insufficient-evidence-blank-reason',
  'minimum-sample-mismatch',
] as const;

export type AnalyticsMetricResultIssueCode =
  (typeof ANALYTICS_METRIC_RESULT_ISSUE_CODES)[number];

export type AnalyticsMetricResultIssue = {
  code: AnalyticsMetricResultIssueCode;
  message: string;
  path?: string;
  details?:
    | readonly AnalyticsMetricDefinitionIssue[]
    | readonly AnalyticsSampleIssue[];
};

function resultIssue(
  code: AnalyticsMetricResultIssueCode,
  message: string,
  path?: string,
): AnalyticsMetricResultIssue {
  return path === undefined ? { code, message } : { code, message, path };
}

function collectBaseIssues(
  result: AnalyticsMetricResult,
): AnalyticsMetricResultIssue[] {
  const issues: AnalyticsMetricResultIssue[] = [];
  const definitionIssues = validateAnalyticsMetricDefinition(result.definition);
  if (definitionIssues.length > 0) {
    issues.push({
      code: 'metric-definition-invalid',
      message: 'Metric definition is not internally consistent',
      path: 'definition',
      details: definitionIssues,
    });
  }
  if (!result.definition.supportedScopes.includes(result.scope)) {
    issues.push(
      resultIssue(
        'scope-unsupported-by-definition',
        `Metric definition does not support the ${result.scope} scope`,
        'scope',
      ),
    );
  }
  return issues;
}

function collectEvidenceIssues(input: {
  definition: AnalyticsMetricDefinition;
  evidence?: AnalyticsEvidence;
}): AnalyticsMetricResultIssue[] {
  const issues: AnalyticsMetricResultIssue[] = [];
  if (input.definition.provenance === 'required' && input.evidence === undefined) {
    issues.push(
      resultIssue(
        'required-provenance-missing',
        'Metric definition requires evidence provenance',
        'evidence',
      ),
    );
  }
  if (input.evidence !== undefined) {
    const evidenceIssues = validateAnalyticsEvidence(input.evidence);
    if (evidenceIssues.length > 0) {
      issues.push(
        resultIssue(
          'evidence-invalid',
          'Metric evidence provenance is not internally consistent',
          'evidence',
        ),
      );
    }
  }
  return issues;
}

function collectSampleIssues(sample: AnalyticsSample): AnalyticsMetricResultIssue[] {
  const sampleIssues = validateAnalyticsSample(sample);
  return sampleIssues.length === 0
    ? []
    : [
        {
          code: 'sample-invalid',
          message: 'Metric sample is not internally consistent',
          path: 'sample',
          details: sampleIssues,
        },
      ];
}

function collectCoverageIssues(
  coverage: AnalyticsCoverageEvaluation,
): AnalyticsMetricResultIssue[] {
  return coverage.status === 'invalid'
    ? [
        resultIssue(
          'coverage-invalid',
          'Metric coverage is not internally consistent',
          'coverage',
        ),
      ]
    : [];
}

function collectEligibilityIssues(
  eligibility: AnalyticsEligibilityResult,
): AnalyticsMetricResultIssue[] {
  const issues = validateAnalyticsEligibilityResult(eligibility);
  return issues.length === 0
    ? []
    : [
        resultIssue(
          'eligibility-invalid',
          'Metric eligibility result is not internally consistent',
          'eligibility',
        ),
      ];
}

function sameMinimumSampleEvaluation(
  expected: AnalyticsMinimumSampleEvaluation,
  actual: AnalyticsMinimumSampleEvaluation,
): boolean {
  if (expected.status !== actual.status) return false;
  if ('threshold' in expected || 'threshold' in actual) {
    return (
      'threshold' in expected &&
      'threshold' in actual &&
      expected.threshold === actual.threshold &&
      expected.sampleCount === actual.sampleCount
    );
  }
  return true;
}

function collectMinimumSampleIssues(
  result: ReadyAnalyticsMetricResult,
): AnalyticsMetricResultIssue[] {
  if (result.minimumSample.status === 'insufficient-evidence') return [];
  const expected = evaluateAnalyticsMinimumSample({
    policy: result.definition.minimumSamplePolicy,
    sampleCount: result.sample.counts.included,
  });
  return sameMinimumSampleEvaluation(expected, result.minimumSample)
    ? []
    : [
        resultIssue(
          'minimum-sample-mismatch',
          'Minimum-sample evaluation must match the metric policy and included observation count',
          'minimumSample',
        ),
      ];
}

function collectCapabilityIssues(
  result: ReadyAnalyticsMetricResult,
): AnalyticsMetricResultIssue[] {
  const issues: AnalyticsMetricResultIssue[] = [];
  const actualByKey = new Map(
    result.capabilities.map((capability) => [capability.key, capability]),
  );

  result.definition.capabilityRequirements.forEach((requirement, index) => {
    if (requirement.necessity !== 'required') return;
    const capability = actualByKey.get(requirement.capabilityKey);
    const path = `capabilities[${index}]`;
    if (capability === undefined) {
      issues.push(
        resultIssue(
          'required-capability-missing',
          `Required capability "${requirement.capabilityKey}" is missing from the result`,
          path,
        ),
      );
      return;
    }

    const acceptedStatuses = requirement.acceptedStatuses ?? [
      'supported',
      'partially-supported',
    ];
    if (!acceptedStatuses.includes(capability.status)) {
      issues.push(
        resultIssue(
          'required-capability-status-not-accepted',
          `Required capability "${requirement.capabilityKey}" has status "${capability.status}"`,
          path,
        ),
      );
    }
    if (!isAnalyticsCapabilityExecutable(capability)) {
      issues.push(
        resultIssue(
          'required-capability-non-executable',
          `Required capability "${requirement.capabilityKey}" is not executable`,
          path,
        ),
      );
      if (result.eligibility.status === 'eligible') {
        issues.push(
          resultIssue(
            'eligible-with-unavailable-required-capability',
            'Eligibility cannot be eligible while a required capability is unavailable',
            'eligibility',
          ),
        );
      }
    }
  });

  return issues;
}

function collectValueIssues(
  result: ReadyAnalyticsMetricResult,
): AnalyticsMetricResultIssue[] {
  const issues: AnalyticsMetricResultIssue[] = [];
  const { value } = result;

  if (value.kind === 'observed') {
    if (!Number.isFinite(value.value)) {
      issues.push(
        resultIssue(
          'observed-value-not-finite',
          'Observed metric values must be finite numbers',
          'value.value',
        ),
      );
    }
    if (value.value === 0 && !result.definition.explicitZeroValid) {
      issues.push(
        resultIssue(
          'explicit-zero-not-allowed',
          'This metric definition does not allow zero as an observed value',
          'value.value',
        ),
      );
    }
    if (
      result.definition.requiresIncludedObservations &&
      result.sample.counts.included === 0
    ) {
      issues.push(
        resultIssue(
          'observed-value-without-required-sample',
          'Observed values require at least one included observation for this metric',
          'sample.counts.included',
        ),
      );
    }
  }

  if (value.kind === 'partial') {
    if (!Number.isFinite(value.value)) {
      issues.push(
        resultIssue(
          'partial-value-not-finite',
          'Partial metric values must be finite numbers',
          'value.value',
        ),
      );
    }
    if (result.definition.partialCoverage === 'not-allowed') {
      issues.push(
        resultIssue(
          'partial-value-disallowed',
          'This metric definition does not allow partial coverage values',
          'value',
        ),
      );
    }
    if (result.coverage.status !== 'partial') {
      issues.push(
        resultIssue(
          'partial-value-without-partial-coverage',
          'Partial metric values require explicitly partial coverage',
          'coverage',
        ),
      );
    }
  }

  if (
    value.kind === 'unavailable' &&
    (value.reason === undefined || value.reason.trim() === '')
  ) {
    issues.push(
      resultIssue(
        'unavailable-value-missing-reason',
        'Unavailable metric values require a structured user-safe reason',
        'value.reason',
      ),
    );
  }

  if (
    value.kind === 'observed' &&
    isRateLikeMetricValueKind(result.definition.valueKind) &&
    result.sample.denominator.kind === 'metric-value' &&
    result.sample.denominator.value === 0
  ) {
    issues.push(
      resultIssue(
        'rate-denominator-zero',
        'Observed rate-like values cannot use a zero metric-value denominator',
        'sample.denominator.value',
      ),
    );
  }

  return issues;
}

export function validateAnalyticsMetricResult(
  result: AnalyticsMetricResult,
): readonly AnalyticsMetricResultIssue[] {
  const issues = collectBaseIssues(result);

  if (result.status === 'loading') return issues;

  if (result.status === 'load-error') {
    if (result.error.message.trim() === '') {
      issues.push(
        resultIssue(
          'load-error-blank-message',
          'Load-error metric results require a user-safe error message',
          'error.message',
        ),
      );
    }
    return issues;
  }

  if (result.status === 'capability-unavailable') {
    if (isAnalyticsCapabilityExecutable(result.capability)) {
      issues.push(
        resultIssue(
          'capability-unavailable-executable',
          'An executable capability cannot make a metric capability-unavailable',
          'capability',
        ),
      );
    }
    issues.push(...collectEvidenceIssues(result));
    return issues;
  }

  if (result.status === 'insufficient-evidence') {
    if (result.reason.explanation.trim() === '') {
      issues.push(
        resultIssue(
          'insufficient-evidence-blank-reason',
          'Insufficient-evidence results require a user-safe reason',
          'reason.explanation',
        ),
      );
    }
    if (result.sample !== undefined) issues.push(...collectSampleIssues(result.sample));
    if (result.coverage !== undefined) issues.push(...collectCoverageIssues(result.coverage));
    if (result.eligibility !== undefined) {
      issues.push(...collectEligibilityIssues(result.eligibility));
    }
    issues.push(...collectEvidenceIssues(result));
    return issues;
  }

  issues.push(...collectSampleIssues(result.sample));
  issues.push(...collectCoverageIssues(result.coverage));
  issues.push(...collectEligibilityIssues(result.eligibility));
  issues.push(...collectMinimumSampleIssues(result));
  issues.push(...collectCapabilityIssues(result));
  issues.push(...collectValueIssues(result));
  issues.push(...collectEvidenceIssues(result));

  if (result.eligibility.status !== 'eligible') {
    issues.push(
      resultIssue(
        'eligibility-invalid',
        'Ready metric results require eligible observations',
        'eligibility.status',
      ),
    );
  }

  return issues;
}

export function createReadyAnalyticsMetricResult(
  input: Omit<ReadyAnalyticsMetricResult, 'status'>,
): ReadyAnalyticsMetricResult {
  const result: ReadyAnalyticsMetricResult = { status: 'ready', ...input };
  const issues = validateAnalyticsMetricResult(result);
  if (issues.length > 0) {
    throw new Error(
      `Invalid ready analytics metric result: ${issues
        .map((issue) => issue.code)
        .join(', ')}`,
    );
  }
  return result;
}

export function capabilityUnavailableAnalyticsMetricResult(
  input: Omit<CapabilityUnavailableAnalyticsMetricResult, 'status'>,
): CapabilityUnavailableAnalyticsMetricResult {
  const result: CapabilityUnavailableAnalyticsMetricResult = {
    status: 'capability-unavailable',
    ...input,
  };
  if (isAnalyticsCapabilityExecutable(result.capability)) {
    throw new Error(
      'An executable capability cannot make a metric capability-unavailable',
    );
  }
  return result;
}

export function isReadyAnalyticsMetricResult(
  result: AnalyticsMetricResult,
): result is ReadyAnalyticsMetricResult {
  return result.status === 'ready';
}

export function isLoadErrorAnalyticsMetricResult(
  result: AnalyticsMetricResult,
): result is LoadErrorAnalyticsMetricResult {
  return result.status === 'load-error';
}

export function isCapabilityUnavailableAnalyticsMetricResult(
  result: AnalyticsMetricResult,
): result is CapabilityUnavailableAnalyticsMetricResult {
  return result.status === 'capability-unavailable';
}
