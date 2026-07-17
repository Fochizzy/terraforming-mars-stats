import type { CSSProperties, ReactNode } from 'react';
import { DataStateRenderer, type DataDisplayState } from './data-states';

/**
 * Responsive chart region. Charts render inside a full-width figure with a
 * reserved minimum height, so Recharts responsive wrappers (or fixed-size
 * SVGs) have stable space on every viewport; no charting dependency is added
 * here. The figure carries an accessible name, an optional visible caption,
 * and an optional screen-reader summary of what the chart shows.
 */
export function ChartContainer({
  label,
  caption,
  srSummary,
  state,
  minHeight = 280,
  scrollable = false,
  children,
}: {
  /** Accessible name of the chart region. */
  label: string;
  /** Visible caption below the chart. */
  caption?: string;
  /** Screen-reader-only description of the rendered data shape. */
  srSummary?: string;
  state?: DataDisplayState;
  /** Reserved height in CSS pixels for the chart body. */
  minHeight?: number;
  /**
   * Allow horizontal scrolling for charts that cannot compress further on
   * narrow screens. The scroll region is keyboard-focusable.
   */
  scrollable?: boolean;
  children?: ReactNode;
}) {
  const bodyStyle: CSSProperties = { minHeight };
  const body = (
    <DataStateRenderer state={state}>
      {srSummary ? <p className="sr-only">{srSummary}</p> : null}
      {children}
    </DataStateRenderer>
  );

  return (
    <figure aria-label={label} className="w-full">
      {scrollable ? (
        <div
          aria-label={`${label} (scrollable)`}
          className="tm-focus-ring w-full overflow-x-auto"
          role="region"
          style={bodyStyle}
          tabIndex={0}
        >
          {body}
        </div>
      ) : (
        <div className="w-full" style={bodyStyle}>
          {body}
        </div>
      )}
      {caption ? (
        <figcaption className="tm-muted-copy mt-2 text-xs">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
