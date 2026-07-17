import type { ReactNode } from 'react';

/**
 * Typography hierarchy for the shared design foundations.
 *
 * Visual style (variant/size) is decoupled from document structure (heading
 * level) so pages can keep a correct heading outline while reusing the
 * existing `tm-*` display classes from `globals.css`.
 */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeadingVariant = 'display' | 'panel';

export type HeadingSize = 'xl' | 'lg' | 'md' | 'sm';

const headingVariantClassName: Record<HeadingVariant, string> = {
  display: 'tm-display-title',
  panel: 'tm-panel-title',
};

const headingSizeClassName: Record<HeadingSize, string> = {
  xl: 'text-2xl font-bold sm:text-3xl',
  lg: 'text-xl font-bold sm:text-2xl',
  md: 'text-lg font-semibold',
  sm: 'text-base font-semibold',
};

export function Heading({
  level,
  variant = 'panel',
  size = 'md',
  id,
  className,
  children,
}: {
  level: HeadingLevel;
  variant?: HeadingVariant;
  size?: HeadingSize;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const Tag = `h${level}` as const;
  const classes = [
    headingVariantClassName[variant],
    headingSizeClassName[size],
    variant === 'panel' ? 'tracking-[0.08em]' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} id={id}>
      {children}
    </Tag>
  );
}

export type TextVariant = 'body' | 'muted' | 'accent' | 'label' | 'eyebrow';

const textVariantClassName: Record<TextVariant, string> = {
  body: 'tm-body-copy text-sm leading-6',
  muted: 'tm-muted-copy text-sm',
  accent: 'tm-accent-copy text-sm',
  label: 'tm-data-label',
  eyebrow: 'tm-display-eyebrow',
};

export function Text({
  variant = 'body',
  as: Tag = 'p',
  id,
  className,
  children,
}: {
  variant?: TextVariant;
  as?: 'p' | 'span' | 'div';
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = [textVariantClassName[variant], className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} id={id}>
      {children}
    </Tag>
  );
}
