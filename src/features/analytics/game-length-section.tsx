'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartAxisTick, chartTooltipStyle } from '@/components/charts/chart-theme';
import type { GlobalGenerationMetricRow } from '@/lib/db/analytics-repo';

// ─── Types & constants ────────────────────────────────────────────────────────

type GenGroup = 'long' | 'short' | 'standard';

const GEN_GROUPS: Record<GenGroup, { label: string; range: string; test: (n: number) => boolean }> = {
  long:     { label: 'Long',     range: '12+ gens',   test: (n) => n >= 12 },
  short:    { label: 'Short',    range: '≤9 gens',    test: (n) => n <= 9 },
  standard: { label: 'Standard', range: '10–11 gens', test: (n) => n >= 10 && n <= 11 },
};

const GROUP_COLORS: Record<GenGroup, string> = {
  long:     '#63afd6',
  short:    '#c97738',
  standard: '#9ab363',
};

const BAR_FILL_HOVER = '#dda15d';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGenGroup(n: number): GenGroup {
  if (n <= 9) return 'short';
  if (n <= 11) return 'standard';
  return 'long';
}

function formatPts(n: number) {
  return n.toFixed(1);
}

// ─── Derived data builders ────────────────────────────────────────────────────

type GroupSummary = {
  avgPoints: number;
  avgPtsPerGen: number;
  games: number;
  group: GenGroup;
};

function buildGroupSummaries(rows: GlobalGenerationMetricRow[]): Record<GenGroup, GroupSummary> {
  const acc: Record<GenGroup, { games: number; totalPoints: number; totalPtsPerGen: number }> = {
    long:     { games: 0, totalPoints: 0, totalPtsPerGen: 0 },
    short:    { games: 0, totalPoints: 0, totalPtsPerGen: 0 },
    standard: { games: 0, totalPoints: 0, totalPtsPerGen: 0 },
  };

  for (const row of rows) {
    const g = getGenGroup(row.generationCount);
    acc[g].games += row.gamesPlayed;
    acc[g].totalPoints += row.averagePoints * row.gamesPlayed;
    acc[g].totalPtsPerGen += row.averagePointsPerGeneration * row.gamesPlayed;
  }

  function finalize(g: GenGroup): GroupSummary {
    const { games, totalPoints, totalPtsPerGen } = acc[g];
    return {
      avgPoints:    games > 0 ? totalPoints / games : 0,
      avgPtsPerGen: games > 0 ? totalPtsPerGen / games : 0,
      games,
      group: g,
    };
  }

  return {
    long:     finalize('long'),
    short:    finalize('short'),
    standard: finalize('standard'),
  };
}

type GenBarDatum = {
  count: number;
  generation: number;
  group: GenGroup;
  pct: number;
};

function buildBarData(rows: GlobalGenerationMetricRow[]): GenBarDatum[] {
  const total = rows.reduce((s, r) => s + r.gamesPlayed, 0);
  return [...rows]
    .sort((a, b) => a.generationCount - b.generationCount)
    .map((row) => ({
      count:      row.gamesPlayed,
      generation: row.generationCount,
      group:      getGenGroup(row.generationCount),
      pct:        total > 0 ? (row.gamesPlayed / total) * 100 : 0,
    }));
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

type GenTooltipProps = {
  active?: boolean;
  label?: number | string;
  payload?: Array<{ payload: GenBarDatum; value: number }>;
};

function GenTooltip({ active, label, payload }: GenTooltipProps) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  const groupInfo = GEN_GROUPS[datum.group];

  return (
    <div
      style={{
        ...chartTooltipStyle,
        fontSize: 13,
        minWidth: 168,
        padding: '10px 14px',
      }}
    >
      <p style={{ color: 'var(--tm-dust-300)', fontWeight: 600, marginBottom: 6 }}>
        Generation {label}
      </p>
      <p style={{ color: 'var(--tm-text)' }}>
        Games:{' '}
        <span style={{ color: BAR_FILL_HOVER, fontWeight: 700 }}>{datum.count}</span>
      </p>
      <p style={{ color: 'var(--tm-muted)', marginTop: 2 }}>
        {datum.pct.toFixed(1)}% of all finalized games
      </p>
      <p
        style={{
          borderTop: '1px solid rgba(192,162,127,0.2)',
          color: 'var(--tm-muted)',
          fontSize: 11,
          marginTop: 6,
          paddingTop: 6,
        }}
      >
        {groupInfo.label} game · {groupInfo.range}
      </p>
    </div>
  );
}

// ─── Metric row inside summary card ──────────────────────────────────────────

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          color: 'var(--tm-muted)',
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: 'var(--tm-text)',
          fontFamily: 'var(--tm-font-body)',
          fontSize: 16,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

