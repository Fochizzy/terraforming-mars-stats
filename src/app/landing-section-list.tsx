'use client';

import { useId, useState } from 'react';
import { homepageSections } from './landing-sections';
import { GlossaryRichText } from '@/features/glossary/glossary-rich-text';
import type { PublicLandingStats } from '@/lib/db/public-landing-stats-repo';

type LandingSectionListProps = {
  stats: PublicLandingStats;
};

export function LandingSectionList({ stats }: LandingSectionListProps) {
  const baseId = useId();
  const [openChips, setOpenChips] = useState<Record<string, string | null>>({});

  function toggleChip(sectionId: string, label: string) {
    setOpenChips((current) => ({
      ...current,
      [sectionId]: current[sectionId] === label ? null : label,
    }));
  }

  return (
    <section className="tm-landing-section-list">
      {homepageSections.map((section) => {
        const openLabel = openChips[section.id] ?? null;

        return (
          <section
            id={section.id}
            key={section.id}
            className="tm-panel tm-landing-section-card"
          >
            <p className="tm-display-eyebrow">Mission Control</p>
            <h2 className="tm-display-title tm-landing-section-title">
              {section.title}
            </h2>
            <p className="tm-body-copy tm-landing-section-copy">
              <GlossaryRichText>{section.description}</GlossaryRichText>
            </p>
            <div className="tm-landing-highlight-row">
              {section.highlights.map((highlight) => {
                const isOpen = openLabel === highlight.label;
                const panelId = `${baseId}-${section.id}-${highlight.label.replace(/\s+/g, '-')}`;

                return (
                  <button
                    key={highlight.label}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="tm-landing-highlight-chip tm-landing-highlight-chip--interactive"
                    data-open={isOpen ? 'true' : undefined}
                    onClick={() => toggleChip(section.id, highlight.label)}
                  >
                    <span>{highlight.label}</span>
                    <span aria-hidden="true" className="tm-landing-highlight-chip-caret">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
            {section.highlights.map((highlight) => {
              const isOpen = openLabel === highlight.label;
              const panelId = `${baseId}-${section.id}-${highlight.label.replace(/\s+/g, '-')}`;
              const detail = highlight.detail(stats);

              return (
                <div
                  key={highlight.label}
                  id={panelId}
                  role="region"
                  aria-label={`${highlight.label} — global statistics`}
                  hidden={!isOpen}
                  className="tm-landing-stat-panel"
                >
                  {detail ? (
                    <>
                      <p className="tm-landing-stat-value">{detail.value}</p>
                      <p className="tm-landing-stat-caption">
                        <GlossaryRichText>{detail.caption}</GlossaryRichText>
                      </p>
                    </>
                  ) : (
                    <p className="tm-landing-stat-caption">
                      No games recorded yet — this fills in as your group logs
                      results.
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </section>
  );
}
