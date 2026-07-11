import Link from 'next/link';
import type { ReactNode } from 'react';

type GlossaryLinkProps = {
  /** Term slug to deep-link to (e.g. "weighted-score"); omit for the page top. */
  slug?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Inline link to a term on the glossary page. The `#slug` fragment lets the
 * glossary page scroll to and highlight the matching definition on arrival.
 */
export function GlossaryLink({ slug, children, className }: GlossaryLinkProps) {
  return (
    <Link
      className={`tm-glossary-link${className ? ` ${className}` : ''}`}
      href={slug ? `/glossary#${slug}` : '/glossary'}
    >
      {children}
    </Link>
  );
}
