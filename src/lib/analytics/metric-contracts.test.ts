import { describe, expect, it } from 'vitest';
import type { AnalyticsMetricDefinition } from './metric-contracts';
import {
  analyticsMetricKey,
  validateAnalyticsMetricDefinition,
} from './metric-contracts';

const baseDefinition: AnalyticsMetricDefinition = {
  identity: {
    id: 'metric:win-rate',
    code: 'win-rate',
    version: '1',
  },
  displayMetadataRef: 'display.winRate',
  valueKind: 'percentage',
  aggregationKind: 'ratio-of-totals',
  unit: { kind: 'percentage' },
  denominatorKind: 'observation-count',
  supportedScopes: ['global', 'group', 'individual'],
  supportedFilters: ['date-range', 'map', 'minimum-sample'],
  minimumSamplePolicy: {
    kind: 'metric-specific',
    threshold: 3,
    policyRef: 'phase-2.win-rate.minimum-sample',
  },
  eligibilityPolicyRef: 'phase-2.win-rate.eligibility',
  capabilityRequirements: [
    { capabilityKey: 'placement-and-winners', necessity: 'required' },
  ],
  explicitZeroValid: true,
  partialCoverage: 'not-allowed',
  insufficientEvidence: 'applies',
  provenance: 'required',
  requiresIncludedObservations: true,
  interpretation: {
    mode: 'observational',
    causalClaimsAllowed: false,
    methodologyRef: 'docs/redesign/phases/02-analytics-foundation.md#step-23',
  },
};

const displayLabelScope: AnalyticsMetricDefinition['supportedScopes'] = [
  // @ts-expect-error Display labels are not stable scope identities.
  'Group Analytics',
];
void displayLabelScope;

describe('analytics metric identity', () => {
  it('keeps stable identity separate from display metadata', () => {
    expect(analyticsMetricKey(baseDefinition.identity)).toBe(
      'metric:win-rate@1',
    );
    expect(
      analyticsMetricKey({
        ...baseDefinition.identity,
      }),
    ).toBe('metric:win-rate@1');
    expect({
      ...baseDefinition,
      displayMetadataRef: 'display.localizedWinRate',
    }.identity).toEqual(baseDefinition.identity);
  });
});

describe('validateAnalyticsMetricDefinition', () => {
  it('accepts an internally consistent metric definition', () => {
    expect(validateAnalyticsMetricDefinition(baseDefinition)).toEqual([]);
  });

  it('rejects blank stable identity fields and custom units', () => {
    const issues = validateAnalyticsMetricDefinition({
      ...baseDefinition,
      identity: { id: ' ', code: 'win-rate', version: '' },
      unit: { kind: 'custom', code: ' ' },
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'blank-identity', path: 'identity.id' }),
        expect.objectContaining({
          code: 'blank-identity',
          path: 'identity.version',
        }),
        expect.objectContaining({ code: 'blank-custom-unit' }),
      ]),
    );
  });

  it('rejects duplicate scopes, filters, and capability requirements', () => {
    const issues = validateAnalyticsMetricDefinition({
      ...baseDefinition,
      supportedScopes: ['group', 'group'],
      supportedFilters: ['map', 'map'],
      capabilityRequirements: [
        { capabilityKey: 'placement-and-winners', necessity: 'required' },
        { capabilityKey: 'placement-and-winners', necessity: 'optional' },
      ],
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-scope' }),
        expect.objectContaining({ code: 'duplicate-filter' }),
        expect.objectContaining({ code: 'duplicate-capability-requirement' }),
      ]),
    );
  });

  it('requires stable capability keys', () => {
    expect(
      validateAnalyticsMetricDefinition({
        ...baseDefinition,
        capabilityRequirements: [{ capabilityKey: ' ', necessity: 'required' }],
      }),
    ).toContainEqual(expect.objectContaining({ code: 'blank-capability-key' }));
  });

  it('rejects silent percentage averages and non-rate rate aggregations', () => {
    expect(
      validateAnalyticsMetricDefinition({
        ...baseDefinition,
        aggregationKind: 'average',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'silent-percentage-average' }),
    );
    expect(
      validateAnalyticsMetricDefinition({
        ...baseDefinition,
        valueKind: 'count',
        unit: { kind: 'count' },
        aggregationKind: 'percentage',
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'rate-aggregation-on-non-rate-value' }),
    );
  });

  it('allows a non-rate per-observation value without reclassifying it as a rate', () => {
    expect(
      validateAnalyticsMetricDefinition({
        ...baseDefinition,
        valueKind: 'count',
        unit: { kind: 'count' },
        aggregationKind: 'per-observation-value',
      }),
    ).not.toContainEqual(
      expect.objectContaining({ code: 'rate-aggregation-on-non-rate-value' }),
    );
  });

  it('validates metric-specific minimum-sample policies', () => {
    expect(
      validateAnalyticsMetricDefinition({
        ...baseDefinition,
        minimumSamplePolicy: {
          kind: 'metric-specific',
          threshold: -1,
          policyRef: '',
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-minimum-sample-policy' }),
      ]),
    );
  });
});
