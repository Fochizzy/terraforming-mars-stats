import type { ReactNode } from 'react';
import {
  describeSampleSize,
  formatCoverage,
  isLowSample,
  type CoverageObservation,
  type SampleSize,
} from '@/lib/metrics/metric-value';

/**
 * Shared data-quality states (Phase 1, Step 1.1).
 *
 * Every state communicates through text plus an icon glyph, never color
 * alone. Loading uses a polite live region; errors use `role="alert"` so an
 * error is programmatically distinct from "no rows yet". No component here
 * invents data: empty, missing, and unavailable copy describe the absence.
 */

/**
 * Display state for a data-driven region (panel, chart, or table body).
 * `ready` renders the caller's children; every other status replaces them.
 */
export type DataDisplayState =
  | { status: 'ready' }
  | { status: 'loading'; label?: string }
  | { status: 'empty'; title?: string; description?: string; action?: ReactNode }
  | { status: 'error'; title?: string; description?: string; action?: ReactNode }
  | { status: 'unavailable'; title?: string; description?: string };

export const readyState: DataDisplayState = { status: 'ready' };

export function LoadingState({ label = 'Loading data' }: { label?: string }) {
  return (
    <div aria-live="polite" className="tm-state" data-state="loading" role="status">
      <span aria-hidden="true" className="tm-spinner" />
      <p className="tm-state-title">{label}…</p>
    </div>
  );
}

export function EmptyState({
  title = 'No data recorded yet',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="tm-state" data-state="empty">
      <span aria-hidden="true" className="tm-state-icon">
        ◌
      </span>
      <p className="tm-state-title">{title}</p>
      {description ? <p className="max-w-md">{description}</p> : null}
      {action ?? null}
    </div>
  );
}

export function ErrorState({
  title = 'Data could not be loaded',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="tm-state" data-state="error" role="alert">
      <span aria-hidden="true" className="tm-state-icon">
        ⚠
      </span>
      <p className="tm-state-title">{title}</p>
      {description ? <p className="max-w-md">{description}</p> : null}
      {action ?? null}
    </div>
  );
}

/**
 * The metric or section cannot exist for this subject — for example, the
 * underlying facts were never captured for historical games. Distinct from
 * `EmptyState`, which means eligible data simply has no rows yet.
 */
export function UnavailableState({
  title = 'Not available',
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="tm-state" data-state="unavailable">
      <span aria-hidden="true" className="tm-state-icon">
        ⊘
      </span>
      <p className="tm-state-title">{title}</p>
      {description ? <p className="max-w-md">{description}</p> : null}
    </div>
  );
}

/** Inline marker for a single value that was never recorded. */
export function MissingDataNotice({
  label = 'Not recorded',
}: {
  label?: string;
}) {
  return (
    <span className="tm-missing-value" data-state="missing">
      {label}
    </span>
  );
}

/**
 * Low-sample marker. Requires an approved `lowSampleThreshold` on the sample;
 * when no threshold has been approved for the metric, nothing renders (the
 * absence of a policy must not be presented as a passing sample).
 */
export function LowSampleNotice({ sample }: { sample: SampleSize }) {
  if (isLowSample(sample) !== true) {
    return null;
  }
  const unit = sample.unit ?? 'games';
  return (
    <span className="tm-notice" data-state="low-sample" data-tone="warning">
      <span aria-hidden="true">▲</span>
      Low sample: {describeSampleSize(sample)} (needs ≥ {sample.lowSampleThreshold}{' '}
      {unit})
    </span>
  );
}

/**
 * Coverage marker with the denominator visible, e.g. `Coverage: 12 of 20
 * games (60%)`. With a non-positive denominator it reports coverage as
 * unavailable instead of rendering a percentage.
 */
export function PartialCoverageNotice({
  coverage,
  label = 'Coverage',
  unit = 'games',
}: {
  coverage: CoverageObservation;
  label?: string;
  unit?: string;
}) {
  const formatted = formatCoverage(coverage, unit);
  if (formatted === null) {
    return (
      <span className="tm-notice" data-state="coverage-unavailable" data-tone="neutral">
        <span aria-hidden="true">◍</span>
        {label}: unavailable
      </span>
    );
  }
  return (
    <span className="tm-notice" data-state="partial-coverage" data-tone="info">
      <span aria-hidden="true">◍</span>
      {label}: {formatted}
    </span>
  );
}

/**
 * Renders the caller's children when `state` is `ready` (or omitted), and the
 * matching shared state otherwise. Used by the analytics panel, chart
 * container, and table container so all regions expose identical states.
 */
export function DataStateRenderer({
  state,
  children,
}: {
  state?: DataDisplayState;
  children: ReactNode;
}) {
  const resolved = state ?? readyState;
  switch (resolved.status) {
    case 'ready':
      return <>{children}</>;
    case 'loading':
      return <LoadingState label={resolved.label} />;
    case 'empty':
      return (
        <EmptyState
          action={resolved.action}
          description={resolved.description}
          title={resolved.title}
        />
      );
    case 'error':
      return (
        <ErrorState
          action={resolved.action}
          description={resolved.description}
          title={resolved.title}
        />
      );
    case 'unavailable':
      return (
        <UnavailableState
          description={resolved.description}
          title={resolved.title}
        />
      );
  }
}
