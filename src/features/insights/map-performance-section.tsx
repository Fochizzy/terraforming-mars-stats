'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import type {
  GroupMapPerformanceRow,
  PlayerMapPerformanceRow,
} from '@/lib/db/extended-analytics-repo';

export type MapPerformanceDatum = {
  averageScore: number;
  detail: string;
  gamesPlayed: number;
  mapName: string;
  winRate: number | null;
};

export function buildMapPerformanceData(input: {
  focusPlayerId: string | null;
  groupRows: GroupMapPerformanceRow[];
  playerRows: PlayerMapPerformanceRow[];
}): MapPerformanceDatum[] {
  if (input.focusPlayerId) {
    return input.playerRows
      .filter((row) => row.playerId === input.focusPlayerId)
      .map((row) => ({
        averageScore: Math.round(row.averageScore * 10) / 10,
        detail: `avg place ${row.averagePlacement.toFixed(1)}`,
        gamesPlayed: row.gamesPlayed,
        mapName: row.mapName,
        winRate: Math.round(row.winRate * 100),
      }));
  }

  return input.groupRows.map((row) => ({
    averageScore: Math.round(row.averageScore * 10) / 10,
    detail: `avg ${row.averageGenerationCount.toFixed(1)} gens`,
    gamesPlayed: row.gamesPlayed,
    mapName: row.mapName,
    winRate: null,
  }));
}

export function MapPerformanceSection(props: {
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  groupRows: GroupMapPerformanceRow[];
  playerRows: PlayerMapPerformanceRow[];
}) {
  const data = buildMapPerformanceData({
    focusPlayerId: props.focusPlayerId,
    groupRows: props.groupRows,
    playerRows: props.playerRows,
  });

  return (
    <ChartFrame
      title={
        props.focusPlayerName
          ? `Map Performance for ${props.focusPlayerName}`
          : 'Map Performance'
      }
    >
      {data.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Map splits will appear after finalized games are logged.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <ResponsiveContainer height={240} width="100%">
            <BarChart
              data={data}
              margin={{ bottom: 12, left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis dataKey="mapName" tick={chartAxisTick} />
              <YAxis tick={chartAxisTick} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar
                dataKey={props.focusPlayerId ? 'winRate' : 'averageScore'}
                fill={chartSeriesColors.tr}
                name={props.focusPlayerId ? 'Win rate %' : 'Avg score'}
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="grid gap-3 md:grid-cols-3">
            {data.map((entry) => (
              <article className="tm-stat-card" key={entry.mapName}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-stone-100">{entry.mapName}</h3>
                  {entry.winRate !== null ? (
                    <p className="tm-accent-copy text-sm">{entry.winRate}% wins</p>
                  ) : null}
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  {entry.gamesPlayed} {entry.winRate !== null ? 'results' : 'games'}{' '}
                  | avg {entry.averageScore} points | {entry.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </ChartFrame>
  );
}
