'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import type { PlacementDistributionRow } from '@/lib/db/extended-analytics-repo';

export type PlacementShareDatum = {
  first: number;
  fourthPlus: number;
  gamesPlayed: number;
  playerName: string;
  second: number;
  third: number;
};

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

export function PlacementDistributionChart(props: {
  rows: PlacementDistributionRow[];
}) {
  const data = buildPlacementShareData(props.rows);

  return (
    <ChartFrame
      description="How finishing positions are distributed — the share of games ending in first, second, and so on."
      title="Placement Spread"
    >
      {data.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Placement spreads will appear after finalized games are logged.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <ResponsiveContainer height={260} width="100%">
            <BarChart
              data={data}
              margin={{ bottom: 36, left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis
                angle={-20}
                dataKey="playerName"
                height={60}
                textAnchor="end"
                tick={chartAxisTick}
              />
              <YAxis domain={[0, 100]} tick={chartAxisTick} unit="%" />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Bar
                dataKey="first"
                fill={chartSeriesColors.greenery}
                name="1st"
                stackId="placement"
              />
              <Bar
                dataKey="second"
                fill={chartSeriesColors.accent}
                name="2nd"
                stackId="placement"
              />
              <Bar
                dataKey="third"
                fill={chartSeriesColors.partial}
                name="3rd"
                stackId="placement"
              />
              <Bar
                dataKey="fourthPlus"
                fill={chartSeriesColors.danger}
                name="4th+"
                stackId="placement"
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="tm-muted-copy text-xs">
            Share of finishes per player across all finalized games.
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
