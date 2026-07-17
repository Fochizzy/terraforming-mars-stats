/**
 * Approved card-acquisition calculations (Phase 2, Step 2.4).
 *
 * These utilities calculate only the approved rate relationships. They do not
 * read data, invent coverage, apply a sample threshold, or format numbers.
 * Callers provide a Step 2.3 sample, eligibility result, and rate-specific
 * coverage evaluation so incompatible denominators cannot be silently merged.
 */

import {
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
  type MetricValue,
  type ObservedMetricValue,
} from '@/lib/metrics/metric-value';
import type { CardAcquisitionRateFormulaCode } from '../canonical-definitions';
import type { AnalyticsCoverageEvaluation } from '../coverage';
import type {
  AnalyticsEligibilityReason,
  AnalyticsEligibilityResult,
} from '../eligibility';
import type { AnalyticsSample } from '../sample';
import { validateAnalyticsSample } from '../sample';

export type CardAcquisitionRateInput = {
  /** Stable player-game observation identity, never a display label. */
  observationId: string;
  /** Eligibility evaluated before this calculation begins. */
  eligibility: AnalyticsEligibilityResult;
  /** Coverage evaluated specifically for this numerator/denominator pair. */
  coverage: AnalyticsCoverageEvaluation;
};

export type PurchaseConversionInput = CardAcquisitionRateInput & {
  cardsPurchased: MetricValue;
  cardsSeen: MetricValue;
};

export type PurchasedHandShareInput = CardAcquisitionRateInput & {
  cardsPurchased: MetricValue;
  totalHandAcquisitions: MetricValue;
};

export type HandUtilizationInput = CardAcquisitionRateInput & {
  cardsPlayed: MetricValue;
  totalHandAcquisitions: MetricValue;
};

export type EndHandCarryoverInput = CardAcquisitionRateInput & {
  cardsRemaining: MetricValue;
  totalHandAcquisitions: MetricValue;
};

export type CardAcquisitionRateEvaluation = {
  formula: CardAcquisitionRateFormulaCode;
  observationId: string;
  numerator: MetricValue;
  denominator: MetricValue;
  value: MetricValue;
  eligibility: AnalyticsEligibilityResult;
  coverage: AnalyticsCoverageEvaluation;
};

export type CardAcquisitionRateAggregate = {
  formula: CardAcquisitionRateFormulaCode;
  sample: AnalyticsSample;
  coverage: AnalyticsCoverageEvaluation;
  observations: readonly CardAcquisitionRateEvaluation[];
  /** Stable IDs of the exact player-game observations used in both summaries. */
  includedObservationIds: readonly string[];
  /** Stable IDs excluded from both summaries, with reasons on each evaluation. */
  excludedObservationIds: readonly string[];
  numeratorTotal: MetricValue;
  denominatorTotal: MetricValue;
  /** sum(eligible numerators) / sum(eligible denominators). */
  ratioOfTotals: MetricValue;
  /** Median of the same cohort's eligible per-player-game ratios. */
  medianPerObservationRate: MetricValue;
};

type RawRateInput = {
  formula: CardAcquisitionRateFormulaCode;
  observationId: string;
  numerator: MetricValue;
  denominator: MetricValue;
  eligibility: AnalyticsEligibilityResult;
  coverage: AnalyticsCoverageEvaluation;
};

export type CardAcquisitionRateAggregateInput<T> = {
  observations: readonly T[];
  sample: AnalyticsSample;
  /** Aggregate coverage from the repository/coverage layer; never inferred here. */
  coverage: AnalyticsCoverageEvaluation;
};

type ObservedCardAcquisitionRateEvaluation = CardAcquisitionRateEvaluation & {
  numerator: ObservedMetricValue;
  denominator: ObservedMetricValue;
  value: ObservedMetricValue;
  eligibility: { status: 'eligible' };
  coverage: Extract<AnalyticsCoverageEvaluation, { status: 'complete' }>;
};

function reason(
  code: AnalyticsEligibilityReason['code'],
  explanation: string,
): AnalyticsEligibilityReason {
  return { code, explanation };
}

