'use client';

import { useMemo, useState } from 'react';
import type { ScoringSourceRow } from './scoring-calculations';
import { fmt } from './scoring-calculations';

// ─── Icon map (local /icons/ paths that are already in the project) ──────────

const ICON_MAP: Partial<Record<string, string>> = {
  'Terraform Rating': '/icons/Terraform_Rating.png',
  'Card Points': '/icons/Card_Points.png',
  'Other Card': '/icons/Other_Card.png',
  Greenery: '/icons/Greenery.png',
  Cities: '/icons/City.png',
  Milestones: '/icons/Milestones.png',
  Awards: '/icons/Awards.png',
  Jovian: '/icons/Jovian.png',
  Microbes: '/icons/Microbe.png',
  Animals: '/icons/Animal.png',
};

// ─── Bar color helpers ────────────────────────────────────────────────────────

/** Returns the fill color for the group-average bar segment. */
function groupBarColor(rank: number): string {
  // rank is 1-based (1 = highest value)
  if (rank === 1) return '#4db6e8'; // brightest cyan — top source
  if (rank === 2) return '#3a9ec8'; // secondary highlight
  return 'rgba(56,189,248,0.52)';  // muted cyan for the rest
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

type TooltipState = {
  row: ScoringSourceRow;
  top: number;
};

function BarChartTooltip({
  state,
  playerName,
}: {
  state: TooltipState;
  playerName: string | null;
}) {
  const { row } = state;
  return (
    <div
      aria-live="polite"
      role="tooltip"
      style={{
        background: '#13191f',
        border: '1px solid rgba(214,130,66,0.38)',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(4,6,10,0.65)',
        color: 'var(--tm-text)',
        fontSize: '0.78rem',
        left: '50%',
        lineHeight: 1.6,
        maxWidth: '15rem',
        minWidth: '12rem',
        padding: '0.6rem 0.85rem',
        pointerEvents: 'none',
        position: 'absolute',
        top: state.top,
        transform: 'translateX(-50%)',
        zIndex: 20,
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: '0.3rem', color: 'rgb(253, 186, 116)' }}>
        {row.label}
      </p>
      <p style={{ margin: 0 }}>
        Group avg:{' '}
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmt(row.groupValue)}</span>
      </p>
      {row.playerValue !== null && (
        <>
          <p style={{ margin: 0 }}>
            {playerName ?? 'Player'}:{' '}
            <span style={{ color: '#56c9f3', fontWeight: 600 }}>{fmt(row.playerValue)}</span>
          </p>
          {row.diff !== null && (
            <p style={{ margin: 0, color: row.diff >= 0 ? '#4ade80' : '#fb7185' }}>
              Diff: {row.diff >= 0 ? '+' : ''}
              {fmt(row.diff)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Single bar row ───────────────────────────────────────────────────────────

type BarRowProps = {
  row: ScoringSourceRow;
  playerName: string | null;
  rank: number;
  onTooltipOpen: (state: TooltipState) => void;
  onTooltipClose: () => void;
};

function BarRow({ row, playerName, rank, onTooltipOpen, onTooltipClose }: BarRowProps) {
  const [hovered, setHovered] = useState(false);
  const icon = ICON_MAP[row.label];

  function openTooltip(e: React.MouseEvent<HTMLDivElement> | React.FocusEvent<HTMLDivElement>) {
    setHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = e.currentTarget
      .closest('[data-bar-chart]')
      ?.getBoundingClientRect();
    const top = containerRect ? rect.top - containerRect.top : 0;
    onTooltipOpen({ row, top });
  }

  function closeTooltip() {
    setHovered(false);
    onTooltipClose();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hovered) {
        closeTooltip();
      } else {
        setHovered(true);
        const rect = e.currentTarget.getBoundingClientRect();
        const containerRect = e.currentTarget
          .closest('[data-bar-chart]')
          ?.getBoundingClientRect();
        const top = containerRect ? rect.top - containerRect.top : 0;
        onTooltipOpen({ row, top });
      }
    }
    if (e.key === 'Escape') closeTooltip();
  }

  const ariaLabel = [
    `${row.label}: group average ${fmt(row.groupValue)} points`,
    row.playerValue !== null
      ? `${playerName ?? 'Selected player'} ${fmt(row.playerValue)} points`
      : '',
    row.diff !== null ? `difference ${row.diff >= 0 ? '+' : ''}${fmt(row.diff)}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      aria-label={ariaLabel}
      onBlur={closeTooltip}
      onFocus={openTooltip}
      onKeyDown={handleKeyDown}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      role="row"
      style={{
        alignItems: 'center',
        background: hovered ? 'rgba(249,115,22,0.06)' : 'transparent',
        borderRadius: '8px',
        display: 'grid',
        gap: '0.5rem',
        gridTemplateColumns: '2rem minmax(0, 7rem) 1fr auto',
        minHeight: '44px',
        outline: hovered ? '1px solid rgba(249,115,22,0.28)' : 'none',
        outlineOffset: '-1px',
        padding: '0.25rem 0.5rem',
        position: 'relative',
        transition: 'background 120ms ease',
      }}
      tabIndex={0}
    >
      {/* Icon */}
      <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center' }}>
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            height={32}
            src={icon}
            style={{ display: 'block', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.55))', objectFit: 'contain', width: 32 }}
            width={32}
          />
        ) : (
          <span style={{ color: 'var(--tm-copper-400)', fontSize: '0.6rem', fontWeight: 700 }}>
            {row.label.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Label */}
      <span
        style={{
          color: '#e7e0d8',
          fontSize: '0.85rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={row.label}
      >
        {row.label}
      </span>

      {/* Bar tracks */}
      <div
        aria-hidden="true"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: row.playerValue !== null ? '2px' : '0',
        }}
      >
        {/* Group bar — cyan/blue, brighter at top ranks */}
        <div
          style={{
            background: 'rgba(12,15,20,0.72)',
            borderRadius: '999px',
            height: row.playerValue !== null ? '0.45rem' : '0.6rem',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              background: groupBarColor(rank),
              borderRadius: '999px',
              height: '100%',
              transition: 'width 380ms cubic-bezier(0.22,0.61,0.36,1)',
              width: `${Math.max(row.groupFillPct, row.groupValue > 0 ? 1 : 0)}%`,
            }}
          />
        </div>

        {/* Player bar (when selected) */}
        {row.playerValue !== null && (
          <div
            style={{
              background: 'rgba(12,15,20,0.72)',
              borderRadius: '999px',
              height: '0.45rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: '#56c9f3',
                borderRadius: '999px',
                height: '100%',
                transition: 'width 380ms cubic-bezier(0.22,0.61,0.36,1)',
                width: `${Math.max(row.playerFillPct ?? 0, row.playerValue > 0 ? 1 : 0)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Value */}
      <div
        style={{
          display: 'flex',
          flexDirection: row.playerValue !== null ? 'column' : 'row',
          gap: '1px',
          minWidth: row.playerValue !== null ? '3.2rem' : '2.8rem',
          textAlign: 'right',
        }}
      >
        <span
          style={{
            color: rank === 1 ? '#9bd8f4' : rank === 2 ? '#7ac8e8' : '#c8bfb5',
            fontFamily: 'var(--tm-font-display)',
            fontSize: '0.8rem',
            fontWeight: rank <= 2 ? 700 : 500,
          }}
        >
          {fmt(row.groupValue)}
        </span>
        {row.playerValue !== null && (
          <span
            style={{
              color: '#56c9f3',
              fontFamily: 'var(--tm-font-display)',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            {fmt(row.playerValue)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Chart body ──────────────────────────────────────────────────────────────

type ScoreSourceBarChartProps = {
  rows: ScoringSourceRow[];
  playerName: string | null;
  loading?: boolean;
};

export function ScoreSourceBarChart({
  rows,
  playerName,
  loading = false,
}: ScoreSourceBarChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const upperBound = useMemo(() => {
    const max = Math.max(...rows.map((r) => Math.max(r.groupValue, r.playerValue ?? 0)), 1);
    return Math.ceil(max / 5) * 5 || 5;
  }, [rows]);

  const gridStep = upperBound <= 20 ? 5 : upperBound <= 40 ? 10 : 15;
  const gridLines: number[] = [];
  for (let v = gridStep; v <= upperBound; v += gridStep) gridLines.push(v);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(120,113,108,0.15)',
              borderRadius: '8px',
              height: '44px',
            }}
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p style={{ color: 'rgb(120, 113, 108)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
        Score-source averages will appear here after finalized games exist.
      </p>
    );
  }

  return (
    <div data-bar-chart="" style={{ position: 'relative' }}>
      {tooltip !== null && (
        <BarChartTooltip state={tooltip} playerName={playerName} />
      )}

      {/* X-axis grid overlay */}
      <div
        aria-hidden="true"
        style={{
          bottom: '1.7rem',
          insetInline: 'calc(2rem + 0.5rem + 7rem + 0.5rem)',
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
        }}
      >
        {gridLines.map((v) => (
          <div
            key={v}
            style={{
              borderLeft: '1px solid rgba(192,162,127,0.11)',
              bottom: 0,
              left: `${(v / upperBound) * 100}%`,
              position: 'absolute',
              top: 0,
            }}
          />
        ))}
      </div>

      <div
        aria-label="Score breakdown chart"
        role="rowgroup"
        style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}
      >
        {rows.map((row, index) => (
          <BarRow
            key={row.key}
            onTooltipClose={() => setTooltip(null)}
            onTooltipOpen={(s) => setTooltip(s)}
            playerName={playerName}
            rank={index + 1}
            row={row}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div
        aria-hidden="true"
        style={{
          color: 'rgb(107,101,96)',
          display: 'flex',
          fontSize: '0.65rem',
          justifyContent: 'space-between',
          marginLeft: 'calc(2rem + 0.5rem + 7rem + 0.5rem)',
          marginTop: '0.4rem',
          paddingRight: '4rem',
        }}
      >
        <span>0</span>
        {gridLines.map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>

      {/* Reduced-motion override */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-bar-chart] div { transition: none !important; }
        }
        [role="row"]:focus-visible {
          outline: 2px solid rgba(249,115,22,0.72) !important;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// ─── Chart legend ─────────────────────────────────────────────────────────────

type ChartLegendProps = {
  playerName: string | null;
};

export function ScoreSourceChartLegend({ playerName }: ChartLegendProps) {
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem 1rem',
        marginTop: '0.5rem',
      }}
      aria-label="Chart legend"
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: '0.4rem' }}>
        <span
          aria-hidden="true"
          style={{
            background: '#3a9ec8',
            borderRadius: '3px',
            display: 'inline-block',
            height: '10px',
            width: '10px',
          }}
        />
        <span style={{ color: 'rgb(214, 211, 209)', fontSize: '0.75rem' }}>
          Group average
        </span>
      </div>
      {playerName && (
        <div style={{ alignItems: 'center', display: 'flex', gap: '0.4rem' }}>
          {/* Line + dot marker */}
          <svg aria-hidden="true" height="12" viewBox="0 0 28 12" width="28">
            <line stroke="#56c9f3" strokeWidth="2" x1="0" x2="28" y1="6" y2="6" />
            <circle cx="14" cy="6" fill="#56c9f3" r="3.5" stroke="#07131b" strokeWidth="1" />
          </svg>
          <span
            style={{
              color: 'rgb(86, 201, 243)',
              fontSize: '0.75rem',
              maxWidth: '12rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={playerName}
          >
            {playerName}
          </span>
        </div>
      )}
    </div>
  );
}
