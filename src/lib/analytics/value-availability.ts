/**
 * Analytics value availability contracts (Phase 2, Step 2.1).
 *
 * The envelope around an evaluated metric value. Three layers stay separate
 * by construction:
 *
 * - `ready` — evaluation ran; the Phase 1 `MetricValue` inside preserves
 *   observed (including explicit zero), partial, missing, and
 *   unavailable-for-subject distinctions.
 * - `capability-unavailable` — the metric cannot be produced here at all;
 *   carries the non-executable capability result with its typed reason.
 * - `load-error` — loading or querying failed; whether data exists is
 *   unknown, which is different from knowing it is absent.
 *
 * Nothing here converts a state into another, no placeholder string is ever a
 * value, and formatting stays with presentation code. Metric-specific
 * formulas, eligibility, and thresholds belong to later steps.
 */

import type { MetricValue } from '@/lib/metrics/metric-value';
import {
  isAnalyticsCapabilityExecutable,
  type NonExecutableAnalyticsCapability,
} from './capabilities';
import type { AnalyticsCoverage } from './coverage';
import type { AnalyticsCalculationVersion, AnalyticsEvidence } from './evidence';

/** A non-blocking caveat attached to a ready result, e.g. a stale snapshot. */
export type AnalyticsResultWarning = {
  /** Stable machine-readable warning key, e.g. `stale-snapshot`. */
  code: string;
  /** User-safe message. */
  message: string;
};

/** A failed load. User-safe: never a raw driver or database error. */
export type AnalyticsLoadError = {
  message: string;
  /** Optional stable error code. */
  code?: string;
  /** Whether retrying could plausibly succeed, when known. */
  retryable?: boolean;
};

export type ReadyAnalyticsValue = {
  status: 'ready';
  /**
   * The evaluated value. Observed zero, nonzero, partial, missing, and
   * unavailable-for-subject stay distinct inside the Phase 1 model.
   */
  value: MetricValue;
  /** Coverage behind the value; required context for partial values. */
  coverage?: AnalyticsCoverage;
  evidence?: AnalyticsEvidence;
  calculationVersion?: AnalyticsCalculationVersion;
  warnings?: readonly AnalyticsResultWarning[];
};

export type CapabilityUnavailableAnalyticsValue = {
  status: 'capability-unavailable';
  /** The blocking capability result, including its typed reason. */
  capability: NonExecutableAnalyticsCapability;
};

export type LoadErrorAnalyticsValue = {
  status: 'load-error';
  error: AnalyticsLoadError;
};

export type AnalyticsValueResult =
  | ReadyAnalyticsValue
  | CapabilityUnavailableAnalyticsValue
  | LoadErrorAnalyticsValue;

export function readyAnalyticsValue(
  value: MetricValue,
  metadata: Omit<ReadyAnalyticsValue, 'status' | 'value'> = {},
): ReadyAnalyticsValue {
  return { status: 'ready', value, ...metadata };
}

/**
 * Wraps a non-executable capability as the reason a value cannot exist. An
 * executable capability here is a caller bug: a supported or partially
 * supported capability yields a `ready` result instead.
 */
export function capabilityUnavailableAnalyticsValue(
  capability: NonExecutableAnalyticsCapability,
): CapabilityUnavailableAnalyticsValue {
  if (isAnalyticsCapabilityExecutable(capability)) {
    throw new Error(
      'An executable capability cannot become a capability-unavailable result',
    );
  }
  return { status: 'capability-unavailable', capability };
}

export function loadErrorAnalyticsValue(
  error: AnalyticsLoadError,
): LoadErrorAnalyticsValue {
  return { status: 'load-error', error };
}

export function isReadyAnalyticsValue(
  result: AnalyticsValueResult,
): result is ReadyAnalyticsValue {
  return result.status === 'ready';
}

export function isCapabilityUnavailableAnalyticsValue(
  result: AnalyticsValueResult,
): result is CapabilityUnavailableAnalyticsValue {
  return result.status === 'capability-unavailable';
}

export function isLoadErrorAnalyticsValue(
  result: AnalyticsValueResult,
): result is LoadErrorAnalyticsValue {
  return result.status === 'load-error';
}
