'use client';

import { fmt, fmtPct } from './scoring-calculations';
import type { ScoringSummary } from './scoring-calculations';

type GroupInsightMetricsProps = {
  gameCount: number;
  summary: ScoringSummary;
  loading?: boolean;
};

export function GroupInsightMetrics({ gameCount, summary, loading = false }: GroupInsightMetricsProps) {
  if (loading) {
    return (
      <div style={gridStyle} aria-label="Loading summary metrics" aria-busy="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={cardStyle}>
            <div style={skeletonLabel} />
            <div style={skeletonValue} />
            <div style={skeletonNote} />
          </div>
        ))}
      </div>
    );
  }

  const { totalAverage, leadingSource, leadingSourceShare } = summary;
  const hasData = gameCount > 0 && totalAverage > 0;

  const cards = hasData
    ? [
        {
          label: 'Games analyzed',
          value: String(gameCount),
          note: 'Finalized games in this group',
        },
        {
          label: 'Average total score',
          value: `${fmt(totalAverage)} pts`,
          note: 'Sum of all score sources',
        },
        leadingSource
          ? {
              label: 'Leading score source',
              value: leadingSource.label,
              note: `${fmt(leadingSource.groupValue)} pts avg`,
            }
          : null,
        leadingSource && leadingSourceShare > 0
          ? {
              label: 'Leading source share',
              value: fmtPct(leadingSourceShare),
              note: `Of average total score`,
            }
          : null,
      ].filter((c): c is NonNullable<typeof c> => c !== null)
    : [];

  if (cards.length === 0) {
    return null;
  }

  return (
    <div style={gridStyle} role="list" aria-label="Summary metrics">
      {cards.map((card) => (
        <div key={card.label} style={cardStyle} role="listitem">
          <span style={labelStyle}>{card.label}</span>
          <strong style={valueStyle}>{card.value}</strong>
          <span style={noteStyle}>{card.note}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: '0.65rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  marginBottom: '1.25rem',
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(12, 10, 9, 0.42)',
  border: '1px solid rgba(120, 113, 108, 0.28)',
  borderRadius: '0.875rem',
  padding: '0.8rem 0.9rem',
};

const labelStyle: React.CSSProperties = {
  color: 'rgb(253, 186, 116)',
  display: 'block',
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const valueStyle: React.CSSProperties = {
  color: 'rgb(250, 250, 249)',
  display: 'block',
  fontSize: 'clamp(1.05rem, 1.8vw, 1.35rem)',
  fontWeight: 800,
  marginTop: '0.3rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const noteStyle: React.CSSProperties = {
  color: 'rgb(168, 162, 158)',
  display: 'block',
  fontSize: '0.72rem',
  marginTop: '0.2rem',
};

const skeletonBase: React.CSSProperties = {
  background: 'rgba(120, 113, 108, 0.2)',
  borderRadius: '0.3rem',
};
const skeletonLabel: React.CSSProperties = { ...skeletonBase, height: '0.7rem', width: '4rem' };
const skeletonValue: React.CSSProperties = {
  ...skeletonBase,
  height: '1.35rem',
  marginTop: '0.3rem',
  width: '5.5rem',
};
const skeletonNote: React.CSSProperties = {
  ...skeletonBase,
  height: '0.65rem',
  marginTop: '0.25rem',
  width: '7rem',
};
