'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  chartAxisTick,
  chartGridStroke,
  chartPlayerSeriesColors,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import { SelectChevron } from '@/components/ui/select-chevron';
import type { GenerationPaceRow } from '@/lib/db/extended-analytics-repo';

export type PaceGameOption = {
  gameId: string;
  label: string;
};

export function listPaceGames(rows: GenerationPaceRow[]): PaceGameOption[] {
  const byGame = new Map<string, { playedOn: string; playerNames: Set<string> }>();

  for (const row of rows) {
    const entry = byGame.get(row.gameId) ?? {
      playedOn: row.playedOn,
      playerNames: new Set<string>(),
    };

    entry.playerNames.add(row.playerName);
    byGame.set(row.gameId, entry);
  }

  return [...byGame.entries()]
    .sort(
      (left, right) =>
        right[1].playedOn.localeCompare(left[1].playedOn) ||
        left[0].localeCompare(right[0]),
    )
    .map(([gameId, entry]) => ({
      gameId,
      label: `${entry.playedOn} — ${[...entry.playerNames]
        .sort((leftName, rightName) => leftName.localeCompare(rightName))
        .join(', ')}`,
    }));
}

export type PaceChartModel = {
  playerNames: string[];
  points: Array<Record<string, number | string>>;
};

export function buildPaceChartData(
  rows: GenerationPaceRow[],
  gameId: string,
): PaceChartModel {
  const gameRows = rows.filter((row) => row.gameId === gameId);
  const playerNames = [...new Set(gameRows.map((row) => row.playerName))].sort(
    (left, right) => left.localeCompare(right),
  );
  const maxGeneration = gameRows.reduce(
    (maximum, row) => Math.max(maximum, row.generationNumber),
    0,
  );
  const cardsByPlayerAndGeneration = new Map<string, number>();

  for (const row of gameRows) {
    cardsByPlayerAndGeneration.set(
      `${row.playerName}#${row.generationNumber}`,
      row.cardsPlayed,
    );
  }

  const runningTotals = new Map<string, number>(
    playerNames.map((playerName) => [playerName, 0]),
  );
  const points: Array<Record<string, number | string>> = [];

  for (let generation = 1; generation <= maxGeneration; generation += 1) {
    const point: Record<string, number | string> = { generation };

    for (const playerName of playerNames) {
      const playedThisGeneration =
        cardsByPlayerAndGeneration.get(`${playerName}#${generation}`) ?? 0;
      const total = (runningTotals.get(playerName) ?? 0) + playedThisGeneration;

      runningTotals.set(playerName, total);
      point[playerName] = total;
    }

    points.push(point);
  }

  return { playerNames, points };
}

export type PaceTotalsRow = {
  awardsFunded: number;
  cardsPlayed: number;
  citiesPlaced: number;
  greeneriesPlaced: number;
  milestonesClaimed: number;
  playerName: string;
};

export function buildPaceTotals(
  rows: GenerationPaceRow[],
  gameId: string,
): PaceTotalsRow[] {
  const byPlayer = new Map<string, PaceTotalsRow>();

  for (const row of rows) {
    if (row.gameId !== gameId) {
      continue;
    }

    const entry = byPlayer.get(row.playerName) ?? {
      awardsFunded: 0,
      cardsPlayed: 0,
      citiesPlaced: 0,
      greeneriesPlaced: 0,
      milestonesClaimed: 0,
      playerName: row.playerName,
    };

    entry.awardsFunded += row.awardsFunded;
    entry.cardsPlayed += row.cardsPlayed;
    entry.citiesPlaced += row.citiesPlaced;
    entry.greeneriesPlaced += row.greeneriesPlaced;
    entry.milestonesClaimed += row.milestonesClaimed;
    byPlayer.set(row.playerName, entry);
  }

  return [...byPlayer.values()].sort(
    (left, right) =>
      right.cardsPlayed - left.cardsPlayed ||
      left.playerName.localeCompare(right.playerName),
  );
}

export function GamePaceSection(props: { rows: GenerationPaceRow[] }) {
  const games = useMemo(() => listPaceGames(props.rows), [props.rows]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const activeGameId =
    selectedGameId && games.some((game) => game.gameId === selectedGameId)
      ? selectedGameId
      : games[0]?.gameId ?? null;
  const chartModel = activeGameId
    ? buildPaceChartData(props.rows, activeGameId)
    : null;
  const totals = activeGameId ? buildPaceTotals(props.rows, activeGameId) : [];

  return (
    <ChartFrame
      description="Replay how a single finalized game unfolded generation by generation — pick a game to watch each player's score build up."
      title="Game Pace Replay"
    >
      {games.length === 0 || !chartModel ? (
        <p className="tm-muted-copy text-sm">
          Pace replays unlock for finalized games imported from a game log.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative max-w-[420px]">
            <label className="tm-data-label" htmlFor="pace-game-select">
              Game
            </label>
            <select
              className="tm-input mt-2 w-full appearance-none pr-9"
              id="pace-game-select"
              onChange={(event) => setSelectedGameId(event.target.value)}
              value={activeGameId ?? ''}
            >
              {games.map((game) => (
                <option key={game.gameId} value={game.gameId}>
                  {game.label}
                </option>
              ))}
            </select>
            <span className="mt-2 block">
              <SelectChevron />
            </span>
          </div>
          <ResponsiveContainer height={300} width="100%">
            <LineChart
              data={chartModel.points}
              margin={{ bottom: 12, left: 0, right: 12, top: 12 }}
            >
              <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" />
              <XAxis
                allowDecimals={false}
                dataKey="generation"
                label={{
                  fill: 'var(--tm-muted)',
                  fontSize: 12,
                  position: 'insideBottom',
                  offset: -6,
                  value: 'Generation',
                }}
                tick={chartAxisTick}
              />
              <YAxis allowDecimals={false} tick={chartAxisTick} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              {chartModel.playerNames.map((playerName, index) => (
                <Line
                  dataKey={playerName}
                  dot
                  key={playerName}
                  stroke={
                    chartPlayerSeriesColors[index % chartPlayerSeriesColors.length]
                  }
                  strokeWidth={3}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="grid gap-3 md:grid-cols-2">
            {totals.map((row) => (
              <article className="tm-stat-card" key={row.playerName}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-stone-100">{row.playerName}</h3>
                  <p className="tm-accent-copy text-sm">
                    {row.cardsPlayed} cards
                  </p>
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  {row.greeneriesPlaced} greeneries | {row.citiesPlaced} cities |{' '}
                  {row.milestonesClaimed} milestones |{' '}
                  {row.awardsFunded} awards funded
                </p>
              </article>
            ))}
          </div>
          <p className="tm-muted-copy text-xs">
            Cumulative cards played per generation, reconstructed from the
            imported game log. Engine ramps show up as steepening lines.
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
