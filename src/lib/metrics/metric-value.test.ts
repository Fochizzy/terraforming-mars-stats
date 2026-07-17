import { describe, expect, it } from 'vitest';
import {
  coverageFraction,
  describeSampleSize,
  formatCoverage,
  formatMetricNumber,
  formatMetricValue,
  hasMetricValue,
  isLowSample,
  metricFromNullable,
  missingMetric,
  observedMetric,
  partialMetric,
  unavailableMetric,
} from './metric-value';

describe('metricFromNullable', () => {
  it('preserves an explicit zero as an observed value, never as missing', () => {
    expect(metricFromNullable(0)).toEqual({ kind: 'observed', value: 0 });
  });

  it('maps null and undefined to missing, never to zero', () => {
    expect(metricFromNullable(null)).toEqual({ kind: 'missing' });
    expect(metricFromNullable(undefined)).toEqual({ kind: 'missing' });
  });

  it('maps non-finite numbers to unavailable rather than rendering them', () => {
    expect(metricFromNullable(Number.NaN).kind).toBe('unavailable');
    expect(metricFromNullable(Number.POSITIVE_INFINITY).kind).toBe('unavailable');
  });

  it('keeps ordinary observations', () => {
    expect(metricFromNullable(41.5)).toEqual({ kind: 'observed', value: 41.5 });
  });
});

describe('formatMetricValue', () => {
  it('renders an observed zero as 0, distinct from the missing label', () => {
    expect(formatMetricValue(observedMetric(0))).toBe('0');
    expect(formatMetricValue(missingMetric())).toBe('Not recorded');
  });

  it('renders unavailable values with their own label', () => {
    expect(formatMetricValue(unavailableMetric('no denominator'))).toBe(
      'Unavailable',
    );
  });

  it('marks partial values as lower bounds', () => {
    expect(formatMetricValue(partialMetric(12))).toBe('≥ 12');
  });

  it('groups large numbers for readability', () => {
    expect(formatMetricValue(observedMetric(1234567))).toBe('1,234,567');
  });

  it('honors custom labels and formatters', () => {
    expect(
      formatMetricValue(missingMetric(), { missingLabel: 'No observation' }),
    ).toBe('No observation');
    expect(
      formatMetricValue(observedMetric(0.5), {
        formatNumber: (value) => `${Math.round(value * 100)}%`,
      }),
    ).toBe('50%');
  });

  it('applies fixed decimals when requested', () => {
    expect(formatMetricValue(observedMetric(2), { decimals: 1 })).toBe('2.0');
    expect(formatMetricNumber(3.14159, 2)).toBe('3.14');
  });
});

describe('hasMetricValue', () => {
  it('is true only for observed and partial values', () => {
    expect(hasMetricValue(observedMetric(0))).toBe(true);
    expect(hasMetricValue(partialMetric(3))).toBe(true);
    expect(hasMetricValue(missingMetric())).toBe(false);
    expect(hasMetricValue(unavailableMetric())).toBe(false);
  });
});

describe('isLowSample', () => {
  it('returns null when no approved threshold exists', () => {
    expect(isLowSample({ count: 2 })).toBeNull();
  });

  it('compares against the explicit threshold when provided', () => {
    expect(isLowSample({ count: 2, lowSampleThreshold: 10 })).toBe(true);
    expect(isLowSample({ count: 10, lowSampleThreshold: 10 })).toBe(false);
  });
});

describe('describeSampleSize', () => {
  it('shows the sample count and unit', () => {
    expect(describeSampleSize({ count: 12 })).toBe('n = 12 games');
    expect(describeSampleSize({ count: 3, unit: 'player-games' })).toBe(
      'n = 3 player-games',
    );
  });
});

describe('coverage', () => {
  it('shows the numerator and denominator with the percentage', () => {
    expect(formatCoverage({ covered: 12, total: 20 })).toBe(
      '12 of 20 games (60%)',
    );
    expect(formatCoverage({ covered: 1, total: 3 }, 'players')).toBe(
      '1 of 3 players (33%)',
    );
  });

  it('reports zero coverage honestly instead of hiding it', () => {
    expect(formatCoverage({ covered: 0, total: 8 })).toBe('0 of 8 games (0%)');
  });

  it('refuses to compute a percentage with a non-positive denominator', () => {
    expect(coverageFraction({ covered: 0, total: 0 })).toBeNull();
    expect(formatCoverage({ covered: 0, total: 0 })).toBeNull();
  });
});
