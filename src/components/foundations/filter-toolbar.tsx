import type { ReactNode } from 'react';

/**
 * Filter toolbar for dashboard pages: a labeled group of filter controls
 * that wraps onto multiple rows on small screens. Controls keep their native
 * tab order and focus behavior; the toolbar adds structure and consistent
 * spacing only, and holds no page-specific filtering logic.
 */
export function FilterToolbar({
  label,
  className,
  children,
}: {
  /** Accessible name of the toolbar group, e.g. `'Leaderboard filters'`. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = ['tm-toolbar', className ?? ''].filter(Boolean).join(' ');
  return (
    <div aria-label={label} className={classes} role="group">
      {children}
    </div>
  );
}

/**
 * A labeled field inside the toolbar. The wrapping `label` element associates
 * the caption with the single form control passed as `children`.
 */
export function FilterToolbarField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = ['tm-toolbar-field', className ?? ''].filter(Boolean).join(' ');
  return (
    <label className={classes}>
      <span className="tm-data-label">{label}</span>
      {children}
    </label>
  );
}

/**
 * Grouping for non-labelable toolbar content (button clusters, applied-filter
 * chips) that still needs an accessible name.
 */
export function FilterToolbarGroup({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = ['flex flex-wrap items-center gap-2', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div aria-label={label} className={classes} role="group">
      {children}
    </div>
  );
}
