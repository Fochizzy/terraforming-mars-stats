import type { ReactNode } from 'react';
import {
  dashboardGridVariantClassName,
  type DashboardGridVariant,
} from './foundation-classes';

/**
 * Responsive dashboard grid. Variants are fixed class maps (Tailwind cannot
 * compile dynamic class names) and all collapse to a single column on mobile.
 */
export function DashboardGrid({
  variant = 'single',
  as: Tag = 'div',
  className,
  children,
}: {
  variant?: DashboardGridVariant;
  as?: 'div' | 'ul' | 'ol';
  className?: string;
  children: ReactNode;
}) {
  const classes = [dashboardGridVariantClassName[variant], className ?? '']
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes}>{children}</Tag>;
}
