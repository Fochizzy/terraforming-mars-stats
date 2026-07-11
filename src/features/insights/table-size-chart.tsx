'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartSeriesColors,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import type { PlayerCountPerformanceRow } from '@/lib/db/extended-analytics-repo';

export type TableSizeDatum = {
  averageScore: number;
  gamesPlayed: number;
  tableSize: string;
  winRate: number | null;
};

export function buildTableSizeData(
  rows: PlayerCountPerformanceRow[],
  focusPlayerId: string | null,
): TableSizeDatum[] {
  const relevantRows = focusPlayerId
    ? rows.filter((row) => row.playerId === focusPlayerId)
    : rows;
  const bySize = new Map<
    number,
    { games: number; scoreSum: number; wins: number }
  >();

  for (const row of relevantRows) {
    const entry = bySize.get(row.playerCount) ?? {
      games: 0,
      scoreSum: 0,
      wins: 0,
    };

    entry.games += row.gamesPlayed;
    entry.scoreSum += row.averageScore * row.gamesPlayed;
    entry.wins += row.wins;
    bySize.set(row.playerCount, entry);
  }

  return [...bySize.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([playerCount, entry]) => ({
      averageScore:
        entry.games === 0
          ? 0
          : Math.round((entry.scoreSum / entry.games) * 10) / 10,
      gamesPlayed: entry.games,
      tableSize: `${playerCount}p`,
      // Group-wide win rate at a table size is 1/n by construction, so it is
      // only reported for a focused player.
      winRate: focusPlayerId
        ? Math.round((entry.wins / Math.max(entry.games, 1)) * 100)
        : null,
    }));
}

export function TableSizeChart(props: {
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  rows: PlayerCountPerformanceRow[];
}) {
  const data = buildTableSizeData(props.rows, props.focusPlayerId);

  return (
    <ChartFrame
      description="How win rate and average score change with the number of players at the table."
      title={
        props.focusPlayerName
          ? `Table Size Performance for ${props.focusPlayerName}`
          : 'Table Size Performance'
      }
    >
      {data.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Table-size splits will appear after finalized games are logged.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <ResponsiveContainer height={260} width="100%">
            <ComposedChart
              data={data}
              margin={{ bottom: 12, left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="tableSize" tick={chartAxisTick} />
              <YAxis tick={chartAxisTick} yAxisId="score" />
              {props.focusPlayerId ? (
                <YAxis
                  domain={[0, 100]}
                  orientation="right"
                  tick={chartAxisTick}
                  unit="%"
                  yAxisId="rate"
                />
              ) : null}
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Bar
                dataKey="averageScore"
                fill={chartSeriesColors.accent}
                name="Avg score"
                radius={[10, 10, 0, 0]}
                yAxisId="score"
              />
              {props.focusPlayerId ? (
                <Line
                  dataKey="winRate"
                  dot
                  name="Win rate"
                  stroke={chartSeriesColors.greenery}
                  strokeWidth={3}
                  type="monotone"
                  yAxisId="rate"
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="grid gap-3 md:grid-cols-3">
            {data.map((entry) => (
              <article className="tm-stat-card" key={entry.tableSize}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-stone-100">
                    {entry.tableSize} games
                  </h3>
                  {entry.winRate !== null ? (
                    <p className="tm-accent-copy text-sm">{entry.winRate}% wins</p>
                  ) : null}
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  {entry.gamesPlayed} results | avg {entry.averageScore} points
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </ChartFrame>
  );
}
