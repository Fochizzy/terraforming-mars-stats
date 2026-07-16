'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlacementDistributionRow = {
  gamesPlayed: number;
  groupId: string;
  placement: number;
  playerId: string;
  playerName: string;
};

export type PlacementShareDatum = {
  first: number;
  fourthPlus: number;
  gamesPlayed: number;
  playerName: string;
  second: number;
  third: number;
};

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

export function buildPlacementShareData(
  rows: PlacementDistributionRow[],
): PlacementShareDatum[] {
  const byPlayer = new Map<
    string,
    { first: number; fourthPlus: number; second: number; third: number; total: number }
  >();

  for (const row of rows) {
    const entry = byPlayer.get(row.playerName) ?? {
      first: 0,
      fourthPlus: 0,
      second: 0,
      third: 0,
      total: 0,
    };

    if (row.placement === 1) {
      entry.first += row.gamesPlayed;
    } else if (row.placement === 2) {
      entry.second += row.gamesPlayed;
    } else if (row.placement === 3) {
      entry.third += row.gamesPlayed;
    } else {
      entry.fourthPlus += row.gamesPlayed;
    }

    entry.total += row.gamesPlayed;
    byPlayer.set(row.playerName, entry);
  }

  const toShare = (value: number, total: number) =>
    total === 0 ? 0 : Math.round((value / total) * 1000) / 10;

  return [...byPlayer.entries()]
    .map(([playerName, entry]) => ({
      first: toShare(entry.first, entry.total),
      fourthPlus: toShare(entry.fourthPlus, entry.total),
      gamesPlayed: entry.total,
      playerName,
      second: toShare(entry.second, entry.total),
      third: toShare(entry.third, entry.total),
    }))
    .sort(
      (left, right) =>
        right.first - left.first ||
        right.second - left.second ||
        left.playerName.localeCompare(right.playerName),
    );
}

// ---------------------------------------------------------------------------
// Placement segments
// ---------------------------------------------------------------------------

const PLACEMENTS = [
  { color: '#65B946', dataKey: 'first',      label: '1st' },
  { color: '#4A9DEA', dataKey: 'second',     label: '2nd' },
  { color: '#F0A640', dataKey: 'third',      label: '3rd' },
  { color: '#F45F7A', dataKey: 'fourthPlus', label: '4th+' },
] as const;

type PlacementKey = (typeof PLACEMENTS)[number]['dataKey'];

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

type TooltipPayloadEntry = {
  color: string;
  dataKey: string;
  name: string;
  payload: PlacementShareDatum;
  value: number;
};

function PlacementTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;

  const gamesPlayed = payload[0]?.payload.gamesPlayed ?? 0;

  return (
    <div
      role="tooltip"
      style={{
        background: '#0e1623',
        border: '1px solid #293548',
        borderRadius: '12px',
        color: '#e8eaed',
        fontSize: '13px',
        lineHeight: '1.55',
        maxWidth: '200px',
        padding: '12px 14px',
      }}
    >
      <p
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontWeight: 600,
          marginBottom: '8px',
          paddingBottom: '6px',
        }}
      >
        {label}
        <span
          style={{
            color: '#7a8fa8',
            display: 'block',
            fontSize: '11px',
            fontWeight: 400,
          }}
        >
          {gamesPlayed} games
        </span>
      </p>
      {[...payload].reverse().map((entry) => (
        <div
          key={entry.dataKey}
          style={{
            alignItems: 'center',
            display: 'flex',
            gap: '8px',
            justifyContent: 'space-between',
            marginTop: '4px',
          }}
        >
          <span style={{ alignItems: 'center', display: 'flex', gap: '6px' }}>
            <span
              aria-hidden="true"
              style={{
                background: entry.color,
                borderRadius: '50%',
                display: 'inline-block',
                flexShrink: 0,
                height: '8px',
                width: '8px',
              }}
            />
            {entry.name}
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {entry.value}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom legend
// ---------------------------------------------------------------------------

function PlacementLegend({
  hiddenKeys,
  onToggle,
}: {
  hiddenKeys: Set<PlacementKey>;
  onToggle: (key: PlacementKey) => void;
}) {
  return (
    <div
      aria-label="Chart legend – click to show or hide a placement category"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '18px',
        justifyContent: 'center',
        marginTop: '16px',
      }}
    >
      {PLACEMENTS.map(({ color, dataKey, label }) => {
        const hidden = hiddenKeys.has(dataKey);
        return (
          <button
            key={dataKey}
            onClick={() => onToggle(dataKey)}
            style={{
              alignItems: 'center',
              background: 'none',
              border: 'none',
              color: hidden ? '#5a6a7e' : '#c8d4e0',
              cursor: 'pointer',
              display: 'inline-flex',
              fontSize: '13px',
              gap: '7px',
              outline: 'none',
              padding: '4px 2px',
              transition: 'color 200ms',
            }}
            type="button"
            aria-pressed={!hidden}
            onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? onToggle(dataKey) : undefined}
          >
            <span
              aria-hidden="true"
              style={{
                background: hidden ? '#354455' : color,
                borderRadius: '50%',
                display: 'inline-block',
                flexShrink: 0,
                height: '9px',
                transition: 'background 200ms',
                width: '9px',
              }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Percentage label inside bar segment
// ---------------------------------------------------------------------------

const MIN_LABEL_HEIGHT_PCT = 9;

function SegmentLabel({ viewBox, value }: { value?: number; viewBox?: { height?: number; width?: number; x?: number; y?: number } }) {
  if (value === undefined || value === null) return null;
  if ((viewBox?.height ?? 0) < MIN_LABEL_HEIGHT_PCT) return null;

  const cx = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2;
  const cy = (viewBox?.y ?? 0) + (viewBox?.height ?? 0) / 2;

  return (
    <text
      dominantBaseline="central"
      fill="rgba(255,255,255,0.92)"
      fontSize={12}
      fontWeight={600}
      textAnchor="middle"
      x={cx}
      y={cy}
    >
      {value}%
    </text>
  );
}

// ---------------------------------------------------------------------------
// Main chart component
// ---------------------------------------------------------------------------

export function PlacementDistributionChart({
  rows,
}: {
  rows: PlacementDistributionRow[];
}) {
  const data = buildPlacementShareData(rows);
  const [hiddenKeys, setHiddenKeys] = useState<Set<PlacementKey>>(new Set());
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  function toggleKey(key: PlacementKey) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const visiblePlacements = PLACEMENTS.filter((p) => !hiddenKeys.has(p.dataKey));

  return (
    <section
      aria-labelledby="placement-spread-title"
      style={{
        background: '#101722',
        border: '1px solid #293548',
        borderRadius: '20px',
        boxShadow: '0 16px 40px rgba(0,0,0,0.48)',
        padding: '28px 28px 24px',
      }}
    >
      {/* ── Hidden accessible summary ── */}
      <p className="sr-only">
        Stacked bar chart showing the share of finishing positions (1st, 2nd, 3rd,
        4th+) for each player across all finalized games. Each bar totals 100%.
      </p>

      {/* ── Header ── */}
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          justifyContent: 'space-between',
          marginBottom: '22px',
        }}
      >
        <div>
          <div style={{ alignItems: 'center', display: 'flex', gap: '12px' }}>
            <span
              aria-hidden="true"
              style={{
                alignItems: 'center',
                background: 'rgba(101,185,70,0.14)',
                border: '1px solid rgba(101,185,70,0.28)',
                borderRadius: '10px',
                color: '#65B946',
                display: 'flex',
                fontSize: '15px',
                height: '36px',
                justifyContent: 'center',
                width: '36px',
              }}
            >
              ▦
            </span>
            <h2
              id="placement-spread-title"
              style={{
                color: '#f0f2f5',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Placement Spread
            </h2>
          </div>
          <p
            style={{
              color: '#7a8fa8',
              fontSize: '13px',
              lineHeight: 1.55,
              marginTop: '8px',
              maxWidth: '620px',
            }}
          >
            How finishing positions are distributed — the share of games ending in
            first, second, third, or fourth and beyond.
          </p>
        </div>

        <div
          aria-label="Filter: All Seasons"
          style={{
            alignItems: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #2f3f52',
            borderRadius: '10px',
            color: '#c8d4e0',
            cursor: 'default',
            display: 'flex',
            flexShrink: 0,
            fontSize: '13px',
            gap: '7px',
            padding: '7px 13px',
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '14px' }}>📅</span>
          All Seasons
          <span aria-hidden="true" style={{ color: '#5a6a7e', fontSize: '11px' }}>▾</span>
        </div>
      </div>

      {/* ── Chart panel ── */}
      {data.length === 0 ? (
        <p style={{ color: '#7a8fa8', fontSize: '14px' }}>
          Placement spreads will appear after finalized games are logged.
        </p>
      ) : (
        <div
          style={{
            background: '#162131',
            border: '1px solid #29384d',
            borderRadius: '16px',
            padding: '20px 16px 16px',
          }}
        >
          {/* Sub-header row */}
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <p
              style={{
                color: '#7a8fa8',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Share of games (%)
            </p>
            <span
              style={{
                alignItems: 'center',
                background: 'rgba(74,157,234,0.12)',
                border: '1px solid rgba(74,157,234,0.24)',
                borderRadius: '8px',
                color: '#7ab8e8',
                display: 'inline-flex',
                fontSize: '11px',
                gap: '5px',
                padding: '3px 9px',
              }}
            >
              <span aria-hidden="true">ℹ</span>
              Each bar totals 100%
            </span>
          </div>

          {/* Recharts bar chart */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: `${Math.max(data.length * 100, 320)}px` }}>
              <ResponsiveContainer height={300} width="100%">
                <BarChart
                  barCategoryGap="28%"
                  barGap={4}
                  data={data}
                  margin={{ bottom: 8, left: 4, right: 8, top: 8 }}
                  onMouseMove={(state) => {
                    const idx = typeof state?.activeIndex === 'number' ? state.activeIndex : null;
                    setHoveredPlayer(idx !== null ? (data[idx]?.playerName ?? null) : null);
                  }}
                  onMouseLeave={() => setHoveredPlayer(null)}
                >
                  <CartesianGrid
                    stroke="rgba(192,162,127,0.14)"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="playerName"
                    tick={{
                      fill: '#8a9bae',
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#6a7d90', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(v) => `${v}%`}
                    width={38}
                  />
                  <Tooltip
                    content={<PlacementTooltip />}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  {/* Hidden default legend – replaced by custom one below */}
                  <Legend content={() => null} />

                  {visiblePlacements.map(({ color, dataKey, label }, index) => {
                    const isTop = index === visiblePlacements.length - 1;
                    const isBottom = index === 0;
                    return (
                      <Bar
                        key={dataKey}
                        dataKey={dataKey}
                        fill={color}
                        isAnimationActive
                        animationDuration={250}
                        maxBarSize={72}
                        name={label}
                        radius={
                          isTop && isBottom
                            ? [6, 6, 6, 6]
                            : isTop
                              ? [6, 6, 0, 0]
                              : isBottom
                                ? [0, 0, 6, 6]
                                : [0, 0, 0, 0]
                        }
                        stackId="placement"
                      >
                        {data.map((entry) => (
                          <Cell
                            key={entry.playerName}
                            fill={color}
                            opacity={
                              hoveredPlayer === null || hoveredPlayer === entry.playerName
                                ? 1
                                : 0.35
                            }
                            style={{ transition: 'opacity 200ms' }}
                          />
                        ))}
                        <LabelList
                          content={<SegmentLabel />}
                          dataKey={dataKey}
                          position="center"
                        />
                      </Bar>
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Custom legend */}
          <PlacementLegend hiddenKeys={hiddenKeys} onToggle={toggleKey} />
        </div>
      )}

      {/* ── Footer note ── */}
      {data.length > 0 && (
        <div
          style={{
            alignItems: 'center',
            background: 'rgba(101,185,70,0.07)',
            border: '1px solid rgba(101,185,70,0.18)',
            borderRadius: '10px',
            color: '#8aad78',
            display: 'flex',
            fontSize: '12px',
            gap: '8px',
            marginTop: '16px',
            padding: '9px 14px',
          }}
        >
          <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '14px' }}>ℹ</span>
          Share of finishing positions across all finalized games.
        </div>
      )}
    </section>
  );
}
