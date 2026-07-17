/**
 * Canonical analytics definition registry (Phase 2, Step 2.4).
 *
 * This registry is the single authoritative location for the formula metadata
 * approved so far. It deliberately records definitions even where current
 * persisted facts are unavailable: capability and repository layers decide
 * whether a definition can produce a result for a real scope.
 */

import type { AnalyticsCalculationVersion } from './evidence';
import {
  analyticsMetricKey,
  validateAnalyticsMetricDefinition,
  type AnalyticsMetricDefinition,
} from './metric-contracts';

export const CANONICAL_ANALYTICS_FORMULA_VERSION = '1' as const;

export const CARD_ACQUISITION_RATE_FORMULA_CODES = [
  'purchase-conversion',
  'purchased-hand-share',
  'hand-utilization',
  'end-hand-carryover',
] as const;

export type CardAcquisitionRateFormulaCode =
  (typeof CARD_ACQUISITION_RATE_FORMULA_CODES)[number];

export const CANONICAL_RATE_AGGREGATION_CODES = [
  'ratio-of-totals',
  'median-per-observation-rate',
] as const;

export type CanonicalRateAggregationCode =
  (typeof CANONICAL_RATE_AGGREGATION_CODES)[number];

export type CanonicalAnalyticsFormula =
  | {
      kind: 'recorded-count';
      /** Stable source fact; no calculated substitute is permitted. */
      sourceFact:
        | 'cards-purchased'
        | 'cards-seen'
        | 'cards-played'
        | 'cards-remaining'
        | 'total-hand-acquisitions';
      utilityRef: 'recorded-card-acquisition-count';
      version: typeof CANONICAL_ANALYTICS_FORMULA_VERSION;
    }
  | {
      kind: 'card-acquisition-rate';
      rate: CardAcquisitionRateFormulaCode;
      aggregation: CanonicalRateAggregationCode;
      utilityRef:
        | 'aggregate-purchase-conversion'
        | 'aggregate-purchased-hand-share'
        | 'aggregate-hand-utilization'
        | 'aggregate-end-hand-carryover';
      version: typeof CANONICAL_ANALYTICS_FORMULA_VERSION;
    }
  | {
      kind: 'win-point-differential';
      comparison: 'highest-non-winning-score';
      tiedFirst: 'unresolved-no-numeric-value';
      utilityRef: 'calculate-win-point-differential';
      version: typeof CANONICAL_ANALYTICS_FORMULA_VERSION;
    }
  | {
      kind: 'merger-prelude-availability';
      rate:
        | 'usage-rate'
        | 'availability-rate'
        | 'selection-rate-given-availability';
      utilityRef: 'calculate-merger-prelude-availability';
      version: typeof CANONICAL_ANALYTICS_FORMULA_VERSION;
    };

export type CanonicalAnalyticsMetricDefinition = AnalyticsMetricDefinition & {
  /** Versioned formula metadata and the pure implementation reference. */
  formula: CanonicalAnalyticsFormula;
};

const OBSERVATIONAL_INTERPRETATION = {
  mode: 'observational',
  causalClaimsAllowed: false,
  methodologyRef: 'docs/redesign/CANONICAL-ANALYTICS-DEFINITIONS.md',
} as const;

const CARD_ACQUISITION_GAME_DEFINITION_BASE = {
  valueKind: 'count',
  aggregationKind: 'per-observation-value',
  unit: { kind: 'count' },
  denominatorKind: 'not-applicable',
  supportedScopes: ['game'],
  supportedFilters: [],
  minimumSamplePolicy: { kind: 'none' },
  explicitZeroValid: true,
  partialCoverage: 'allowed',
  insufficientEvidence: 'applies',
  provenance: 'required',
  requiresIncludedObservations: true,
  interpretation: OBSERVATIONAL_INTERPRETATION,
} as const;

