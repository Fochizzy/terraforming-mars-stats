import type { ReactNode } from 'react';
import { Heading, Text, type HeadingLevel } from './typography';

/**
 * Page-level header: eyebrow, title, supporting description, and an actions
 * slot that wraps below the title on small screens.
 *
 * `headingLevel` defaults to `1` for standalone target pages. When the page
 * is rendered inside the legacy `AppShell` (which already renders an `h1`),
 * pass `headingLevel={2}` to keep a valid document outline.
 */
export function PageHeader({
  eyebrow,
  title,
  titleId,
  description,
  actions,
  headingLevel = 1,
}: {
  eyebrow?: string;
  title: string;
  titleId?: string;
  description?: string;
  actions?: ReactNode;
  headingLevel?: HeadingLevel;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
        <Heading
          className={eyebrow ? 'mt-2' : undefined}
          id={titleId}
          level={headingLevel}
          size="xl"
          variant="display"
        >
          {title}
        </Heading>
        {description ? (
          <Text className="mt-2 max-w-3xl" variant="body">
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