type SummaryCardProps = {
  comparison: string | null;
  isBaseline: boolean;
  summary: GroupSummary;
};

function GameLengthCard({ comparison, isBaseline, summary }: SummaryCardProps) {
  const info = GEN_GROUPS[summary.group];
  const accentColor = GROUP_COLORS[summary.group];

  return (
    <article
      aria-label={`${info.label} games: ${summary.games} games, ${summary.games > 0 ? formatPts(summary.avgPoints) : 'no data'} average points`}
      style={{
        background: 'linear-gradient(180deg, rgba(32,19,16,0.72), rgba(15,18,24,0.84))',
        border: '1px solid rgba(192,162,127,0.22)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '14px 16px',
        transition: 'border-color 160ms ease',
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,162,127,0.22)';
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}99`;
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${accentColor}88`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,162,127,0.22)';
      }}
      tabIndex={0}
    >
      {/* Card header */}
      <div>
        <p
          style={{
            color: 'var(--tm-dust-300)',
            fontFamily: 'var(--tm-font-display)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {info.label}
        </p>
        <p style={{ color: 'var(--tm-muted)', fontSize: 12, marginTop: 2 }}>
          {info.range}
        </p>
      </div>

      {/* Primary value: game count */}
      <div>
        <p
          style={{
            color: 'var(--tm-text)',
            fontFamily: 'var(--tm-font-body)',
            fontSize: 32,
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {summary.games}
        </p>
        <p
          style={{
            color: 'var(--tm-muted)',
            fontSize: 11,
            letterSpacing: '0.1em',
            marginTop: 3,
            textTransform: 'uppercase',
          }}
        >
          Games
        </p>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
        <MetricRow
          label="Avg points"
          value={summary.games > 0 ? formatPts(summary.avgPoints) : '—'}
        />
        <MetricRow
          label="Pts / gen"
          value={summary.games > 0 ? formatPts(summary.avgPtsPerGen) : '—'}
        />
      </div>

      {/* Comparison badge */}
      {isBaseline && summary.games > 0 ? (
        <p
          style={{
            alignSelf: 'flex-start',
            background: 'rgba(99,175,214,0.1)',
            border: '1px solid rgba(99,175,214,0.25)',
            borderRadius: 999,
            color: 'var(--tm-ocean)',
            fontSize: 11,
            letterSpacing: '0.04em',
            padding: '2px 9px',
          }}
        >
          Baseline
        </p>
      ) : comparison !== null && summary.games > 0 ? (
        <p
          style={{
            alignSelf: 'flex-start',
            background: 'rgba(201,119,56,0.12)',
            border: '1px solid rgba(201,119,56,0.25)',
            borderRadius: 999,
            color: 'var(--tm-copper-400)',
            fontSize: 11,
            letterSpacing: '0.04em',
            padding: '2px 9px',
          }}
        >
          {comparison}
        </p>
      ) : null}
    </article>
  );
}

// ─── Main exported section ────────────────────────────────────────────────────

export function GameLengthSection({ rows }: { rows: GlobalGenerationMetricRow[] }) {
  if (rows.length === 0) return null;

  const barData = buildBarData(rows);
  const summaries = buildGroupSummaries(rows);
  const totalGames = rows.reduce((s, r) => s + r.gamesPlayed, 0);
  const shortBase = summaries.short.avgPoints;

  function vsShort(pts: number): string | null {
    if (shortBase <= 0 || pts <= 0 || summaries.short.games === 0) return null;
    const pct = Math.round(((pts - shortBase) / shortBase) * 100);
    if (pct === 0) return null;
    return pct > 0 ? `+${pct}% vs short` : `${pct}% vs short`;
  }

  // Key insight sentence
  const longPct =
    shortBase > 0 && summaries.short.games > 0 && summaries.long.games > 0
      ? Math.round(((summaries.long.avgPoints - shortBase) / shortBase) * 100)
      : null;

  const insightText =
    longPct !== null
      ? `Long games average ${longPct}% more points than short games, while scoring efficiency increases from ${formatPts(summaries.short.avgPtsPerGen)} to ${formatPts(summaries.long.avgPtsPerGen)} points per generation.`
      : 'Compare how scoring changes between shorter and longer games once more data is available.';

  // Per-bar fill colour keyed by group
  const groupBarFills = barData.map((d) => GROUP_COLORS[d.group]);

  // Count label formatter — whole numbers only
  const labelFormatter = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) ? String(n) : '';
  };

  return (
    <section
      aria-label="Game Length"
      className="tm-panel"
      style={{
        borderColor: 'rgba(201,119,56,0.32)',
        padding: '20px 20px 24px',
      }}
    >
      {/* ── Section header ── */}
      <div style={{ maxWidth: 680 }}>
        <h2
          style={{
            borderBottom: '1px solid rgba(201,119,56,0.28)',
            color: 'var(--tm-dust-300)',
            display: 'inline-block',
            fontFamily: 'var(--tm-font-display)',
            fontSize: '1.05rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            paddingBottom: 4,
            textTransform: 'uppercase',
          }}
        >
          Game Length
        </h2>
        <p
          style={{
            color: 'var(--tm-muted)',
            fontSize: 13,
            lineHeight: 1.6,
            marginTop: 6,
            maxWidth: 620,
          }}
        >
          How finalized games break down by generation count, and how scoring changes between shorter and longer games.
        </p>
      </div>

      {/* ── Key insight callout ── */}
      {totalGames > 0 ? (
        <div
          aria-label="Key insight"
          style={{
            alignItems: 'flex-start',
            background: 'rgba(14,18,24,0.72)',
            border: '1px solid rgba(192,162,127,0.18)',
            borderLeft: '3px solid rgba(201,119,56,0.52)',
            borderRadius: 10,
            display: 'flex',
            gap: 8,
            marginTop: 12,
            padding: '9px 14px',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              color: 'var(--tm-copper-400)',
              flexShrink: 0,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            ◆
          </span>
          <p style={{ color: 'var(--tm-muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {insightText}
          </p>
        </div>
      ) : null}

      {/* ── Chart ── */}
      <div style={{ marginTop: 18 }}>
        <p
          style={{
            color: 'var(--tm-muted)',
            fontSize: 10,
            letterSpacing: '0.14em',
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          Finalized Games by Generation Count
        </p>

        <div
          aria-label="Bar chart showing finalized game counts by generation count"
          role="img"
          style={{ height: 220, width: '100%' }}
        >
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              barCategoryGap="30%"
              data={barData}
              margin={{ bottom: 8, left: 4, right: 12, top: 24 }}
            >
              <CartesianGrid
                stroke="rgba(192,162,127,0.14)"
                strokeDasharray="3 4"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="generation"
                height={36}
                label={{
                  fill: 'var(--tm-muted)',
                  fontSize: 11,
                  offset: -4,
                  position: 'insideBottom',
                  value: 'Generation',
                }}
                tick={chartAxisTick}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                label={{
                  angle: -90,
                  fill: 'var(--tm-muted)',
                  fontSize: 11,
                  offset: 6,
                  position: 'insideLeft',
                  value: 'Finalized games',
                }}
                tick={chartAxisTick}
                tickLine={false}
                width={72}
              />
              <Tooltip
                content={<GenTooltip />}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Bar
                aria-label="Finalized game count by generation"
                dataKey="count"
                maxBarSize={52}
                radius={[5, 5, 0, 0]}
              >
                {barData.map((datum, index) => (
                  <Cell
                    fill={groupBarFills[index] ?? '#c97738'}
                    key={datum.generation}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  formatter={labelFormatter}
                  position="top"
                  style={{
                    fill: 'var(--tm-muted)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Group legend / band indicators */}
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            marginTop: 6,
          }}
        >
          {(['short', 'standard', 'long'] as GenGroup[]).map((group) => {
            const info = GEN_GROUPS[group];
            const color = GROUP_COLORS[group];
            return (
              <span
                key={group}
                style={{
                  alignItems: 'center',
                  color: 'var(--tm-muted)',
                  display: 'inline-flex',
                  fontSize: 11,
                  gap: 4,
                  letterSpacing: '0.06em',
                }}
              >
                <span
                  style={{
                    background: color,
                    borderRadius: 2,
                    display: 'inline-block',
                    height: 8,
                    opacity: 0.8,
                    width: 18,
                  }}
                />
                {info.label} ({info.range})
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          marginTop: 20,
        }}
      >
        <GameLengthCard
          comparison={null}
          isBaseline
          summary={summaries.short}
        />
        <GameLengthCard
          comparison={vsShort(summaries.standard.avgPoints)}
          isBaseline={false}
          summary={summaries.standard}
        />
        <GameLengthCard
          comparison={vsShort(summaries.long.avgPoints)}
          isBaseline={false}
          summary={summaries.long}
        />
      </div>

      {/* ── Player prompt ── */}
      <p
        style={{
          color: 'var(--tm-muted)',
          fontSize: 12,
          marginTop: 16,
          opacity: 0.75,
        }}
      >
        Select a player to compare how their performance changes by game length.
      </p>
    </section>
  );
}
