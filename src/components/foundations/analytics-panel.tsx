import type { ReactNode } from 'react';
import { DataStateRenderer, type DataDisplayState } from './data-states';
import { SectionHeader } from './section-header';
import type { HeadingLevel } from './typography';

/**
 * Typed analytics panel: the `tm-panel` chrome with an explicit prop API.
 *
 * Unlike the legacy `ChartFrame`, nothing here keys behavior off the title
 * string — variants, badges, and states are all explicit props. The panel is
 * a `section` named by its title, keeps its header visible in every data
 * state, and renders children only when `state` is ready (or omitted).
 */
export function AnalyticsPanel({
  title,
  description,
  badges,
  actions,
  headingLevel = 2,
  state,
  footer,
  children,
}: {
  title: string;
  description?: string;
  /** Coverage/sample notices rendered beside the title. */
  badges?: ReactNode;
  actions?: ReactNode;
  headingLevel?: HeadingLevel;
  /** Data state of the panel body. Omit (or pass ready) to render children. */
  state?: DataDisplayState;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-label={title} className="tm-panel">
      <SectionHeader
        actions={actions}
        badges={badges}
        description={description}
        headingLevel={headingLevel}
        title={title}
      />
      <div className="mt-4">
        <DataStateRenderer state={state}>{children}</DataStateRenderer>
      </div>
      {footer ? (
        <div className="mt-4 border-t border-stone-200/10 pt-3">{footer}</div>
      ) : null}
    </section>
  );
}