function ineligible(
  code: AnalyticsEligibilityReason['code'],
  explanation: string,
): AnalyticsEligibilityResult {
  return { status: 'ineligible', reasons: [reason(code, explanation)] };
}

function indeterminate(
  code: AnalyticsEligibilityReason['code'],
  explanation: string,
): AnalyticsEligibilityResult {
  return { status: 'indeterminate', reasons: [reason(code, explanation)] };
}

function unavailable(
  code: AnalyticsEligibilityReason['code'],
  explanation: string,
): AnalyticsEligibilityResult {
  return { status: 'unavailable', reasons: [reason(code, explanation)] };
}

function notApplicable(explanation: string): AnalyticsEligibilityResult {
  return {
    status: 'not-applicable',
    reasons: [reason('metric-requirement-not-met', explanation)],
  };
}

function rateUnavailable(input: RawRateInput, eligibility: AnalyticsEligibilityResult, message: string) {
  return {
    formula: input.formula,
    observationId: input.observationId,
    numerator: input.numerator,
    denominator: input.denominator,
    value: unavailableMetric(message),
    eligibility,
    coverage: input.coverage,
  } satisfies CardAcquisitionRateEvaluation;
}

function evaluateCoverage(input: RawRateInput): CardAcquisitionRateEvaluation | null {
  switch (input.coverage.status) {
    case 'complete':
      return null;
    case 'partial':
      return rateUnavailable(
        input,
        ineligible('incomplete-required-coverage', 'The required rate coverage is partial.'),
        'The rate cannot be calculated exactly from partial coverage.',
      );
    case 'none':
      return {
        formula: input.formula,
        observationId: input.observationId,
        numerator: input.numerator,
        denominator: input.denominator,
        value: missingMetric(),
        eligibility: ineligible(
          'missing-required-observation',
          'No required rate observations were recorded for this eligible observation.',
        ),
        coverage: input.coverage,
      };
    case 'no-eligible-records':
      return {
        formula: input.formula,
        observationId: input.observationId,
        numerator: input.numerator,
        denominator: input.denominator,
        value: missingMetric(),
        eligibility: notApplicable('No eligible observation exists for this rate.'),
        coverage: input.coverage,
      };
    case 'unknown':
      return rateUnavailable(
        input,
        indeterminate('insufficient-evidence', input.coverage.reason.explanation),
        'The rate coverage is not known.',
      );
    case 'capability-unavailable':
      return rateUnavailable(
        input,
        unavailable('unavailable-capability', input.coverage.capability.reason.explanation),
        'The capability required to measure rate coverage is unavailable.',
      );
    case 'invalid':
      return rateUnavailable(
        input,
        indeterminate(
          'insufficient-evidence',
          'The supplied rate coverage is internally inconsistent.',
        ),
        'The rate coverage is invalid.',
      );
  }
}

function evaluateRate(input: RawRateInput): CardAcquisitionRateEvaluation {
  if (input.observationId.trim() === '') {
    throw new Error('Card-acquisition rate observations require a stable observation ID');
  }

  const coverageResult = evaluateCoverage(input);
  if (coverageResult !== null) return coverageResult;

  if (input.eligibility.status !== 'eligible') {
    return rateUnavailable(
      input,
      input.eligibility,
      'The observation is not eligible for this rate.',
    );
  }

  if (input.numerator.kind === 'missing') {
    return {
      formula: input.formula,
      observationId: input.observationId,
      numerator: input.numerator,
      denominator: input.denominator,
      value: missingMetric(),
      eligibility: ineligible('missing-numerator', 'The rate numerator was not recorded.'),
      coverage: input.coverage,
    };
  }
  if (input.denominator.kind === 'missing') {
    return rateUnavailable(
      input,
      ineligible('missing-denominator', 'The rate denominator was not recorded.'),
      'The rate denominator was not recorded.',
    );
  }
  if (input.numerator.kind === 'unavailable' || input.denominator.kind === 'unavailable') {
    return rateUnavailable(
      input,
      unavailable('unavailable-capability', 'A required rate operand is unavailable.'),
      'A required rate operand is unavailable.',
    );
  }
  if (input.numerator.kind === 'partial' || input.denominator.kind === 'partial') {
    return rateUnavailable(
      input,
      ineligible(
        'incomplete-required-coverage',
        'Exact rate calculation requires complete numerator and denominator observations.',
      ),
      'A partial operand cannot produce an exact rate.',
    );
  }

  const numerator = input.numerator.value;
  const denominator = input.denominator.value;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return rateUnavailable(
      input,
      ineligible('metric-requirement-not-met', 'Rate operands must be finite values.'),
      'A rate operand is not finite.',
    );
  }
  if (!Number.isInteger(numerator) || numerator < 0 || !Number.isInteger(denominator) || denominator < 0) {
    return rateUnavailable(
      input,
      ineligible(
        'metric-requirement-not-met',
        'Card-acquisition counts must be nonnegative integers.',
      ),
      'Card-acquisition counts must be nonnegative integers.',
    );
  }
  if (denominator === 0) {
    return rateUnavailable(
      input,
      ineligible('zero-denominator', 'The rate denominator is recorded as zero.'),
      'The rate denominator is zero.',
    );
  }

  return {
    formula: input.formula,
    observationId: input.observationId,
    numerator: input.numerator,
    denominator: input.denominator,
    value: observedMetric(numerator / denominator),
    eligibility: { status: 'eligible' },
    coverage: input.coverage,
  };
}

