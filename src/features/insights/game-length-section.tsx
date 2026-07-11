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
  GameLengthBucket,
  GameLengthPerformanceRow,
  GenerationDistributionRow,
} from '@/lib/db/extended-analytics-repo';

const BUCKET_LABELS: Record<GameLengthBucket, string> = {
  long: 'Long (12+ gens)',
  short: 'Short (≤9 gens)',
  standard: 'Standard (10–11 gens)',
};

const BUCKET_ORDER: GameLengthBucket[] = ['short', 'standard', 'long'];

export type GameLengthBucketDatum = {
  averagePointsPerGeneration: number;
  averageScore: number;
  bucketLabel: string;
  gamesPlayed: number;
  winRate: number | null;
};

export function buildGameLengthBucketData(
  rows: GameLengthPerformanceRow[],
  focusPlayerId: string | null,
): GameLengthBucketDatum[] {
  const relevantRows = focusPlayerId
    ? rows.filter((row) => row.playerId === focusPlayerId)
    : rows;
  const byBucket = new Map<
    GameLengthBucket,
    { games: number; paceSum: number; scoreSum: number; wins: number }
  >();

  for (const row of relevantRows) {
    const entry = byBucket.get(row.lengthBucket) ?? {
      games: 0,
      paceSum: 0,
      scoreSum: 0,
      wins: 0,
    };

    entry.games += row.gamesPlayed;
    entry.paceSum += row.averagePointsPerGeneration * row.gamesPlayed;
    entry.scoreSum += row.averageScore * row.gamesPlayed;
    entry.wins += row.wins;
    byBucket.set(row.lengthBucket, entry);
  }

  return BUCKET_ORDER.flatMap((bucket) => {
    const entry = byBucket.get(bucket);

    if (!entry || entry.games === 0) {
      return [];
    }

    return [
      {
        averagePointsPerGeneration:
          Math.round((entry.paceSum / entry.games) * 10) / 10,
        averageScore: Math.round((entry.scoreSum / entry.games) * 10) / 10,
        bucketLabel: BUCKET_LABELS[bucket],
        gamesPlayed: entry.games,
        winRate: focusPlayerId
          ? Math.round((entry.wins / entry.games) * 100)
          : null,
      },
    ];
  });
}

export function GameLengthSection(props: {
  distributionRows: GenerationDistributionRow[];
  focusPlayerId: string | null;
  focusPlayerName: string | null;
  performanceRows: GameLengthPerformanceRow[];
}) {
  const histogram = props.distributionRows.map((row) => ({
    gamesPlayed: row.gamesPlayed,
    generations: `${row.generationCount}`,
  }));
  const buckets = buildGameLengthBucketData(
    props.performanceRows,
    props.focusPlayerId,
  );

  return (
    <ChartFrame
      description="How games break down by number of generations, and how results shift between shorter and longer games."
      title={
        props.focusPlayerName
          ? `Game Length for ${props.focusPlayerName}`
          : 'Game Length'
      }
    >
      {histogram.length === 0 && buckets.length === 0 ? (
        <p className="tm-muted-copy text-sm">
          Game-length insights will appear after finalized games are logged.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {histogram.length > 0 ? (
            <div>
              <h3 className="tm-data-label mb-2 text-xs">
                Generation Count Distribution (all finalized games)
              </h3>
              <ResponsiveContainer height={200} width="100%">
                <BarChart
                  data={histogram}
                  margin={{ bottom: 4, left: 0, right: 12, top: 8 }}
                >
                  <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
                  <XAxis dataKey="generations" tick={chartAxisTick} />
                  <YAxis allowDecimals={false} tick={chartAxisTick} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar
                    dataKey="gamesPlayed"
                    fill={chartSeriesColors.default}
                    name="Games"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {buckets.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {buckets.map((bucket) => (
                <article className="tm-stat-card" key={bucket.bucketLabel}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-stone-100">
                      {bucket.bucketLabel}
                    </h3>
                    {bucket.winRate !== null ? (
                      <p className="tm-accent-copy text-sm">
                        {bucket.winRate}% wins
                      </p>
                    ) : null}
                  </div>
                  <p className="tm-muted-copy mt-2 text-sm">
                    {bucket.gamesPlayed} results | avg {bucket.averageScore}{' '}
                    points | {bucket.averagePointsPerGeneration} pts/gen
                  </p>
                </article>
              ))}
            </div>
          ) : null}
          <p className="tm-muted-copy text-xs">
            {props.focusPlayerName
              ? `Does ${props.focusPlayerName} benefit when the game runs long?`
              : 'Focus a player to see who benefits when the game runs long.'}
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
