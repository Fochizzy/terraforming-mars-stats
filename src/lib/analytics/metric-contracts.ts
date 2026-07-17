/** Metric identity and metadata contracts (Phase 2, Step 2.3). */

import type { AnalyticsCapabilityStatus } from './capabilities';
import type { AnalyticsFilterKey } from './filters';
import type {
  AnalyticsDenominatorKind,
  AnalyticsMinimumSamplePolicy,
} from './sample';
import type { AnalyticsScopeType } from './scopes';

export type AnalyticsMetricIdentity = {
  /** Stable metric identity used by code, URL selection, and repositories. */
  id: string;
  /** Canonical technical code/slug; never a localized display label. */
  code: string;
  /** Contract version, independent of display copy. */
  version: string;
};

export function analyticsMetricKey(identity: AnalyticsMetricIdentity): string {
  return `${identity.id}@${identity.version}`;
}

export const ANALYTICS_METRIC_VALUE_KINDS = [
  'number',
  'count',
  'total',
  'average',
  'median',
  'percentage',
  'ratio',
  'rate',
  'score',
  'placement',
  'duration',
  'distribution-summary',
] as const;

export type AnalyticsMetricValueKind =
  (typeof ANALYTICS_METRIC_VALUE_KINDS)[number];

export const ANALYTICS_AGGREGATION_KINDS = [
  'count',
  'total',
  'average',
  'median',
  'percentage',
  'ratio-of-totals',
  'median-per-observation-rate',
  'per-observation-value',
  'distribution-summary',
] as const;

export type AnalyticsAggregationKind =
  (typeof ANALYTICS_AGGREGATION_KINDS)[number];

export const ANALYTICS_METRIC_UNIT_KINDS = [
  'scalar',
  'count',
  'percentage',
  'ratio',
  'rate',
  'points',
  'placement',
  'generations',
  'duration',
  'distribution',
  'custom',
] as const;

export type AnalyticsMetricUnit =
  | {
      kind: Exclude<(typeof ANALYTICS_METRIC_UNIT_KINDS)[number], 'custom'>;
    }
  | { kind: 'custom'; code: string };

export type AnalyticsMetricCapabilityRequirement = {
  capabilityKey: string;
  necessity: 'required' | 'optional';
  /** Statuses accepted by the metric; defaults conceptually to executable statuses. */
  acceptedStatuses?: readonly AnalyticsCapabilityStatus[];
};

export type AnalyticsInterpretationMetadata = {
  /** Analytics remain observational; causal claims are not permitted here. */
  mode: 'observational';
  causalClaimsAllowed: false;
  methodologyRef?: string;
  caveats?: readonly { code: string; message: string }[];
};

export type AnalyticsMetricDefinition = {
  identity: AnalyticsMetricIdentity;
  /** Stable reference into presentation/localization metadata; not identity. */
  displayMetadataRef?: string;
  valueKind: AnalyticsMetricValueKind;
  aggregationKind: AnalyticsAggregationKind;
  unit: AnalyticsMetricUnit;
  denominatorKind: AnalyticsDenominatorKind;
  supportedScopes: readonly AnalyticsScopeType[];
  supportedFilters: readonly AnalyticsFilterKey[];
  minimumSamplePolicy: AnalyticsMinimumSamplePolicy;
  eligibilityPolicyRef?: string;
  capabilityRequirements: readonly AnalyticsMetricCapabilityRequirement[];
  explicitZeroValid: boolean;
  partialCoverage: 'allowed' | 'not-allowed';
  insufficientEvidence: 'applies' | 'not-applicable';
  provenance: 'required' | 'optional';
  requiresIncludedObservations: boolean;
  interpretation: AnalyticsInterpretationMetadata;
};

export const ANALYTICS_METRIC_DEFINITION_ISSUE_CODES = [
  'blank-identity',
  'duplicate-scope',
  'duplicate-filter',
  'duplicate-capability-requirement',
  'blank-capability-key',
  'blank-custom-unit',
  'silent-percentage-average',
  'rate-aggregation-on-non-rate-value',
  'invalid-minimum-sample-policy',
] as const;

