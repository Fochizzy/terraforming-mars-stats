/**
 * Shared metric presentation model (Phase 1, Step 1.1).
 *
 * Analytics values shown by the shared foundations must preserve the
 * distinction between an observed value (including an explicit zero), a value
 * that was never recorded, and a metric that cannot be computed at all.
 * Nothing in this module converts a missing observation into a zero, and no
 * sample-size threshold is built in: thresholds are per-metric product
 * decisions and must be passed in explicitly by callers once approved.
 */

/** An observed measurement. `value` may legitimately be `0`. */
export type ObservedMetricValue = { kind: 'observed'; value: number };

/**
 * An incomplete observation: the true value is at least `value` (for example,
 * a total assembled from a partially-covered event stream).
 */
export type PartialMetricValue = { kind: 'partial'; value: number };

/** The opportunity to record the value existed, but nothing was recorded. */
export type MissingMetricValue = { kind: 'missing' };

/**
 * The metric cannot be computed for this subject at all — for example, its
 * denominator is missing or the underlying facts were never captured.
 */
export type UnavailableMetricValue = { kind: 'unavailable'; reason?: string };

export type MetricValue =
  | ObservedMetricValue
  | PartialMetricValue
  | MissingMetricValue
  | UnavailableMetricValue;

export function observedMetric(value: number): ObservedMetricValue {
  return { kind: 'observed', value };
}

export function partialMetric(value: number): PartialMetricValue {
  return { kind: 'partial', value };
}

export function missingMetric(): MissingMetricValue {
  return { kind: 'missing' };
}

export function unavailableMetric(reason?: string): UnavailableMetricValue {
  return reason === undefined
    ? { kind: 'unavailable' }
    : { kind: 'unavailable', reason };
}

/**
 * Wraps a nullable query result without coercion: `null`/`undefined` becomes
 * `missing` (never zero), a finite number becomes `observed` (zero stays
 * zero), and a non-finite number becomes `unavailable` because it indicates a
 * broken upstream calculation rather than a recorded fact.
 */
export function metricFromNullable(
  value: number | null | undefined,
): MetricValue {
  if (value === null || value === undefined) {
    return missingMetric();
  }
  if (!Number.isFinite(value)) {
    return unavailableMetric('Value is not a finite number');
  }
  return observedMetric(value);
}

/** True when the metric carries a numeric value (observed or partial). */
export function hasMetricValue(
  metric: MetricValue,
): metric is ObservedMetricValue | PartialMetricValue {
  return metric.kind === 'observed' || metric.kind === 'partial';
}

export type FormatMetricOptions = {
  /** Fraction digits. Defaults to `0` minimum and `1` maximum. */
  decimals?: number;
  /** Text for `missing` values. Defaults to `'Not recorded'`. */
  missingLabel?: string;
  /** Text for `unavailable` values. Defaults to `'Unavailable'`. */
  unavailableLabel?: string;
  /** Prefix marking a partial value as a lower bound. Defaults to `'≥ '`. */
  partialPrefix?: string;
  /** Custom number formatter; overrides `decimals`. */
  formatNumber?: (value: number) => string;
};

/**
 * Deterministic en-US grouping so large values render as e.g. `1,234,567`
 * regardless of the viewer's locale.
 */
export function formatMetricNumber(value: number, decimals?: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 1,
  }).format(value);
}

export function formatMetricValue(
  metric: MetricValue,
  options: FormatMetricOptions = {},
): string {
  const {
    decimals,
    missingLabel = 'Not recorded',
    unavailableLabel = 'Unavailable',
    partialPrefix = '≥ ',
    formatNumber = (value: number) => formatMetricNumber(value, decimals),
  } = options;

  switch (metric.kind) {
    case 'observed':
      return formatNumber(metric.value);
    case 'partial':
      return `${partialPrefix}${formatNumber(metric.value)}`;
    case 'missing':
      return missingLabel;
    case 'unavailable':
      return unavailableLabel;
  }
}

/**
 * Sample description for aggregate metrics. `lowSampleThreshold` is only ever
 * supplied by callers once the owning phase approves a threshold for that
 * metric; this module deliberately has no default.
 */
export type SampleSize = {
  /** Number of eligible observations behind the metric. */
  count: number;
  /** Unit label, e.g. `'games'` or `'player-games'`. Defaults to `'games'`. */
  unit?: string;
  /** Approved minimum sample for confident display, when one exists. */
  lowSampleThreshold?: number;
};

/**
 * `true`/`false` when an approved threshold exists; `null` when no threshold
 * has been approved, so callers cannot mistake "no policy" for "large enough".
 */
export function isLowSample(sample: SampleSize): boolean | null {
  if (sample.lowSampleThreshold === undefined) {
    return null;
  }
  return sample.count < sample.lowSampleThreshold;
}

export function describeSampleSize(sample: SampleSize): string {
  const unit = sample.unit ?? 'games';
  return `n = ${formatMetricNumber(sample.count)} ${unit}`;
}

/**
 * Coverage of an optional fact across an eligible population. `covered` and
 * `total` are counts, so the denominator is always displayable.
 */
export type CoverageObservation = {
  covered: number;
  total: number;
};

/** Fraction in `[0, 1]`, or `null` when the denominator is not positive. */
export function coverageFraction(
  coverage: CoverageObservation,
): number | null {
  if (!Number.isFinite(coverage.total) || coverage.total <= 0) {
    return null;
  }
  return coverage.covered / coverage.total;
}

/**
 * Formats coverage with its denominator visible, e.g. `12 of 20 games (60%)`.
 * Returns `null` when the denominator is not positive; callers should render
 * an unavailable state instead of a percentage in that case.
 */
export function formatCoverage(
  coverage: CoverageObservation,
  unit = 'games',
): string | null {
  const fraction = coverageFraction(coverage);
  if (fraction === null) {
    return null;
  }
  const percent = Math.round(fraction * 100);
  return `${formatMetricNumber(coverage.covered)} of ${formatMetricNumber(coverage.total)} ${unit} (${percent}%)`;
}
