'use client';

import type { ReactNode } from 'react';

type GroupInsightHeaderProps = {
  /** "Group Score Profile" when no player selected, "Score Profile for X" when focused. */
  title: string;
  gameCount?: number | null;
  dateRange?: string | null;
  /** When true, renders skeleton placeholders. */
  loading?: boolean;
};

export function GroupInsightHeader({
  title,
  gameCount,
  dateRange,
  loading = false,
}: GroupInsightHeaderProps) {
  const hasMetadata = (gameCount != null && gameCount > 0) || dateRange;

  if (loading) {
    return (
      <header style={{ marginBottom: '1.25rem' }}>
        <SkeletonBlock style={{ height: '1.6rem', width: '16rem', marginBottom: '0.5rem' }} />
        <SkeletonBlock style={{ height: '0.9rem', width: '28rem', maxWidth: '100%' }} />
      </header>
    );
  }

  return (
    <header style={{ marginBottom: '1.25rem' }}>
      <h2
        id="group-scoring-title"
        style={{
          color: 'var(--tm-dust-300)',
          fontFamily: 'var(--tm-font-display)',
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          lineHeight: 1.2,
          margin: 0,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: '#a8a29e',
          fontSize: '0.82rem',
          lineHeight: 1.55,
          margin: '0.4rem 0 0',
        }}
      >
        See how the group earns victory points on average, then compare an individual
        player&rsquo;s scoring mix.
      </p>
      {hasMetadata ? (
        <p
          style={{
            color: 'rgba(192, 162, 127, 0.72)',
            fontSize: '0.72rem',
            letterSpacing: '0.03em',
            margin: '0.4rem 0 0',
          }}
        >
          {[
            gameCount != null && gameCount > 0 ? `Based on ${gameCount} finalized games` : null,
            dateRange ?? null,
            'Average points per player per game',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </header>
  );
}

// ─── Skeleton helper ─────────────────────────────────────────────────────────

function SkeletonBlock({
  style,
}: {
  style: React.CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: 'rgba(120, 113, 108, 0.2)',
        borderRadius: '0.5rem',
        ...style,
      }}
    />
  );
}