export type AnalyticsMetricDefinitionIssueCode =
  (typeof ANALYTICS_METRIC_DEFINITION_ISSUE_CODES)[number];

export type AnalyticsMetricDefinitionIssue = {
  code: AnalyticsMetricDefinitionIssueCode;
  message: string;
  path?: string;
};

const RATE_VALUE_KINDS: readonly AnalyticsMetricValueKind[] = [
  'percentage',
  'ratio',
  'rate',
];
const RATE_AGGREGATIONS: readonly AnalyticsAggregationKind[] = [
  'percentage',
  'ratio-of-totals',
  'median-per-observation-rate',
  'per-observation-value',
];

export function isRateLikeMetricValueKind(
  valueKind: AnalyticsMetricValueKind,
): boolean {
  return RATE_VALUE_KINDS.includes(valueKind);
}

export function validateAnalyticsMetricDefinition(
  definition: AnalyticsMetricDefinition,
): readonly AnalyticsMetricDefinitionIssue[] {
  const issues: AnalyticsMetricDefinitionIssue[] = [];
  (['id', 'code', 'version'] as const).forEach((field) => {
    if (definition.identity[field].trim() === '') {
      issues.push({
        code: 'blank-identity',
        message: `Metric identity ${field} must not be blank`,
        path: `identity.${field}`,
      });
    }
  });

  const duplicateIssues = <T extends string>(
    values: readonly T[],
    code: 'duplicate-scope' | 'duplicate-filter',
    path: string,
  ) => {
    const seen = new Set<T>();
    values.forEach((value, index) => {
      if (seen.has(value)) {
        issues.push({ code, message: `${value} is declared more than once`, path: `${path}[${index}]` });
      }
      seen.add(value);
    });
  };
  duplicateIssues(definition.supportedScopes, 'duplicate-scope', 'supportedScopes');
  duplicateIssues(definition.supportedFilters, 'duplicate-filter', 'supportedFilters');

  const capabilities = new Set<string>();
  definition.capabilityRequirements.forEach((requirement, index) => {
    if (requirement.capabilityKey.trim() === '') {
      issues.push({
        code: 'blank-capability-key',
        message: 'Capability requirement key must not be blank',
        path: `capabilityRequirements[${index}].capabilityKey`,
      });
    } else if (capabilities.has(requirement.capabilityKey)) {
      issues.push({
        code: 'duplicate-capability-requirement',
        message: `Capability ${requirement.capabilityKey} is declared more than once`,
        path: `capabilityRequirements[${index}]`,
      });
    }
    capabilities.add(requirement.capabilityKey);
  });

  if (definition.unit.kind === 'custom' && definition.unit.code.trim() === '') {
    issues.push({
      code: 'blank-custom-unit',
      message: 'A custom unit requires a stable code',
      path: 'unit.code',
    });
  }
  const rateLike = isRateLikeMetricValueKind(definition.valueKind);
  if (rateLike && definition.aggregationKind === 'average') {
    issues.push({
      code: 'silent-percentage-average',
      message:
        'Rate-like values must declare ratio-of-totals, median-per-observation rate, or another explicit rate aggregation',
      path: 'aggregationKind',
    });
  }
  if (!rateLike && RATE_AGGREGATIONS.includes(definition.aggregationKind)) {
    issues.push({
      code: 'rate-aggregation-on-non-rate-value',
      message: 'Rate aggregation requires a percentage, ratio, or rate value kind',
      path: 'aggregationKind',
    });
  }
  const policy = definition.minimumSamplePolicy;
  if (
    policy.kind !== 'none' &&
    (!Number.isFinite(policy.threshold) || !Number.isInteger(policy.threshold) || policy.threshold < 0)
  ) {
    issues.push({
      code: 'invalid-minimum-sample-policy',
      message: 'Minimum-sample threshold must be a nonnegative integer',
      path: 'minimumSamplePolicy.threshold',
    });
  }
  if (policy.kind === 'metric-specific' && policy.policyRef.trim() === '') {
    issues.push({
      code: 'invalid-minimum-sample-policy',
      message: 'Metric-specific minimum-sample policy requires an approved reference',
      path: 'minimumSamplePolicy.policyRef',
    });
  }
  return issues;
}
