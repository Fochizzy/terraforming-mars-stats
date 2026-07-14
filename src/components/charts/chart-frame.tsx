import type { ReactNode } from 'react';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';

export function ChartFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="tm-panel">
      <h2 className="tm-panel-title text-lg font-semibold">
        <GlossaryRichText maxLinks={1}>{title}</GlossaryRichText>
      </h2>

      {description ? (
        <p className="tm-panel-caption mt-1 text-sm">
          {typeof description === 'string' ? (
            <GlossaryRichText>{description}</GlossaryRichText>
          ) : (
            description
          )}
        </p>
      ) : null}

      <div className="mt-4">{children}</div>
    </section>
  );
}