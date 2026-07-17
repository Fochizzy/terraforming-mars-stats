/**
 * Shared design foundations (Phase 1, Step 1.1).
 *
 * Reusable, page-agnostic building blocks for the redesigned dashboards.
 * Nothing here fetches data, computes analytics, or hard-codes metric
 * values; pages provide typed data and these components present it,
 * preserving missing-versus-zero semantics via `@/lib/metrics/metric-value`.
 */
export {
  dashboardGridVariantClassName,
  dashboardSectionGapClassName,
  pageContainerWidthClassName,
  pageGutterClassName,
  pageVerticalPaddingClassName,
  type DashboardGridVariant,
  type PageContainerWidth,
} from './foundation-classes';
export { Heading, Text } from './typography';
export type {
  HeadingLevel,
  HeadingSize,
  HeadingVariant,
  TextVariant,
} from './typography';
export { PageContainer } from './page-container';
export { PageHeader } from './page-header';
export { SectionHeader } from './section-header';
export { DashboardGrid } from './dashboard-grid';
export { DashboardPageShell } from './dashboard-page-shell';
export { KpiCard } from './kpi-card';
export { AnalyticsPanel } from './analytics-panel';
export {
  FilterToolbar,
  FilterToolbarField,
  FilterToolbarGroup,
} from './filter-toolbar';
export { ChartContainer } from './chart-container';
export { TableContainer } from './table-container';
export {
  DataStateRenderer,
  EmptyState,
  ErrorState,
  LoadingState,
  LowSampleNotice,
  MissingDataNotice,
  PartialCoverageNotice,
  UnavailableState,
  readyState,
  type DataDisplayState,
} from './data-states';
export { InfoTooltip, Tooltip, type TooltipPlacement } from './tooltip';
