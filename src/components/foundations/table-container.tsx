import type { ReactNode } from 'react';
import { DataStateRenderer, type DataDisplayState } from './data-states';

/**
 * Semantic table region. Renders a native `table` inside a labeled,
 * keyboard-focusable horizontal-scroll region so wide tables remain
 * reachable on small screens. When `state` is not ready, the shared state
 * block renders instead of an empty table shell.
 *
 * Numeric cells should set `data-align="numeric"` (right-aligned, tabular
 * numerals via the shared `tm-table` styles).
 */
export function TableContainer({
  label,
  caption,
  state,
  children,
}: {
  /** Accessible name of the table region. */
  label: string;
  /** Table caption; visually hidden when `captionHidden` styling is needed later. */
  caption?: string;
  state?: DataDisplayState;
  /** `thead`/`tbody`/`tfoot` content of the table. */
  children?: ReactNode;
}) {
  const resolvedStatus = state?.status ?? 'ready';
  if (resolvedStatus !== 'ready') {
    return (
      <div aria-label={label} role="region">
        <DataStateRenderer state={state}>{null}</DataStateRenderer>
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className="tm-table-container tm-focus-ring"
      role="region"
      tabIndex={0}
    >
      <table className="tm-table">
        {caption ? <caption>{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}
