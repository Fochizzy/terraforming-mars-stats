import type { ReactNode } from 'react';
import {
  describeSampleSize,
  formatMetricValue,
  type FormatMetricOptions,
  type MetricValue,
  type SampleSize,
} from '@/lib/metrics/metric-value';
import { LowSampleNotice } from './data-states';
import { InfoTooltip } from './tooltip';

/**
 * KPI card built on the existing `tm-stat-card` treatment.
 *
 * The value is a `MetricValue`, so an explicit zero renders as `0` while a
 * missing observation renders as "Not recorded" and an uncomputable metric as
 * "Unavailable" — the card never converts absence into a number. Pass a
 * preformatted string only for genuinely non-numeric KPIs. Sample sizes
 * render whenever provided; the low-sample marker appears only when the
 * caller supplies an approved threshold.
 */
export function KpiCard({
  label,
  info,
  value,
  formatOptions,
  unit,
  description,
  sample,
  footer,
}: {
  label: string;
  /** Optional metric definition shown from an accessible info tooltip. */
  info?: ReactNode;
  value: MetricValue | string;
  /** Formatting for `MetricValue` values (decimals, labels, formatter). */
  formatOptions?: FormatMetricOptions;
  /** Unit suffix rendered after numeric values, e.g. `'pts'` or `'%'`. */
  unit?: string;
  description?: string;
  sample?: SampleSize;
  footer?: ReactNode;
}) {
  const isMetric = typeof value !== 'string';
  const displayValue = isMetric ? formatMetricValue(value, formatOptions) : value;
  const valueState = isMetric ? value.kind : 'observed';
  const showUnit =
    unit !== undefined &&
    (!isMetric || value.kind === 'observed' || value.kind === 'partial');

  return (
    <article aria-label={label} className="tm-stat-card">
      <div className="flex items-center gap-1.5">
        <p className="tm-data-label">{label}</p>
        {info ? <InfoTooltip content={info} label={`About ${label}`} /> : null}
      </div>
      <p
        className="tm-kpi-value mt-2 text-2xl font-semibold"
        data-state={valueState}
      >
        {displayValue}
        {showUnit ? <span className="tm-kpi-unit"> {unit}</span> : null}
      </p>
      {description ? (
        <p className="tm-muted-copy mt-1 text-sm">{description}</p>
      ) : null}
      {sample ? (
        <p className="tm-muted-copy mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span>{describeSampleSize(sample)}</span>
          <LowSampleNotice sample={sample} />
        </p>
      ) : null}
      {footer ? <div className="mt-2">{footer}</div> : null}
    </article>
  );
}
