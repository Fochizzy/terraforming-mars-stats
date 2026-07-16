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
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import type {
  GlobalAwardMetricRow,
  GlobalCorporationMetricRow,
  GlobalGenerationMetricRow,
  GlobalMilestoneMetricRow,
  GlobalPlayerCountMetricRow,
  GlobalStyleMetricRow,
  GlobalTagMetricRow,
} from '@/lib/db/analytics-repo';
import { AwardMapSummary } from './award-map-summary';
import { CorporationMetaPanel } from './corporation-meta-panel';
import { GameLengthSection } from './game-length-section';

type GlobalSummaryBoardProps = {
  globalAwardMetricRows?: GlobalAwardMetricRow[];
  globalCorporationMetricRows?: GlobalCorporationMetricRow[];
  globalGenerationMetricRows?: GlobalGenerationMetricRow[];
  globalMilestoneMetricRows?: GlobalMilestoneMetricRow[];
  globalPlayerCountMetricRows?: GlobalPlayerCountMetricRow[];
  globalStyleMetricRows?: GlobalStyleMetricRow[];
  globalTagMetricRows?: GlobalTagMetricRow[];
};

function formatDecimal(value: number | null, maximumFractionDigits = 2) {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function humanizeCode(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function contextLine(row: {
  mapId: string | null;
  mapName: string | null;
  playerCount: number;
}) {
  const mapLabel = row.mapName ?? row.mapId;
  const parts = [
    mapLabel ? `map ${mapLabel}` : null,
    row.playerCount > 0 ? `${row.playerCount} players` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

// ─── Table Size Performance section ───────────────────────────────────────────

/** Blue accent for highest-scoring format, progressively muted for others. */
const TABLE_SIZE_BAR_COLORS = ['#3b82f6', '#5b91d8', '#7aa6c8'] as const;

function formatScore1dp(value: number) {
  return value.toFixed(1);
}

/**
 * Returns the percentage difference between `compare` and `base`, rounded to
 * one decimal place, or `null` when `base` is zero.
 */
function pctDiff(base: number, compare: number): number | null {
  if (base === 0) return null;
  return Math.round(Math.abs((compare - base) / base) * 1000) / 10;
}

type TableSizeRow = {
  color: string;
  comparisonLabel: string | null;
  gamesPlayed: number;
  label: string;
  playerCount: number;
  score: number;
};

function buildTableSizeRows(rows: GlobalPlayerCountMetricRow[]): TableSizeRow[] {
  const sorted = [...rows].sort((a, b) => a.playerCount - b.playerCount);
  const maxScore = sorted.reduce((best, r) => Math.max(best, r.averagePoints), 0);
  const baseline = sorted.find((r) => r.averagePoints === maxScore);

  return sorted.map((row, index) => {
    const diff =
      baseline && row.playerCount !== baseline.playerCount
        ? pctDiff(baseline.averagePoints, row.averagePoints)
        : null;

    return {
      color: TABLE_SIZE_BAR_COLORS[index] ?? '#7aa6c8',
      comparisonLabel:
        diff !== null
          ? `${diff}% lower than ${baseline!.playerCount}-player`
          : null,
      gamesPlayed: row.gamesPlayed,
      label: `${row.playerCount} players`,
      playerCount: row.playerCount,
      score: row.averagePoints,
    };
  });
}

type TableSizeTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{ dataKey: string; value: number; payload: TableSizeRow }>;
};

function TableSizeTooltip({ active, label, payload }: TableSizeTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div
      style={{
        ...chartTooltipStyle,
        fontSize: 13,
        padding: '10px 14px',
      }}
    >
      <p style={{ color: 'var(--tm-dust-300)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ color: 'var(--tm-text)' }}>
        Avg score:{' '}
        <span style={{ color: '#9bd8f4', fontWeight: 600 }}>
          {formatScore1dp(row.score)}
        </span>
      </p>
      <p style={{ color: 'var(--tm-muted)', marginTop: 2 }}>
        {row.gamesPlayed} {row.gamesPlayed === 1 ? 'game' : 'games'}
      </p>
    </div>
  );
}

function TableSizePerformanceSection({ rows }: { rows: GlobalPlayerCountMetricRow[] }) {
  if (rows.length === 0) return null;

  const chartRows = buildTableSizeRows(rows);

  // Derive insight: difference between highest and lowest scoring formats.
  const byScore = [...chartRows].sort((a, b) => b.score - a.score);
  const highest = byScore[0];
  const lowest = byScore[byScore.length - 1];
  const scoreDiff =
    highest && lowest && highest.playerCount !== lowest.playerCount
      ? (highest.score - lowest.score).toFixed(1)
      : null;
  const insightText =
    scoreDiff !== null
      ? `Scores decline as table size increases. ${highest!.playerCount}-player games average ${scoreDiff} more points than ${lowest!.playerCount}-player games.`
      : 'Scores vary with table size. More player-count data will reveal the trend.';

  return (
    <section aria-label="Table Size Performance" className="tm-panel">
      {/* ── Header ── */}
      <div>
        <h2 className="tm-panel-title text-lg font-semibold tracking-[0.08em]">
          Table Size Performance
        </h2>
        <p
          className="mt-2 max-w-3xl text-sm leading-6"
          style={{ color: 'var(--tm-muted)' }}
        >
          How average score changes with the number of players at the table.
        </p>
      </div>

      {/* ── Insight callout ── */}
      <div
        aria-label="Key insight"
        className="mt-3"
        style={{
          alignItems: 'flex-start',
          background: 'rgba(20, 26, 34, 0.72)',
          border: '1px solid rgba(99, 175, 214, 0.22)',
          borderRadius: 10,
          display: 'flex',
          gap: 8,
          padding: '8px 12px',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            color: 'var(--tm-ocean)',
            flexShrink: 0,
            fontSize: 13,
            lineHeight: '1.6',
          }}
        >
          ◆
        </span>
        <p style={{ color: 'var(--tm-muted)', fontSize: 13, lineHeight: 1.6 }}>
          {insightText}
        </p>
      </div>

      {/* ── Bar chart ── */}
      <div
        aria-label="Bar chart of average score by player count"
        className="mt-3"
        role="img"
        style={{ height: 220, width: '100%' }}
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap="40%"
            data={chartRows}
            margin={{ bottom: 8, left: 12, right: 20, top: 24 }}
          >
            <CartesianGrid
              stroke={chartGridStroke}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={chartAxisTick}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              label={{
                angle: -90,
                offset: -2,
                position: 'insideLeft',
                style: { fill: 'var(--tm-muted)', fontSize: 11 },
                value: 'Average score',
              }}
              tick={chartAxisTick}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={<TableSizeTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Bar
              aria-label="Average score per player count"
              dataKey="score"
              maxBarSize={56}
              radius={[6, 6, 0, 0]}
            >
              {chartRows.map((row) => (
                <Cell fill={row.color} key={row.playerCount} />
              ))}
              <LabelList
                dataKey="score"
                formatter={(v: unknown) =>
                  typeof v === 'number' ? formatScore1dp(v) : String(v ?? '')
                }
                position="top"
                style={{ fill: 'var(--tm-text)', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Summary cards ── */}
      <div
        className="mt-3 grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
      >
        {chartRows.map((row) => (
          <article
            aria-label={`${row.playerCount}-player games: ${formatScore1dp(row.score)} average score, ${row.gamesPlayed} games`}
            className="tm-stat-card"
            key={row.playerCount}
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {/* Eyebrow */}
            <p
              style={{
                color: 'var(--tm-muted)',
                fontFamily: 'var(--tm-font-display)',
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
              }}
            >
              {row.playerCount}-player games
            </p>

            {/* Primary value */}
            <p
              style={{
                color: 'var(--tm-text)',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
              }}
            >
              {formatScore1dp(row.score)}
              <span
                style={{
                  color: 'var(--tm-muted)',
                  fontSize: 12,
                  fontWeight: 400,
                  marginLeft: 4,
                }}
              >
                avg score
              </span>
            </p>

            {/* Secondary: game count */}
            <p style={{ color: 'var(--tm-muted)', fontSize: 12 }}>
              {row.gamesPlayed} {row.gamesPlayed === 1 ? 'game' : 'games'}
            </p>

            {/* Status badge */}
            <span
              style={{
                alignSelf: 'flex-start',
                background:
                  row.comparisonLabel === null
                    ? 'rgba(59,130,246,0.18)'
                    : 'rgba(192,162,127,0.12)',
                border: `1px solid ${
                  row.comparisonLabel === null
                    ? 'rgba(99,175,214,0.32)'
                    : 'rgba(192,162,127,0.2)'
                }`,
                borderRadius: 999,
                color:
                  row.comparisonLabel === null ? '#9bd8f4' : 'var(--tm-muted)',
                display: 'inline-block',
                fontSize: 11,
                letterSpacing: '0.04em',
                padding: '2px 8px',
              }}
            >
              {row.comparisonLabel ?? 'Highest scoring format'}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── GlobalSummaryBoard ────────────────────────────────────────────────────────

export function GlobalSummaryBoard({
  globalAwardMetricRows = [],
  globalCorporationMetricRows = [],
  globalGenerationMetricRows = [],
  globalMilestoneMetricRows = [],
  globalPlayerCountMetricRows = [],
  globalStyleMetricRows = [],
  globalTagMetricRows = [],
}: GlobalSummaryBoardProps) {
  const hasRows =
    globalAwardMetricRows.length > 0 ||
    globalCorporationMetricRows.length > 0 ||
    globalGenerationMetricRows.length > 0 ||
    globalMilestoneMetricRows.length > 0 ||
    globalPlayerCountMetricRows.length > 0 ||
    globalStyleMetricRows.length > 0 ||
    globalTagMetricRows.length > 0;

  if (!hasRows) {
    return null;
  }

  return (
    <>
      {globalCorporationMetricRows.length > 0 ? (
        <CorporationMetaPanel rows={globalCorporationMetricRows} />
      ) : null}

      <ChartFrame title="Global Style Meta">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalStyleMetricRows.slice(0, 6).map((row) => {
            const context = contextLine(row);

            return (
              <article
                className="tm-stat-card"
                key={`${row.styleCode}-${row.mapId ?? 'all'}-${row.playerCount}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {humanizeCode(row.styleCode)}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.gamesPlayed} games | {row.wins} wins
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.winRate)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  {formatDecimal(row.averagePoints)} avg points |{' '}
                  {formatDecimal(row.averagePointsPerGeneration)} pts/gen
                </p>
                {context ? (
                  <p className="tm-muted-copy mt-2 text-sm">{context}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </ChartFrame>

      <ChartFrame title="Global Tag Meta">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalTagMetricRows.slice(0, 6).map((row) => {
            const context = contextLine(row);

            return (
              <article
                className="tm-stat-card"
                key={`${row.tagCode}-${row.mapId ?? 'all'}-${row.playerCount}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {humanizeCode(row.tagCode)}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.gamesPlayed} games | {formatDecimal(row.averageTagCount)}{' '}
                      avg tags
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.winRate)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  {formatDecimal(row.averagePoints)} avg points |{' '}
                  {formatDecimal(row.averagePointsPerGeneration)} pts/gen
                </p>
                {context ? (
                  <p className="tm-muted-copy mt-2 text-sm">{context}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </ChartFrame>

      <ChartFrame title="Global Milestone Meta">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalMilestoneMetricRows.slice(0, 6).map((row) => {
            const context = contextLine(row);

            return (
              <article
                className="tm-stat-card"
                key={`${row.milestoneId}-${row.mapId ?? 'all'}-${row.playerCount}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {row.milestoneName ?? humanizeCode(row.milestoneId)}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.gamesPlayed} games | {row.winnerWins} winner wins
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.milestoneWinnerWinRate)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  {formatDecimal(row.averageWinnerPointsPerGeneration)} winner pts/gen
                  {row.averageClaimedGeneration !== null
                    ? ` | claimed gen ${formatDecimal(row.averageClaimedGeneration)}`
                    : ''}
                </p>
                {context ? (
                  <p className="tm-muted-copy mt-2 text-sm">{context}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </ChartFrame>

      <AwardMapSummary rows={globalAwardMetricRows} />

      <TableSizePerformanceSection rows={globalPlayerCountMetricRows} />

      <GameLengthSection rows={globalGenerationMetricRows} />
    </>
  );
}