export function calculatePurchaseConversion(
  input: PurchaseConversionInput,
): CardAcquisitionRateEvaluation {
  return evaluateRate({
    formula: 'purchase-conversion',
    observationId: input.observationId,
    numerator: input.cardsPurchased,
    denominator: input.cardsSeen,
    eligibility: input.eligibility,
    coverage: input.coverage,
  });
}

export function calculatePurchasedHandShare(
  input: PurchasedHandShareInput,
): CardAcquisitionRateEvaluation {
  return evaluateRate({
    formula: 'purchased-hand-share',
    observationId: input.observationId,
    numerator: input.cardsPurchased,
    denominator: input.totalHandAcquisitions,
    eligibility: input.eligibility,
    coverage: input.coverage,
  });
}

export function calculateHandUtilization(
  input: HandUtilizationInput,
): CardAcquisitionRateEvaluation {
  return evaluateRate({
    formula: 'hand-utilization',
    observationId: input.observationId,
    numerator: input.cardsPlayed,
    denominator: input.totalHandAcquisitions,
    eligibility: input.eligibility,
    coverage: input.coverage,
  });
}

export function calculateEndHandCarryover(
  input: EndHandCarryoverInput,
): CardAcquisitionRateEvaluation {
  return evaluateRate({
    formula: 'end-hand-carryover',
    observationId: input.observationId,
    numerator: input.cardsRemaining,
    denominator: input.totalHandAcquisitions,
    eligibility: input.eligibility,
    coverage: input.coverage,
  });
}

function rateAggregateValue(
  coverage: AnalyticsCoverageEvaluation,
  total: number,
): MetricValue {
  switch (coverage.status) {
    case 'complete':
      return observedMetric(total);
    case 'partial':
      return partialMetric(total);
    case 'none':
    case 'no-eligible-records':
      return missingMetric();
    case 'unknown':
      return unavailableMetric('Aggregate coverage is unknown.');
    case 'capability-unavailable':
      return unavailableMetric(
        'The capability required to measure aggregate coverage is unavailable.',
      );
    case 'invalid':
      return unavailableMetric('Aggregate coverage is invalid.');
  }
}