function recordedCardAcquisitionDefinition(input: {
  id: string;
  code: string;
  sourceFact: Extract<CanonicalAnalyticsFormula, { kind: 'recorded-count' }>['sourceFact'];
  capabilityKey: string;
}): CanonicalAnalyticsMetricDefinition {
  return {
    ...CARD_ACQUISITION_GAME_DEFINITION_BASE,
    identity: {
      id: input.id,
      code: input.code,
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
    eligibilityPolicyRef: 'phase-2.card-acquisition.recorded-count-eligibility',
    capabilityRequirements: [{ capabilityKey: input.capabilityKey, necessity: 'required' }],
    formula: {
      kind: 'recorded-count',
      sourceFact: input.sourceFact,
      utilityRef: 'recorded-card-acquisition-count',
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
  };
}

const RATE_UTILITY_REFS: Record<
  CardAcquisitionRateFormulaCode,
  Extract<CanonicalAnalyticsFormula, { kind: 'card-acquisition-rate' }>['utilityRef']
> = {
  'purchase-conversion': 'aggregate-purchase-conversion',
  'purchased-hand-share': 'aggregate-purchased-hand-share',
  'hand-utilization': 'aggregate-hand-utilization',
  'end-hand-carryover': 'aggregate-end-hand-carryover',
};

const RATE_CAPABILITY_KEYS: Record<CardAcquisitionRateFormulaCode, readonly string[]> = {
  'purchase-conversion': ['cards-purchased-recorded', 'cards-seen-recorded'],
  'purchased-hand-share': [
    'cards-purchased-recorded',
    'total-hand-acquisitions-recorded',
  ],
  'hand-utilization': ['cards-played-recorded', 'total-hand-acquisitions-recorded'],
  'end-hand-carryover': [
    'cards-remaining-recorded',
    'total-hand-acquisitions-recorded',
  ],
};

function canonicalRateDefinition(input: {
  id: string;
  code: string;
  rate: CardAcquisitionRateFormulaCode;
  aggregation: CanonicalRateAggregationCode;
}): CanonicalAnalyticsMetricDefinition {
  return {
    identity: {
      id: input.id,
      code: input.code,
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
    valueKind: 'ratio',
    aggregationKind: input.aggregation,
    unit: { kind: 'ratio' },
    denominatorKind: 'metric-value',
    supportedScopes: ['global', 'individual', 'group', 'comparison', 'domain'],
    supportedFilters: [],
    minimumSamplePolicy: { kind: 'none' },
    eligibilityPolicyRef: 'phase-2.card-acquisition.rate-eligibility',
    capabilityRequirements: RATE_CAPABILITY_KEYS[input.rate].map((capabilityKey) => ({
      capabilityKey,
      necessity: 'required' as const,
    })),
    explicitZeroValid: true,
    partialCoverage: 'not-allowed',
    insufficientEvidence: 'applies',
    provenance: 'required',
    requiresIncludedObservations: true,
    interpretation: OBSERVATIONAL_INTERPRETATION,
    formula: {
      kind: 'card-acquisition-rate',
      rate: input.rate,
      aggregation: input.aggregation,
      utilityRef: RATE_UTILITY_REFS[input.rate],
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
  };
}

function mergerPreludeAvailabilityDefinition(input: {
  id: string;
  code: string;
  rate: Extract<CanonicalAnalyticsFormula, { kind: 'merger-prelude-availability' }>['rate'];
}): CanonicalAnalyticsMetricDefinition {
  return {
    identity: {
      id: input.id,
      code: input.code,
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
    valueKind: 'ratio',
    aggregationKind: 'ratio-of-totals',
    unit: { kind: 'ratio' },
    denominatorKind: 'observation-count',
    supportedScopes: ['group', 'individual', 'domain'],
    supportedFilters: [],
    minimumSamplePolicy: { kind: 'none' },
    eligibilityPolicyRef: 'phase-2.merger-prelude.availability-eligibility',
    capabilityRequirements: [
      { capabilityKey: 'merger-guaranteed-availability', necessity: 'required' },
    ],
    explicitZeroValid: true,
    partialCoverage: 'allowed',
    insufficientEvidence: 'applies',
    provenance: 'required',
    requiresIncludedObservations: true,
    interpretation: OBSERVATIONAL_INTERPRETATION,
    formula: {
      kind: 'merger-prelude-availability',
      rate: input.rate,
      utilityRef: 'calculate-merger-prelude-availability',
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
  };
}

export const CANONICAL_ANALYTICS_DEFINITIONS: readonly CanonicalAnalyticsMetricDefinition[] = [
  recordedCardAcquisitionDefinition({
    id: 'metric:cards-purchased',
    code: 'cards-purchased',
    sourceFact: 'cards-purchased',
    capabilityKey: 'cards-purchased-recorded',
  }),
  recordedCardAcquisitionDefinition({
    id: 'metric:cards-seen',
    code: 'cards-seen',
    sourceFact: 'cards-seen',
    capabilityKey: 'cards-seen-recorded',
  }),
  recordedCardAcquisitionDefinition({
    id: 'metric:cards-played',
    code: 'cards-played',
    sourceFact: 'cards-played',
    capabilityKey: 'cards-played-recorded',
  }),
  recordedCardAcquisitionDefinition({
    id: 'metric:cards-remaining',
    code: 'cards-remaining',
    sourceFact: 'cards-remaining',
    capabilityKey: 'cards-remaining-recorded',
  }),
  recordedCardAcquisitionDefinition({
    id: 'metric:total-hand-acquisitions',
    code: 'total-hand-acquisitions',
    sourceFact: 'total-hand-acquisitions',
    capabilityKey: 'total-hand-acquisitions-recorded',
  }),
  canonicalRateDefinition({
    id: 'metric:purchase-conversion:ratio-of-totals',
    code: 'purchase-conversion-ratio-of-totals',
    rate: 'purchase-conversion',
    aggregation: 'ratio-of-totals',
  }),
  canonicalRateDefinition({
    id: 'metric:purchase-conversion:median-per-player-game',
    code: 'purchase-conversion-median-per-player-game',
    rate: 'purchase-conversion',
    aggregation: 'median-per-observation-rate',
  }),
  canonicalRateDefinition({
    id: 'metric:purchased-hand-share:ratio-of-totals',
    code: 'purchased-hand-share-ratio-of-totals',
    rate: 'purchased-hand-share',
    aggregation: 'ratio-of-totals',
  }),
  canonicalRateDefinition({
    id: 'metric:purchased-hand-share:median-per-player-game',
    code: 'purchased-hand-share-median-per-player-game',
    rate: 'purchased-hand-share',
    aggregation: 'median-per-observation-rate',
  }),
  canonicalRateDefinition({
    id: 'metric:hand-utilization:ratio-of-totals',
    code: 'hand-utilization-ratio-of-totals',
    rate: 'hand-utilization',
    aggregation: 'ratio-of-totals',
  }),
  canonicalRateDefinition({
    id: 'metric:hand-utilization:median-per-player-game',
    code: 'hand-utilization-median-per-player-game',
    rate: 'hand-utilization',
    aggregation: 'median-per-observation-rate',
  }),
  canonicalRateDefinition({
    id: 'metric:end-hand-carryover:ratio-of-totals',
    code: 'end-hand-carryover-ratio-of-totals',
    rate: 'end-hand-carryover',
    aggregation: 'ratio-of-totals',
  }),
  canonicalRateDefinition({
    id: 'metric:end-hand-carryover:median-per-player-game',
    code: 'end-hand-carryover-median-per-player-game',
    rate: 'end-hand-carryover',
    aggregation: 'median-per-observation-rate',
  }),
  mergerPreludeAvailabilityDefinition({
    id: 'metric:merger-prelude-usage-rate',
    code: 'merger-prelude-usage-rate',
    rate: 'usage-rate',
  }),
  mergerPreludeAvailabilityDefinition({
    id: 'metric:merger-prelude-availability-rate',
    code: 'merger-prelude-availability-rate',
    rate: 'availability-rate',
  }),
  mergerPreludeAvailabilityDefinition({
    id: 'metric:merger-prelude-selection-rate-given-availability',
    code: 'merger-prelude-selection-rate-given-availability',
    rate: 'selection-rate-given-availability',
  }),
  {
    identity: {
      id: 'metric:win-point-differential',
      code: 'win-point-differential',
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
    valueKind: 'score',
    aggregationKind: 'per-observation-value',
    unit: { kind: 'points' },
    denominatorKind: 'not-applicable',
    supportedScopes: ['game'],
    supportedFilters: [],
    minimumSamplePolicy: { kind: 'none' },
    eligibilityPolicyRef: 'phase-2.win-point-differential.eligibility',
    capabilityRequirements: [
      { capabilityKey: 'canonical-win-point-differential', necessity: 'required' },
    ],
    explicitZeroValid: true,
    partialCoverage: 'not-allowed',
    insufficientEvidence: 'applies',
    provenance: 'required',
    requiresIncludedObservations: true,
    interpretation: OBSERVATIONAL_INTERPRETATION,
    formula: {
      kind: 'win-point-differential',
      comparison: 'highest-non-winning-score',
      tiedFirst: 'unresolved-no-numeric-value',
      utilityRef: 'calculate-win-point-differential',
      version: CANONICAL_ANALYTICS_FORMULA_VERSION,
    },
  },
] as const;

const definitionsById = new Map(
  CANONICAL_ANALYTICS_DEFINITIONS.map((definition) => [
    definition.identity.id,
    definition,
  ]),
);

export function getCanonicalAnalyticsDefinition(
  definitionId: string,
): CanonicalAnalyticsMetricDefinition | undefined {
  return definitionsById.get(definitionId);
}

export function getCanonicalCardAcquisitionRateDefinition(input: {
  rate: CardAcquisitionRateFormulaCode;
  aggregation: CanonicalRateAggregationCode;
}): CanonicalAnalyticsMetricDefinition {
  const definition = CANONICAL_ANALYTICS_DEFINITIONS.find(
    (candidate) =>
      candidate.formula.kind === 'card-acquisition-rate' &&
      candidate.formula.rate === input.rate &&
      candidate.formula.aggregation === input.aggregation,
  );
  if (!definition) {
    throw new Error(
      `Missing canonical definition for ${input.rate} (${input.aggregation})`,
    );
  }
  return definition;
}

export function canonicalAnalyticsCalculationVersion(
  definition: CanonicalAnalyticsMetricDefinition,
): AnalyticsCalculationVersion {
  return {
    definitionId: definition.identity.id,
    version: definition.formula.version,
    methodologyRef: definition.interpretation.methodologyRef,
  };
}

export function validateCanonicalAnalyticsDefinitions(): readonly string[] {
  const issues: string[] = [];
  const identities = new Set<string>();
  const codes = new Set<string>();

  CANONICAL_ANALYTICS_DEFINITIONS.forEach((definition) => {
    const metricKey = analyticsMetricKey(definition.identity);
    if (identities.has(metricKey)) {
      issues.push(`Duplicate canonical metric identity: ${metricKey}`);
    }
    identities.add(metricKey);
    if (codes.has(definition.identity.code)) {
      issues.push(`Duplicate canonical metric code: ${definition.identity.code}`);
    }
    codes.add(definition.identity.code);
    validateAnalyticsMetricDefinition(definition).forEach((issue) => {
      issues.push(`${definition.identity.id}: ${issue.code}`);
    });
    if (definition.identity.version !== definition.formula.version) {
      issues.push(
        `${definition.identity.id}: definition and formula versions must match`,
      );
    }
  });

  return issues;
}
