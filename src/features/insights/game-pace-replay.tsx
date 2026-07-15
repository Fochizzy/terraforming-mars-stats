'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  GamePacePlayer,
  GamePaceReplay as GamePaceReplayData,
} from '@/lib/db/game-pace-repo';

const PLAYER_STYLES = [
  { color: '#38bdf8', dash: undefined },
  { color: '#84cc16', dash: '8 5' },
  { color: '#f59e0b', dash: '3 4' },
  { color: '#a78bfa', dash: '12 5 3 5' },
  { color: '#f472b6', dash: '2 5' },
] as const;

type ChartPoint = {
  generation: number;
  [playerId: string]: number;
};

type TooltipEntry = {
  color?: string;
  dataKey?: string | number;
  value?: number | string;
};

type PaceTooltipProps = {
  active?: boolean;
  label?: number | string;
  payload?: TooltipEntry[];
  players: GamePacePlayer[];
};

function formatGameDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00Z`));
}

function getGameLabel(game: GamePaceReplayData) {
  return `${formatGameDate(game.playedOn)} · ${game.players
    .map((player) => player.name)
    .join(' vs. ')}`;
}

function buildChartData(game: GamePaceReplayData): ChartPoint[] {
  return Array.from({ length: game.generationCount }, (_, index) => {
    const generation = index + 1;
    const point: ChartPoint = { generation };

    game.players.forEach((player) => {
      point[player.id] = player.pace[index]?.cards ?? 0;
    });

    return point;
  });
}

function PaceTooltip({ active, label, payload, players }: PaceTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const entries = payload
    .map((entry) => {
      const player = players.find(
        (candidate) => candidate.id === String(entry.dataKey),
      );

      return player
        ? {
            color: entry.color,
            name: player.name,
            value: Number(entry.value ?? 0),
          }
        : null;
    })
    .filter(
      (
        entry,
      ): entry is { color: string | undefined; name: string; value: number } =>
        entry !== null,
    );

  return (
    <div className="min-w-44 rounded-xl border border-stone-700/80 bg-stone-950/95 p-3 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
        Generation {label}
      </p>
      <div className="mt-2 space-y-1.5">
        {entries.map((entry) => (
          <div
            className="flex items-center justify-between gap-5 text-sm"
            key={entry.name}
          >
            <span className="flex items-center gap-2 text-stone-200">
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-stone-50">
              {entry.value} cards
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerSummaryCard({
  player,
  styleIndex,
}: {
  player: GamePacePlayer;
  styleIndex: number;
}) {
  const playerStyle = PLAYER_STYLES[styleIndex % PLAYER_STYLES.length];
  const stats = [
    { label: 'Greeneries', value: player.greeneries },
    { label: 'Cities', value: player.cities },
    { label: 'Milestones', value: player.milestones },
    { label: 'Awards funded', value: player.awards },
  ];

  return (
    <article
      className="flex h-full flex-col rounded-2xl border border-stone-800/90 border-t-2 bg-stone-950/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-5"
      style={{ borderTopColor: playerStyle.color }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-stone-50">
            {player.name}
          </h3>
          <p className="mt-1 text-xs text-stone-400">Final game totals</p>
        </div>
        <div className="shrink-0 text-right">
          <p
            className="text-2xl font-semibold tabular-nums"
            style={{ color: playerStyle.color }}
          >
            {player.cards}
          </p>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Cards played
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            className="rounded-xl border border-stone-800/80 bg-black/20 px-3 py-2.5"
            key={stat.label}
          >
            <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
              {stat.label}
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-stone-100">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function GamePaceReplay({ games }: { games: GamePaceReplayData[] }) {
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.gameId ?? '');
  const selectedGame =
    games.find((game) => game.gameId === selectedGameId) ?? games[0] ?? null;
  const chartData = useMemo(
    () => (selectedGame ? buildChartData(selectedGame) : []),
    [selectedGame],
  );

  if (!selectedGame) {
    return (
      <section
        className="tm-panel"
        style={{ borderColor: 'rgba(120, 113, 108, 0.42)' }}
      >
        <h2 className="tm-panel-title text-xl font-semibold">
          Game Pace Replay
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-300">
          Replay a finalized game generation by generation once a parsed game
          log is available.
        </p>
        <p className="mt-5 rounded-xl border border-stone-800 bg-black/20 p-4 text-sm text-stone-400">
          No finalized games with generation-level card activity are available
          yet.
        </p>
      </section>
    );
  }

  const totalCards = selectedGame.players.reduce(
    (total, player) => total + player.cards,
    0,
  );
  const chartMinWidth = Math.max(720, selectedGame.generationCount * 92);

  return (
    <section
      className="tm-panel p-4 sm:p-5 lg:p-6"
      style={{ borderColor: 'rgba(120, 113, 108, 0.42)' }}
    >
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h2 className="tm-panel-title text-xl font-semibold sm:text-[1.35rem]">
              Game Pace Replay
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-stone-300">
              Replay a finalized game generation by generation and compare how
              quickly each player built their engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-300">
            <span className="rounded-full border border-stone-700/80 bg-black/20 px-3 py-1.5 tabular-nums">
              {selectedGame.generationCount} generations
            </span>
            <span className="rounded-full border border-stone-700/80 bg-black/20 px-3 py-1.5 tabular-nums">
              {totalCards} cards
            </span>
            <span className="rounded-full border border-stone-700/80 bg-black/20 px-3 py-1.5 tabular-nums">
              {selectedGame.players.length} players
            </span>
          </div>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="flex w-full max-w-[32rem] flex-col gap-1.5">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
              Game
            </span>
            <select
              aria-label="Game pace replay game"
              className="w-full rounded-xl border border-stone-700/90 bg-stone-950 px-4 py-3 text-sm text-stone-50 outline-none transition hover:border-stone-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              onChange={(event) => setSelectedGameId(event.target.value)}
              value={selectedGame.gameId}
            >
              {games.map((game) => (
                <option key={game.gameId} value={game.gameId}>
                  {getGameLabel(game)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-x-5 gap-y-2 lg:justify-end">
            {selectedGame.players.map((player, index) => {
              const playerStyle = PLAYER_STYLES[index % PLAYER_STYLES.length];
              return (
                <span
                  className="inline-flex items-center gap-2 text-sm text-stone-300"
                  key={player.id}
                >
                  <span
                    aria-hidden="true"
                    className="w-6 border-t-2"
                    style={{
                      borderTopColor: playerStyle.color,
                      borderTopStyle: playerStyle.dash ? 'dashed' : 'solid',
                    }}
                  />
                  {player.name}
                </span>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-800/90 bg-black/15 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-stone-100">
                Cumulative cards played
              </h3>
              <p className="mt-0.5 text-xs text-stone-400">
                Hover or focus a point to compare the current generation.
              </p>
            </div>
            <span
              className="grid size-7 shrink-0 place-items-center rounded-full border border-stone-700 text-xs font-semibold text-stone-400"
              title="Card totals are reconstructed from the parsed game log. Steeper segments indicate faster engine growth."
            >
              i
            </span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div style={{ minWidth: chartMinWidth }}>
              <ResponsiveContainer height={400} width="100%">
                <LineChart
                  data={chartData}
                  margin={{ bottom: 34, left: 2, right: 14, top: 12 }}
                >
                  <CartesianGrid
                    stroke="rgba(120, 113, 108, 0.24)"
                    strokeDasharray="3 5"
                    vertical
                  />
                  <XAxis
                    axisLine={{ stroke: 'rgba(168, 162, 158, 0.45)' }}
                    dataKey="generation"
                    label={{
                      fill: '#a8a29e',
                      offset: -18,
                      position: 'insideBottom',
                      value: 'Generation',
                    }}
                    tick={{ fill: '#d6d3d1', fontSize: 12 }}
                    tickLine={{ stroke: 'rgba(168, 162, 158, 0.35)' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tick={{ fill: '#d6d3d1', fontSize: 12 }}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip
                    content={<PaceTooltip players={selectedGame.players} />}
                    cursor={{ stroke: 'rgba(245, 158, 11, 0.35)' }}
                  />
                  {selectedGame.players.map((player, index) => {
                    const playerStyle =
                      PLAYER_STYLES[index % PLAYER_STYLES.length];
                    return (
                      <Line
                        activeDot={{ r: 6, strokeWidth: 2 }}
                        animationDuration={350}
                        dataKey={player.id}
                        dot={{ r: 4, strokeWidth: 2 }}
                        isAnimationActive
                        key={player.id}
                        name={player.name}
                        stroke={playerStyle.color}
                        strokeDasharray={playerStyle.dash}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        type="monotone"
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {selectedGame.players.map((player, index) => (
            <PlayerSummaryCard
              key={player.id}
              player={player}
              styleIndex={index}
            />
          ))}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-stone-800/80 bg-black/20 px-3.5 py-3 text-xs leading-5 text-stone-400">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-stone-600 text-[0.62rem]"
          >
            i
          </span>
          <p>
            Cumulative totals are reconstructed from the imported game log;
            steeper line segments indicate faster card-engine growth.
          </p>
        </div>
      </div>
    </section>
  );
}
