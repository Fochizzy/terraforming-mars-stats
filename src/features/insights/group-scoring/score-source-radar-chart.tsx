'use client';

import { useState } from 'react';
import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';
import { SCORE_SOURCE_DEFS, computeRadarMax, fmt } from './scoring-calculations';

// ─── SVG geometry helpers ────────────────────────────────────────────────────

// Use all 10 sources for the radar
const ALL_RADAR_SOURCES = SCORE_SOURCE_DEFS;
const SOURCE_COUNT = ALL_RADAR_SOURCES.length;

const CHART_SIZE = 520;
const CHART_CENTER = CHART_SIZE / 2;
const CHART_RADIUS = 180;
const LABEL_RADIUS = 228;

function getPoint(index: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / SOURCE_COUNT;
  return {
    x: CHART_CENTER + Math.cos(angle) * radius,
    y: CHART_CENTER + Math.sin(angle) * radius,
  };
}

function getPolygonPoints(radius: number): string {
  return ALL_RADAR_SOURCES
    .map((_, i) => {
      const p = getPoint(i, radius);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

function getSeriesPoints(values: number[], maxValue: number): string {
  return values
    .map((v, i) => {
      const r = Math.max(0, Math.min(v / maxValue, 1)) * CHART_RADIUS;
      const p = getPoint(i, r);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

function getLabelAnchor(x: number): 'start' | 'middle' | 'end' {
  if (Math.abs(x - CHART_CENTER) < 20) return 'middle';
  return x < CHART_CENTER ? 'end' : 'start';
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

type TooltipDot = {
  index: number;
  groupValue: number;
  playerValue: number | null;
  x: number;
  y: number;
};

function RadarTooltip({
  dot,
  playerName,
}: {
  dot: TooltipDot;
  playerName: string | null;
}) {
  const source = ALL_RADAR_SOURCES[dot.index];
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
        left: `${(dot.x / CHART_SIZE) * 100}%`,
        lineHeight: 1.6,
        maxWidth: '12rem',
        minWidth: '9rem',
        padding: '0.5rem 0.7rem',
        pointerEvents: 'none',
        position: 'absolute',
        top: `${(dot.y / CHART_SIZE) * 100}%`,
        transform: 'translate(-50%, -130%)',
        zIndex: 20,
      }}
    >
      <p style={{ color: 'rgb(253,186,116)', fontWeight: 700, margin: 0 }}>
        {source?.label}
      </p>
      <p style={{ margin: 0 }}>
        Group: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmt(dot.groupValue)}</span>
      </p>
      {dot.playerValue !== null && (
        <p style={{ margin: 0 }}>
          {playerName ?? 'Player'}:{' '}
          <span style={{ color: '#56c9f3', fontWeight: 600 }}>{fmt(dot.playerValue)}</span>
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ScoreSourceRadarChartProps = {
  groupAverages: ScoreSourceAverages;
  playerAverages: ScoreSourceAverages | null;
  playerName: string | null;
};

export function ScoreSourceRadarChart({
  groupAverages,
  playerAverages,
  playerName,
}: ScoreSourceRadarChartProps) {
  const [hoveredDot, setHoveredDot] = useState<TooltipDot | null>(null);

  const groupValues = ALL_RADAR_SOURCES.map((s) => Math.max(0, groupAverages[s.key] ?? 0));
  const playerValues = playerAverages
    ? ALL_RADAR_SOURCES.map((s) => Math.max(0, playerAverages[s.key] ?? 0))
    : null;

  const maxValue = computeRadarMax(groupAverages, playerAverages);
  const ringRatios = [0.25, 0.5, 0.75, 1];

  const groupSeriesPoints = getSeriesPoints(groupValues, maxValue);
  const playerSeriesPoints = playerValues ? getSeriesPoints(playerValues, maxValue) : null;

  const ariaDescription = [
    `Radar chart showing group average scoring by source.`,
    playerName ? `${playerName} is overlaid for comparison.` : '',
    `Scale maximum: ${maxValue} points.`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div style={{ position: 'relative' }}>
      {hoveredDot !== null && (
        <RadarTooltip dot={hoveredDot} playerName={playerName} />
      )}

      <svg
        aria-describedby="radar-chart-desc"
        aria-label={ariaDescription}
        role="img"
        style={{ display: 'block', height: 'auto', overflow: 'visible', width: '100%' }}
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
      >
        <desc id="radar-chart-desc">{ariaDescription}</desc>

        {/* Background fill */}
        <circle cx={CHART_CENTER} cy={CHART_CENTER} fill="rgba(8,12,20,0.64)" r="220" />

        {/* Grid rings — neutral, not orange */}
        {ringRatios.map((ratio) => (
          <polygon
            fill={ratio === 1 ? 'rgba(10,15,22,0.08)' : 'rgba(10,15,22,0.04)'}
            key={`ring-${ratio}`}
            points={getPolygonPoints(CHART_RADIUS * ratio)}
            stroke={ratio === 1 ? 'rgba(192,162,127,0.28)' : 'rgba(120,113,108,0.22)'}
            strokeDasharray={ratio === 1 ? undefined : '2 5'}
            strokeWidth={ratio === 1 ? 1.2 : 0.9}
          />
        ))}

        {/* Spoke lines */}
        {ALL_RADAR_SOURCES.map((_, i) => {
          const outer = getPoint(i, CHART_RADIUS);
          return (
            <line
              key={`spoke-${i}`}
              stroke="rgba(120,113,108,0.32)"
              strokeWidth="1"
              x1={CHART_CENTER}
              x2={outer.x}
              y1={CHART_CENTER}
              y2={outer.y}
            />
          );
        })}

        {/* Group filled polygon */}
        <defs>
          <linearGradient id="grp-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--tm-copper-500)" stopOpacity="0.40" />
            <stop offset="100%" stopColor="var(--tm-rust-700)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="plr-fill" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#56c9f3" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#1a6fa0" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        <polygon
          fill="url(#grp-fill)"
          points={groupSeriesPoints}
          stroke="var(--tm-copper-500)"
          strokeLinejoin="round"
          strokeWidth="2.8"
        />

        {playerSeriesPoints && (
          <polygon
            fill="url(#plr-fill)"
            points={playerSeriesPoints}
            stroke="#56c9f3"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        )}

        {/* Group dots */}
        {groupValues.map((value, i) => {
          const r = (value / maxValue) * CHART_RADIUS;
          const p = getPoint(i, r);
          return (
            <circle
              cx={p.x}
              cy={p.y}
              fill="var(--tm-copper-500)"
              key={`gd-${i}`}
              onMouseEnter={() =>
                setHoveredDot({
                  index: i,
                  groupValue: value,
                  playerValue: playerValues ? playerValues[i] : null,
                  x: p.x,
                  y: p.y,
                })
              }
              onMouseLeave={() => setHoveredDot(null)}
              r="3.5"
              stroke="#130a06"
              strokeWidth="1.2"
              style={{ cursor: 'crosshair' }}
            />
          );
        })}

        {/* Player dots */}
        {playerValues &&
          playerValues.map((value, i) => {
            const r = (value / maxValue) * CHART_RADIUS;
            const p = getPoint(i, r);
            return (
              <circle
                cx={p.x}
                cy={p.y}
                fill="#56c9f3"
                key={`pd-${i}`}
                onMouseEnter={() =>
                  setHoveredDot({
                    index: i,
                    groupValue: groupValues[i],
                    playerValue: value,
                    x: p.x,
                    y: p.y,
                  })
                }
                onMouseLeave={() => setHoveredDot(null)}
                r="4"
                stroke="#071318"
                strokeWidth="1.5"
                style={{ cursor: 'crosshair' }}
              />
            );
          })}

        {/* Radial scale labels — horizontal, no "0" label */}
        {ringRatios.slice(1).map((ratio) => (
          <text
            fill="rgba(192,162,127,0.68)"
            fontFamily="var(--tm-font-body)"
            fontSize="11"
            key={`tick-${ratio}`}
            textAnchor="start"
            x={CHART_CENTER + CHART_RADIUS * ratio + 4}
            y={CHART_CENTER + 5}
          >
            {Math.round(maxValue * ratio)}
          </text>
        ))}

        {/* Category labels — pushed outward so they don't overlap the outer ring */}
        {ALL_RADAR_SOURCES.map((source, i) => {
          const lp = getPoint(i, LABEL_RADIUS);
          return (
            <text
              dominantBaseline="middle"
              fill="rgb(243,221,191)"
              fontFamily="var(--tm-font-body)"
              fontSize="14"
              fontWeight="600"
              key={`lbl-${source.key}`}
              textAnchor={getLabelAnchor(lp.x)}
              x={lp.x}
              y={lp.y}
            >
              {source.shortLabel}
            </text>
          );
        })}
      </svg>

      {/* Accessible data table */}
      <ul className="sr-only">
        {ALL_RADAR_SOURCES.map((source, i) => (
          <li key={`aria-${source.key}`}>
            {source.label}: group average {fmt(groupValues[i])}
            {playerValues ? `; ${playerName ?? 'selected player'} ${fmt(playerValues[i])}` : ''}.
          </li>
        ))}
      </ul>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [role="img"] * { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
