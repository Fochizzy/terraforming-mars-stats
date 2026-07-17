/**
 * Shared layout class constants for the design foundations.
 *
 * These are literal Tailwind class strings kept in one place so every
 * foundation component (and later target page) uses the same spacing rhythm,
 * page width, and responsive behavior. They live under `src/components` so
 * Tailwind's content scanner sees the literals.
 */

/** Page content width and gutters, matching the existing `AppShell` content area. */
export const pageContainerWidthClassName = {
  /** Dashboard width used by the current authenticated shell. */
  default: 'max-w-[1600px]',
  /** Narrower reading width used by the landing sections. */
  narrow: 'max-w-6xl',
} as const;

export type PageContainerWidth = keyof typeof pageContainerWidthClassName;

export const pageGutterClassName = 'px-4 sm:px-6 lg:px-8 xl:px-10';

export const pageVerticalPaddingClassName = 'py-6';

/** Vertical rhythm between the header, toolbar, and sections of a dashboard page. */
export const dashboardSectionGapClassName = 'flex flex-col gap-4 sm:gap-5';

/**
 * Responsive grid variants. Every column uses `minmax(0, 1fr)` (the Tailwind
 * `grid-cols-*` default) so long labels and large numbers shrink instead of
 * overflowing the row.
 */
export const dashboardGridVariantClassName = {
  /** Dense KPI cards: 1 column on mobile, 2 from `sm`, 4 from `xl`. */
  kpi: 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4',
  /** Two side-by-side panels from `lg`. */
  split: 'grid gap-4 lg:grid-cols-2',
  /** Card lists: 1 column on mobile, 2 from `sm`, 3 from `xl`. */
  thirds: 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3',
  /** Stacked full-width sections. */
  single: 'grid gap-4',
} as const;

export type DashboardGridVariant = keyof typeof dashboardGridVariantClassName;