function rateValueForAggregate(
  coverage: AnalyticsCoverageEvaluation,
  numeratorTotal: number,
  denominatorTotal: number,
  median: number | null,
): { ratioOfTotals: MetricValue; medianPerObservationRate: MetricValue } {
  if (coverage.status !== 'complete') {
    const unavailable = rateAggregateValue(coverage, 0);
    return {
      ratioOfTotals: unavailable.kind === 'partial'
        ? unavailableMetric('Partial coverage cannot produce an exact rate.')
        : unavailable,
      medianPerObservationRate: unavailable.kind === 'partial'
        ? unavailableMetric('Partial coverage cannot produce an exact rate.')
        : unavailable,
    };
  }
  if (denominatorTotal === 0 || median === null) {
    return { ratioOfTotals: missingMetric(), medianPerObservationRate: missingMetric() };
  }
  return {
    ratioOfTotals: observedMetric(numeratorTotal / denominatorTotal),
    medianPerObservationRate: observedMetric(median),
  };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function isObservedCardAcquisitionRate(
  observation: CardAcquisitionRateEvaluation,
): observation is ObservedCardAcquisitionRateEvaluation {
  return (
    observation.value.kind === 'observed' &&
    observation.numerator.kind === 'observed' &&
    observation.denominator.kind === 'observed' &&
    observation.eligibility.status === 'eligible' &&
    observation.coverage.status === 'complete'
  );
}

function aggregateRates(
  formula: CardAcquisitionRateFormulaCode,
  input: CardAcquisitionRateAggregateInput<CardAcquisitionRateEvaluation>,
): CardAcquisitionRateAggregate {
  const sampleIssues = validateAnalyticsSample(input.sample);
  if (sampleIssues.length > 0) {
    throw new Error(
      `Invalid card-acquisition aggregate sample: ${sampleIssues.map((issue) => issue.code).join(', ')}`,
    );
  }

  const observations = [...input.observations].sort((left, right) =>
    left.observationId < right.observationId ? -1 : left.observationId > right.observationId ? 1 : 0,
  );
  const ids = new Set<string>();
  observations.forEach((observation) => {
    if (observation.formula !== formula) {
      throw new Error('Card-acquisition aggregate observations must use one formula');
    }
    if (ids.has(observation.observationId)) {
      throw new Error('Card-acquisition aggregate observations must have unique stable IDs');
    }
    ids.add(observation.observationId);
  });

  const included = observations.filter(isObservedCardAcquisitionRate);
  if (input.sample.counts.included !== included.length) {
    throw new Error(
      'Aggregate sample included count must match the eligible calculated observation count',
    );
  }

  const numeratorTotal = included.reduce(
    (total, observation) => total + observation.numerator.value,
    0,
  );
  const denominatorTotal = included.reduce(
    (total, observation) => total + observation.denominator.value,
    0,
  );
  const rateValues = included.map((observation) => observation.value.value);
  const aggregateRates = rateValueForAggregate(
    input.coverage,
    numeratorTotal,
    denominatorTotal,
    median(rateValues),
  );
  const includedIds = new Set(included.map((observation) => observation.observationId));

  return {
    formula,
    sample: input.sample,
    coverage: input.coverage,
    observations,
    includedObservationIds: [...includedIds],
    excludedObservationIds: observations
      .filter((observation) => !includedIds.has(observation.observationId))
      .map((observation) => observation.observationId),
    numeratorTotal: rateAggregateValue(input.coverage, numeratorTotal),
    denominatorTotal: rateAggregateValue(input.coverage, denominatorTotal),
    ...aggregateRates,
  };
}

export function aggregatePurchaseConversion(
  input: CardAcquisitionRateAggregateInput<PurchaseConversionInput>,
): CardAcquisitionRateAggregate {
  return aggregateRates('purchase-conversion', {
    ...input,
    observations: input.observations.map(calculatePurchaseConversion),
  });
}

export function aggregatePurchasedHandShare(
  input: CardAcquisitionRateAggregateInput<PurchasedHandShareInput>,
): CardAcquisitionRateAggregate {
  return aggregateRates('purchased-hand-share', {
    ...input,
    observations: input.observations.map(calculatePurchasedHandShare),
  });
}

export function aggregateHandUtilization(
  input: CardAcquisitionRateAggregateInput<HandUtilizationInput>,
): CardAcquisitionRateAggregate {
  return aggregateRates('hand-utilization', {
    ...input,
    observations: input.observations.map(calculateHandUtilization),
  });
}

export function aggregateEndHandCarryover(
  input: CardAcquisitionRateAggregateInput<EndHandCarryoverInput>,
): CardAcquisitionRateAggregate {
  return aggregateRates('end-hand-carryover', {
    ...input,
    observations: input.observations.map(calculateEndHandCarryover),
  });
}
