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
import {
  chartAxisTick,
  chartGridStroke,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import type {
  CorporationSelectionStat,
  PreludeSelectionStat,
} from '@/lib/db/selection-stats-repo';

// Stack order and hues validated together (CVD-safe adjacency on the dark
// surface) with the dataviz palette validator — keep order and colors paired.
const ORIGIN_SERIES = [
  { color: '#c14e1e', key: 'tr', label: 'TR' },
  { color: '#3388bb', key: 'cities', label: 'Cities' },
  { color: '#5f8b2c', key: 'greenery', label: 'Greenery' },
  { color: '#9a5fd0', key: 'milestones', label: 'Milestones' },
  { color: '#b08234', key: 'cards', label: 'Cards' },
  { color: '#c04a72', key: 'awards', label: 'Awards' },
] as const;
const CHART_SURFACE = '#141a22';

type OriginRow = (CorporationSelectionStat | PreludeSelectionStat) & {
  name: string;
};

function toShareRow(row: OriginRow) {
  const parts = {
    awards: Math.max(0, row.avg_award_points),
    cards: Math.max(0, row.avg_card_points),
    cities: Math.max(0, row.avg_cities_points),
    greenery: Math.max(0, row.avg_greenery_points),
    milestones: Math.max(0, row.avg_milestone_points),
    tr: Math.max(0, row.avg_tr_points),
  };
  const total = Object.values(parts).reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return null;
  }

  return {
    name: `${row.name} (${row.plays})`,
    ...Object.fromEntries(
      Object.entries(parts).map(([key, value]) => [
        key,
        Math.round((value / total) * 1000) / 10,
      ]),
    ),
  };
}

export function SelectionOriginChart(props: { rows: OriginRow[] }) {
  const data = props.rows
    .slice(0, 8)
    .map(toShareRow)
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (data.length === 0) {
    return null;
  }

  return (
    <div style={{ height: 60 + data.length * 34 }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
          <CartesianGrid horizontal={false} stroke={chartGridStroke} strokeDasharray="3 3" />
          <XAxis
            domain={[0, 100]}
            tick={chartAxisTick}
            tickFormatter={(value: number) => `${value}%`}
            type="number"
          />
          <YAxis dataKey="name" tick={chartAxisTick} type="category" width={170} />
          <Tooltip
            contentStyle={chartTooltipStyle}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(value, label) => [`${String(value)}%`, String(label)]}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {ORIGIN_SERIES.map((series) => (
            <Bar
              dataKey={series.key}
              fill={series.color}
              key={series.key}
              name={series.label}
              stackId="origin"
              stroke={CHART_SURFACE}
              strokeWidth={2}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
