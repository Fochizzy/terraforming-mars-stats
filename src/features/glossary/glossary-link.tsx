import Link from 'next/link';
import type { ReactNode } from 'react';
import { glossaryDestination } from './glossary-destination';

export function GlossaryLink({
  slug,
  children,
  className,
}: {
  slug?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={
        className ??
        'font-medium text-cyan-200 underline decoration-cyan-400/70 underline-offset-2 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300'
      }
      href={glossaryDestination(slug)}
    >
      {children}
    </Link>
  );
}
