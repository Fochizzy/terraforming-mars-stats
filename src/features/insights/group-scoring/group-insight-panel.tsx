'use client';

import { fmt, fmtPct } from './scoring-calculations';
import type { ScoringSourceRow, ScoringSummary } from './scoring-calculations';

type GroupInsightPanelProps = {
  summary: ScoringSummary;
  rows: ScoringSourceRow[];
  playerName: string | null;
  gameCount: number;
  loading?: boolean;
};

type Insight = {
  text: string;
};

function buildInsights(
  summary: ScoringSummary,
  rows: ScoringSourceRow[],
  playerName: string | null,
  gameCount: number,
): Insight[] {
  const insights: Insight[] = [];
  if (gameCount < 1 || rows.length === 0) return insights;

  const { leadingSource, topTwoShare } = summary;

  // 1. Dominant source
  if (leadingSource && leadingSource.groupValue > 0) {
    insights.push({
      text: `${leadingSource.label} is the group's leading score source at ${fmt(leadingSource.groupValue)} points per game.`,
    });
  }

  // 2. Second-place comparison
  const second = rows[1];
  if (leadingSource && second && second.groupValue > 0) {
    const gap = leadingSource.groupValue - second.groupValue;
    insights.push({
      text: `${second.label} ranks second, ${fmt(gap)} point${gap === 1 ? '' : 's'} behind ${leadingSource.label}.`,
    });
  }

  // 3. Concentration — top-two share if > 50%
  if (topTwoShare >= 0.5 && rows.length >= 3) {
    insights.push({
      text: `The top two sources account for ${fmtPct(topTwoShare)} of the group's average score.`,
    });
  }

  // 4. Lowest contributors (bottom 3 with non-zero values)
  const positiveRows = rows.filter((r) => r.groupValue > 0);
  const bottom = positiveRows.slice(-3);
  if (bottom.length >= 2 && positiveRows.length >= 5) {
    const names = bottom.map((r) => r.label);
    const last = names.pop()!;
    insights.push({
      text: `${names.join(', ')} and ${last} contribute the fewest points.`,
    });
  }

  // 5. Player comparison — biggest difference
  if (playerName) {
    const diffs = rows
      .filter((r) => r.diff !== null)
      .sort((a, b) => Math.abs(b.diff!) - Math.abs(a.diff!));
    const biggest = diffs[0];
    if (biggest && biggest.diff !== null && Math.abs(biggest.diff) >= 0.5) {
      const dir = biggest.diff > 0 ? 'more' : 'fewer';
      insights.push({
        text: `${playerName} scores ${fmt(Math.abs(biggest.diff))} ${dir} points from ${biggest.label} than the group average.`,
      });
    }
  }

  return insights.slice(0, 3);
}

export function GroupInsightPanel({
  summary,
  rows,
  playerName,
  gameCount,
  loading = false,
}: GroupInsightPanelProps) {
  if (loading) {
    return (
      <aside style={panelStyle} aria-label="Key group insights">
        <p style={headingStyle}>Key group insights</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.75rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div style={{ background: 'rgba(120,113,108,0.2)', borderRadius: '4px', height: '0.85rem', width: '100%' }} />
              <div style={{ background: 'rgba(120,113,108,0.15)', borderRadius: '4px', height: '0.85rem', marginTop: '0.3rem', width: '75%' }} />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const insights = buildInsights(summary, rows, playerName, gameCount);

  return (
    <aside style={panelStyle} aria-labelledby="insight-panel-title">
      <p id="insight-panel-title" style={headingStyle}>
        Key group insights
      </p>

      {insights.length === 0 ? (
        <p style={{ color: 'rgb(120,113,108)', fontSize: '0.82rem', marginTop: '0.75rem' }}>
          Insights will appear after finalized games are available.
        </p>
      ) : (
        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            listStyle: 'none',
            margin: 0,
            marginTop: '0.75rem',
            padding: 0,
          }}
        >
          {insights.map((ins, i) => (
            <li key={i} style={insightItemStyle}>
              <span
                aria-hidden="true"
                style={{
                  borderRadius: '999px',
                  background: 'rgba(201,119,56,0.25)',
                  color: 'rgb(253,186,116)',
                  display: 'inline-flex',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  height: '18px',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '0.5rem',
                  minWidth: '18px',
                  verticalAlign: 'text-bottom',
                }}
              >
                {i + 1}
              </span>
              {ins.text}
            </li>
          ))}
        </ul>
      )}

      <p style={footerNoteStyle}>
        Score-source values are averages from finalized games.
      </p>
    </aside>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background:
    'radial-gradient(circle at 85% 15%, rgba(201,119,56,0.10), transparent 12rem), rgba(12,10,9,0.55)',
  border: '1px solid rgba(120,113,108,0.28)',
  borderRadius: '1rem',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  padding: '1rem 1.1rem',
};

const headingStyle: React.CSSProperties = {
  color: 'rgb(253,186,116)',
  fontSize: '0.68rem',
  fontWeight: 800,
  letterSpacing: '0.17em',
  margin: 0,
  textTransform: 'uppercase',
};

const insightItemStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.18)',
  border: '1px solid rgba(120,113,108,0.2)',
  borderRadius: '0.6rem',
  color: 'rgb(214,211,209)',
  fontSize: '0.82rem',
  lineHeight: 1.55,
  padding: '0.55rem 0.7rem',
};

const footerNoteStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(120,113,108,0.18)',
  color: 'rgb(120,113,108)',
  fontSize: '0.7rem',
  marginTop: 'auto',
  paddingTop: '0.75rem',
};
