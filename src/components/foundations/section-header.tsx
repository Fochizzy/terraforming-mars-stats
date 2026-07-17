import type { ReactNode } from 'react';
import { Heading, Text, type HeadingLevel } from './typography';

/**
 * Section-level header used inside dashboard pages: title, optional
 * description, a badges slot for coverage/sample notices, and an actions
 * slot. Defaults to `h2` beneath the page title.
 */
export function SectionHeader({
  title,
  titleId,
  description,
  badges,
  actions,
  headingLevel = 2,
}: {
  title: string;
  titleId?: string;
  description?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  headingLevel?: HeadingLevel;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Heading id={titleId} level={headingLevel} size="md" variant="panel">
            {title}
          </Heading>
          {badges ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {badges}
            </span>
          ) : null}
        </div>
        {description ? (
          <Text className="mt-1 max-w-3xl" variant="body">
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
