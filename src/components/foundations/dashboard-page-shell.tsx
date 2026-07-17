import type { ReactNode } from 'react';
import { dashboardSectionGapClassName } from './foundation-classes';
import { PageContainer } from './page-container';

/**
 * In-page shell for dashboard pages: a header slot, an optional filter
 * toolbar slot, and a consistently spaced column of sections.
 *
 * It deliberately does not render application chrome (banner, navigation);
 * the legacy `AppShell` continues to own that. When the page is rendered
 * inside a layout that already provides the standard container, leave
 * `withContainer` off; standalone target pages can enable it.
 */
export function DashboardPageShell({
  header,
  toolbar,
  withContainer = false,
  children,
}: {
  header?: ReactNode;
  toolbar?: ReactNode;
  /** Wrap the shell in the standard `PageContainer`. */
  withContainer?: boolean;
  children: ReactNode;
}) {
  const shell = (
    <div className="flex flex-col gap-5">
      {header ?? null}
      {toolbar ?? null}
      <div className={dashboardSectionGapClassName}>{children}</div>
    </div>
  );

  if (!withContainer) {
    return shell;
  }

  return <PageContainer as="section">{shell}</PageContainer>;
}
