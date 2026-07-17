import type { ReactNode } from 'react';
import {
  pageContainerWidthClassName,
  pageGutterClassName,
  pageVerticalPaddingClassName,
  type PageContainerWidth,
} from './foundation-classes';

/**
 * Centered page-content container with the application's standard width and
 * responsive gutters (the same values the current `AppShell` content area
 * uses). `as` keeps the markup semantic for the caller's context.
 */
export function PageContainer({
  as: Tag = 'div',
  width = 'default',
  padded = true,
  className,
  children,
}: {
  as?: 'div' | 'section' | 'main' | 'article';
  width?: PageContainerWidth;
  /** Apply the standard vertical padding. Disable when nesting containers. */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = [
    'mx-auto w-full',
    pageContainerWidthClassName[width],
    pageGutterClassName,
    padded ? pageVerticalPaddingClassName : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes}>{children}</Tag>;
}
