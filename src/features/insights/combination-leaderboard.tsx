'use client';

import { useState } from 'react';
import type { LeaderboardRow } from '@/lib/db/analytics-repo';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCompositeScore(value: number): string {
  // weightedScore is typically in the 0–1 range; multiply to a 0–100 display value
  return String(Math.round(value * 100));
}

function formatWinRate(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatAvgPlacement(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function formatScoreMargin(row: LeaderboardRow): string {
  const margin = row.averageWinMargin ?? row.averageLossGap ?? null;
  if (margin === null) return '—';
  const prefix = margin >= 0 ? '+' : '';
  return `${prefix}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(margin)}`;
}

const FORMULA_TOOLTIP =
  'Composite score = 50 % win rate + 30 % placement quality + 20 % score margin. All weights are normalised across the group so relative differences are preserved.';

const RANK_LABELS: Record<number, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
};

function rankLabel(rank: number): string {
  return RANK_LABELS[rank] ?? `${rank}th`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

type BarRowProps = {
  isFocused: boolean;
  maxScore: number;
  onClick: () => void;
  rank: number;
  row: LeaderboardRow;
  scoreDisplay: string;
};

function BarRow({ isFocused, maxScore, onClick, rank, row, scoreDisplay }: BarRowProps) {
  const [hovered, setHovered] = useState(false);

  // bar fill: 100 % of the container represents maxScore
  const fillPercent = maxScore > 0 ? Math.max(1, (row.weightedScore / maxScore) * 100) : 1;

  return (
    <div
      aria-label={`${rankLabel(rank)}: ${row.playerName}, composite score ${scoreDisplay}`}
      aria-pressed={isFocused}
      className="group relative"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      tabIndex={0}
    >
      {/* hover tooltip */}
      {hovered && (
        <div
          aria-hidden="true"
          style={{
            background: '#1c1917',
            border: '1px solid rgba(214,130,66,0.4)',
            borderRadius: '10px',
            bottom: 'calc(100% + 6px)',
            boxShadow: '0 8px 20px rgba(4,6,10,0.6)',
            color: '#f5f0e8',
            fontSize: '0.75rem',
            left: '50%',
            lineHeight: 1.6,
            padding: '0.45rem 0.7rem',
            pointerEvents: 'none',
            position: 'absolute',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          <strong style={{ color: '#f97316' }}>{row.playerName}</strong>
          {' · '}Composite {scoreDisplay}
          {' · '}Win rate {formatWinRate(row.winRate)}
          {' · '}Avg placement {formatAvgPlacement(row.averagePlacement)}
          {' · '}Margin {formatScoreMargin(row)}
        </div>
      )}

      {/* row layout */}
      <div
        style={{
          alignItems: 'center',
          borderRadius: '10px',
          display: 'grid',
          gap: '0.5rem',
          gridTemplateColumns: '2rem minmax(0,7rem) 1fr auto',
          padding: '0.45rem 0.5rem',
          transition: 'background 180ms ease',
          ...(isFocused
            ? { background: 'rgba(249,115,22,0.10)' }
            : hovered
              ? { background: 'rgba(255,255,255,0.04)' }
              : {}),
        }}
      >
        {/* rank badge */}
        <span
          aria-hidden="true"
          style={{
            color: isFocused ? '#f97316' : '#78716c',
            fontFamily: 'var(--tm-font-display)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textAlign: 'right',
          }}
        >
          #{rank}
        </span>

        {/* player name */}
        <span
          style={{
            color: isFocused ? '#fde8cf' : '#d6d3d1',
            fontSize: '0.875rem',
            fontWeight: isFocused ? 700 : 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'color 180ms ease',
            whiteSpace: 'nowrap',
          }}
          title={row.playerName}
        >
          {row.playerName}
        </span>

        {/* bar track */}
        <div
          aria-hidden="true"
          style={{
            alignItems: 'center',
            background: 'rgba(12,15,20,0.7)',
            borderRadius: '999px',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.45)',
            display: 'flex',
            height: '0.55rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: isFocused
                ? 'linear-gradient(90deg, #c2410c 0%, #f97316 62%, #fb923c 100%)'
                : 'linear-gradient(90deg, rgba(180,90,40,0.5) 0%, rgba(249,115,22,0.4) 100%)',
              borderRadius: '999px',
              boxShadow: isFocused ? '0 0 8px rgba(249,115,22,0.35)' : undefined,
              height: '100%',
              transition: 'width 350ms cubic-bezier(0.22,0.61,0.36,1)',
              width: `${fillPercent}%`,
            }}
          />
        </div>

        {/* score label */}
        <span
          style={{
            color: isFocused ? '#f97316' : '#a8a29e',
            fontFamily: 'var(--tm-font-display)',
            fontSize: '0.8rem',
            fontWeight: 700,
            minWidth: '2.4rem',
            textAlign: 'right',
            transition: 'color 180ms ease',
          }}
        >
          {scoreDisplay}
        </span>
      </div>

      {/* selected outline */}
      {isFocused && (
        <div
          aria-hidden="true"
          style={{
            border: '1px solid rgba(249,115,22,0.4)',
            borderRadius: '10px',
            inset: 0,
            pointerEvents: 'none',
            position: 'absolute',
          }}
        />
      )}

      {/* focus-visible ring – handled via CSS below */}
      <style>{`
        [role=button]:focus-visible {
          outline: 2px solid rgba(249,115,22,0.7);
          outline-offset: 2px;
          border-radius: 10px;
        }
        @media (prefers-reduced-motion: reduce) {
          [role=button] div { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── stat block ───────────────────────────────────────────────────────────────

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(32,19,16,0.72), rgba(15,18,24,0.84))',
        border: '1px solid rgba(192,162,127,0.20)',
        borderRadius: '12px',
        flex: '1 1 0',
        minWidth: '5rem',
        padding: '0.6rem 0.75rem',
      }}
    >
      <p
        style={{
          color: '#dda15d',
          fontFamily: 'var(--tm-font-display)',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          marginBottom: '0.3rem',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: '#f6eddf',
          fontSize: '1rem',
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── public component ─────────────────────────────────────────────────────────

type CombinationLeaderboardProps = {
  rows: LeaderboardRow[];
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  title?: string;
};

export function CombinationLeaderboard({
  rows,
  selectedPlayerId,
  onSelectPlayer,
  title = 'Combination Leaderboard',
}: CombinationLeaderboardProps) {
  const [showFormula, setShowFormula] = useState(false);

  const displayRows = rows.slice(0, 6);
  const maxScore = displayRows.reduce((max, row) => Math.max(max, row.weightedScore), 0);

  const focusedRow =
    selectedPlayerId !== null
      ? displayRows.find((row) => row.playerId === selectedPlayerId) ?? null
      : null;

  return (
    <section
      aria-label={title}
      style={{
        background: 'linear-gradient(180deg, rgba(29,35,43,0.92), rgba(11,14,20,0.94))',
        border: '1px solid rgba(214,130,66,0.28)',
        borderRadius: '1rem',
        boxShadow: '0 16px 32px rgba(4,6,10,0.45)',
        overflow: 'hidden',
        padding: '1rem',
        position: 'relative',
      }}
    >
      {/* header */}
      <div style={{ marginBottom: '0.9rem' }}>
        <h2
          style={{
            color: '#ecd09f',
            fontFamily: 'var(--tm-font-display)',
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            marginBottom: '0.4rem',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h2>
        <div style={{ alignItems: 'flex-start', display: 'flex', gap: '0.4rem' }}>
          <p style={{ color: '#a8a29e', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
            Composite score based on win rate, average placement, and score margin.
          </p>
          <button
            aria-expanded={showFormula}
            aria-label="Show score formula"
            onClick={() => setShowFormula((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: '#78716c',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '0.8rem',
              lineHeight: 1,
              padding: '2px 4px',
              transition: 'color 150ms ease',
            }}
            type="button"
          >
            ⓘ
          </button>
        </div>
        {showFormula && (
          <p
            role="note"
            style={{
              background: 'rgba(249,115,22,0.07)',
              border: '1px solid rgba(249,115,22,0.22)',
              borderRadius: '8px',
              color: '#d6d3d1',
              fontSize: '0.75rem',
              lineHeight: 1.55,
              marginTop: '0.45rem',
              padding: '0.5rem 0.65rem',
            }}
          >
            {FORMULA_TOOLTIP}
          </p>
        )}
      </div>

      {/* chart rows */}
      {displayRows.length === 0 ? (
        <p style={{ color: '#78716c', fontSize: '0.875rem' }}>
          Finalized leaderboard rows will appear here once games are logged.
        </p>
      ) : (
        <div
          aria-label="Leaderboard chart"
          role="list"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
        >
          {displayRows.map((row, index) => (
            <div key={row.playerId} role="listitem">
              <BarRow
                isFocused={row.playerId === selectedPlayerId}
                maxScore={maxScore}
                onClick={() => onSelectPlayer(row.playerId)}
                rank={index + 1}
                row={row}
                scoreDisplay={formatCompositeScore(row.weightedScore)}
              />
            </div>
          ))}
        </div>
      )}

      {/* selected player details */}
      {focusedRow && (
        <div style={{ marginTop: '1rem' }}>
          <p
            style={{
              color: '#f97316',
              fontFamily: 'var(--tm-font-display)',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}
          >
            Selected · {focusedRow.playerName}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <StatBlock label="Win Rate" value={formatWinRate(focusedRow.winRate)} />
            <StatBlock label="Avg Placement" value={formatAvgPlacement(focusedRow.averagePlacement)} />
            <StatBlock label="Score Margin" value={formatScoreMargin(focusedRow)} />
          </div>
        </div>
      )}
    </section>
  );
}
