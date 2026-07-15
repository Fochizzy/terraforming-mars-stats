'use client';

import { useMemo, useState } from 'react';
import type { LineupEffectRow } from '@/lib/db/analytics-repo';

type LineupEffectsPanelProps = {
  rows: LineupEffectRow[];
  selectedPlayerName?: string | null;
};

type SortKey = 'averageScore' | 'gamesPlayed' | 'winRate';

type PerformanceTone = {
  bar: string;
  label: string;
  text: string;
};

const performanceTones: Record<'average' | 'strong' | 'weak', PerformanceTone> = {
  average: {
    bar: 'bg-amber-400',
    label: 'Average',
    text: 'text-amber-200',
  },
  strong: {
    bar: 'bg-emerald-400',
    label: 'Strong',
    text: 'text-emerald-200',
  },
  weak: {
    bar: 'bg-rose-400',
    label: 'Developing',
    text: 'text-rose-200',
  },
};

function formatAverage(value: number) {
  return value.toFixed(1);
}

function getLineupSize(row: LineupEffectRow) {
  const opponentCount = row.lineupLabel
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean).length;

  return opponentCount + 1;
}

function getPerformanceTone(winRate: number) {
  if (winRate >= 0.5) {
    return performanceTones.strong;
  }

  if (winRate >= 0.3) {
    return performanceTones.average;
  }

  return performanceTones.weak;
}

function sortRows(rows: LineupEffectRow[], sortKey: SortKey) {
  return [...rows].sort((left, right) => {
    const primaryDifference = right[sortKey] - left[sortKey];

    if (primaryDifference !== 0) {
      return primaryDifference;
    }

    return (
      right.gamesPlayed - left.gamesPlayed ||
      right.winRate - left.winRate ||
      left.lineupLabel.localeCompare(right.lineupLabel)
    );
  });
}

export function LineupEffectsPanel({
  rows,
  selectedPlayerName = null,
}: LineupEffectsPanelProps) {
  const [lineupSize, setLineupSize] = useState<string>('all');
  const [minimumGames, setMinimumGames] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('winRate');

  const lineupSizes = useMemo(
    () =>
      Array.from(new Set(rows.map(getLineupSize))).sort(
        (left, right) => left - right,
      ),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const matchingRows = rows.filter(
      (row) =>
        row.gamesPlayed >= minimumGames &&
        (lineupSize === 'all' || getLineupSize(row) === Number(lineupSize)),
    );

    return sortRows(matchingRows, sortKey);
  }, [lineupSize, minimumGames, rows, sortKey]);

  const groupedRows = useMemo(() => {
    const groups = new Map<
      string,
      { playerId: string; playerName: string; rows: LineupEffectRow[] }
    >();

    filteredRows.forEach((row) => {
      const currentGroup = groups.get(row.playerId);

      if (currentGroup) {
        currentGroup.rows.push(row);
        return;
      }

      groups.set(row.playerId, {
        playerId: row.playerId,
        playerName: selectedPlayerName ?? row.playerName,
        rows: [row],
      });
    });

    return Array.from(groups.values());
  }, [filteredRows, selectedPlayerName]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-stone-400">
        Lineup effects will appear after repeated finalized group mixes are logged.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-stone-800/80 bg-stone-950/25 p-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-stone-400">
            Sort
            <select
              aria-label="Sort lineup effects"
              className="min-w-40 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-orange-400"
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              value={sortKey}
            >
              <option value="winRate">Win rate</option>
              <option value="averageScore">Average score</option>
              <option value="gamesPlayed">Games played</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-stone-400">
            Minimum games
            <select
              aria-label="Minimum lineup games"
              className="min-w-40 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-orange-400"
              onChange={(event) => setMinimumGames(Number(event.target.value))}
              value={minimumGames}
            >
              <option value={0}>All samples</option>
              <option value={3}>3+ games</option>
              <option value={5}>5+ games</option>
              <option value={10}>10+ games</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-medium text-stone-400">
            Lineup size
            <select
              aria-label="Lineup size"
              className="min-w-40 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-orange-400"
              onChange={(event) => setLineupSize(event.target.value)}
              value={lineupSize}
            >
              <option value="all">All table sizes</option>
              {lineupSizes.map((size) => (
                <option key={size} value={size}>
                  {size} players
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs text-stone-500">
          Showing {filteredRows.length} of {rows.length} lineups
        </p>
      </div>

      {groupedRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-700 px-4 py-8 text-center">
          <p className="text-sm font-medium text-stone-200">No lineups match these filters.</p>
          <p className="mt-1 text-xs text-stone-500">
            Lower the minimum game count or choose another table size.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groupedRows.map((group) => (
            <section className="flex flex-col gap-2" key={group.playerId}>
              <div className="flex items-center justify-between gap-3 px-1">
                <h3 className="text-sm font-semibold text-stone-100">
                  {group.playerName}
                </h3>
                <span className="text-xs text-stone-500">
                  {group.rows.length} {group.rows.length === 1 ? 'lineup' : 'lineups'}
                </span>
              </div>

              <div className="grid gap-2">
                {group.rows.map((row) => {
                  const percent = Math.round(row.winRate * 100);
                  const tone = getPerformanceTone(row.winRate);
                  const lineupTitle = row.lineupLabel
                    ? `With ${row.lineupLabel}`
                    : 'Solo table';

                  return (
                    <article
                      className="rounded-xl border border-stone-800/80 bg-stone-950/45 px-3 py-3 shadow-none"
                      key={`${row.playerId}-${row.lineupLabel}`}
                    >
                      <div className="grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <div className="min-w-0">
                          <h4
                            className="text-sm font-semibold leading-snug text-stone-100"
                            title={lineupTitle}
                          >
                            {lineupTitle}
                          </h4>
                          <p className="mt-1 text-xs text-stone-500">
                            {getLineupSize(row)}-player table
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5 md:justify-end">
                          <span className="rounded-md border border-stone-800 bg-stone-900/60 px-2 py-1 text-xs text-stone-300">
                            {row.gamesPlayed} games
                          </span>
                          <span className="rounded-md border border-stone-800 bg-stone-900/60 px-2 py-1 text-xs text-stone-300">
                            {formatAverage(row.averageScore)} avg pts
                          </span>
                          <span className="rounded-md border border-stone-800 bg-stone-900/60 px-2 py-1 text-xs text-stone-300">
                            {formatAverage(row.averageGenerationCount)} gens
                          </span>
                        </div>

                        <div className="min-w-24 text-left md:text-right">
                          <p className={`text-xl font-semibold tabular-nums ${tone.text}`}>
                            {percent}%
                          </p>
                          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-stone-500">
                            Win rate · {tone.label}
                          </p>
                        </div>
                      </div>

                      <div
                        aria-label={`${percent}% win rate`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={percent}
                        className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-800"
                        role="progressbar"
                      >
                        <div
                          className={`h-full rounded-full transition-[width] ${tone.bar}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
