'use client';

import { useMemo, useState } from 'react';
import type { FinalTerraformingActionStat } from '@/lib/db/final-terraforming-action-repo';

type SortKey =
  | 'player'
  | 'games'
  | 'actions'
  | 'closingWinRate'
  | 'overallWinRate'
  | 'delta';

type ConsolidatedRow = FinalTerraformingActionStat & {
  key: string;
};

function formatPercent(value: number | null) {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number | null) {
  if (value === null) return '—';
  const percent = `${Math.round(Math.abs(value) * 100)}%`;
  return value > 0 ? `+${percent}` : value < 0 ? `-${percent}` : percent;
}

function formatAction(value: string | null) {
  switch (value) {
    case 'ocean':
      return 'Ocean';
    case 'oxygen':
      return 'Oxygen';
    case 'temperature':
      return 'Temperature';
    default:
      return 'Unknown';
  }
}

function consolidateRows(rows: FinalTerraformingActionStat[]): ConsolidatedRow[] {
  const groups = new Map<string, FinalTerraformingActionStat[]>();

  for (const row of rows) {
    const key = row.player_name.trim().toLocaleLowerCase('en-US') || row.player_id;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()].map(([key, sourceRows]) => {
    const importedGames = sourceRows.reduce(
      (sum, row) => sum + row.imported_games,
      0,
    );
    const finalActionGames = sourceRows.reduce(
      (sum, row) => sum + row.final_action_games,
      0,
    );
    const finalActionWins = sourceRows.reduce(
      (sum, row) => sum + row.final_action_wins,
      0,
    );
    const overallWins = sourceRows.reduce(
      (sum, row) => sum + row.overall_wins,
      0,
    );
    const actionCounts = new Map<string, number>();

    for (const row of sourceRows) {
      if (row.most_common_action_type && row.most_common_action_count) {
        actionCounts.set(
          row.most_common_action_type,
          (actionCounts.get(row.most_common_action_type) ?? 0) +
            row.most_common_action_count,
        );
      }
    }

    const mostCommonAction = [...actionCounts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0];
    const closingWinRate =
      finalActionGames > 0 ? finalActionWins / finalActionGames : null;
    const overallWinRate = importedGames > 0 ? overallWins / importedGames : null;

    return {
      final_action_games: finalActionGames,
      final_action_rate:
        importedGames > 0 ? finalActionGames / importedGames : 0,
      final_action_win_rate: closingWinRate,
      final_action_wins: finalActionWins,
      imported_games: importedGames,
      key,
      most_common_action_count: mostCommonAction?.[1] ?? null,
      most_common_action_type: mostCommonAction?.[0] ?? null,
      overall_win_rate: overallWinRate,
      overall_wins: overallWins,
      player_id: sourceRows[0]?.player_id ?? key,
      player_name: sourceRows[0]?.player_name.trim() || 'Unknown player',
      win_rate_delta:
        closingWinRate !== null && overallWinRate !== null
          ? closingWinRate - overallWinRate
          : null,
    };
  });
}

export function FinalTerraformingActionTable({
  rows,
}: {
  rows: FinalTerraformingActionStat[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>('actions');
  const [descending, setDescending] = useState(true);
  const consolidatedRows = useMemo(() => consolidateRows(rows), [rows]);
  const sortedRows = useMemo(() => {
    const nextRows = [...consolidatedRows];
    nextRows.sort((left, right) => {
      let comparison = 0;

      switch (sortKey) {
        case 'player':
          comparison = left.player_name.localeCompare(right.player_name);
          break;
        case 'games':
          comparison = left.imported_games - right.imported_games;
          break;
        case 'actions':
          comparison = left.final_action_games - right.final_action_games;
          break;
        case 'closingWinRate':
          comparison =
            (left.final_action_win_rate ?? -1) -
            (right.final_action_win_rate ?? -1);
          break;
        case 'overallWinRate':
          comparison =
            (left.overall_win_rate ?? -1) - (right.overall_win_rate ?? -1);
          break;
        case 'delta':
          comparison = (left.win_rate_delta ?? -1) - (right.win_rate_delta ?? -1);
          break;
      }

      return descending ? -comparison : comparison;
    });
    return nextRows;
  }, [consolidatedRows, descending, sortKey]);

  const totalImportedGames = consolidatedRows.reduce(
    (sum, row) => sum + row.imported_games,
    0,
  );
  const totalFinalActions = consolidatedRows.reduce(
    (sum, row) => sum + row.final_action_games,
    0,
  );

  function changeSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setDescending((value) => !value);
      return;
    }

    setSortKey(nextKey);
    setDescending(nextKey !== 'player');
  }

  function SortButton({
    label,
    value,
  }: {
    label: string;
    value: SortKey;
  }) {
    const active = value === sortKey;
    return (
      <button
        aria-label={`Sort by ${label}`}
        className="inline-flex items-center gap-1 font-semibold text-stone-300 transition hover:text-white"
        onClick={() => changeSort(value)}
        type="button"
      >
        {label}
        <span aria-hidden="true" className="text-[0.65rem] text-stone-500">
          {active ? (descending ? '▼' : '▲') : '↕'}
        </span>
      </button>
    );
  }

  return (
    <section
      className="tm-panel flex flex-col gap-5"
      data-testid="final-terraforming-actions"
    >
      <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
        <p className="tm-data-label text-xs">Imported-log evidence</p>
        <h2 className="tm-panel-title text-xl">Final Terraforming Action</h2>
        <p className="tm-muted-copy max-w-3xl text-sm leading-6">
          Shows who most often completes the final global parameter and how those
          games compare with each player&apos;s overall imported results.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="tm-data-label text-[0.68rem]">Players</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-100">
            {consolidatedRows.length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="tm-data-label text-[0.68rem]">Imported player-games</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-100">
            {totalImportedGames}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="tm-data-label text-[0.68rem]">Recorded final actions</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-100">
            {totalFinalActions}
          </p>
        </div>
      </div>

      {sortedRows.length === 0 ? (
        <p className="tm-muted-copy rounded-xl border border-white/10 bg-black/15 p-4 text-sm">
          0 rows. Final-action statistics will appear after finalized imported
          games contain global-parameter finishing actions.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20">
          <table className="min-w-[820px] w-full text-sm">
            <caption className="sr-only">
              Final terraforming action statistics by player
            </caption>
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-stone-400">
              <tr>
                <th className="px-4 py-3"><SortButton label="Player" value="player" /></th>
                <th className="px-4 py-3 text-right"><SortButton label="Games" value="games" /></th>
                <th className="px-4 py-3 text-right"><SortButton label="Final actions" value="actions" /></th>
                <th className="px-4 py-3 text-right"><SortButton label="Closing win rate" value="closingWinRate" /></th>
                <th className="px-4 py-3 text-right"><SortButton label="Overall" value="overallWinRate" /></th>
                <th className="px-4 py-3 text-right"><SortButton label="Delta" value="delta" /></th>
                <th className="px-4 py-3 text-right">Common finisher</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr className="border-t border-white/[0.07] hover:bg-white/[0.035]" key={row.key}>
                  <td className="px-4 py-3 font-semibold text-stone-100">{row.player_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-300">{row.imported_games}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-100">
                    {row.final_action_games} <span className="text-stone-500">({formatPercent(row.final_action_rate)})</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-100">{formatPercent(row.final_action_win_rate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-300">{formatPercent(row.overall_win_rate)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                    (row.win_rate_delta ?? 0) > 0
                      ? 'text-lime-300'
                      : (row.win_rate_delta ?? 0) < 0
                        ? 'text-rose-300'
                        : 'text-stone-300'
                  }`}>
                    {formatSignedPercent(row.win_rate_delta)}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-300">
                    {formatAction(row.most_common_action_type)}
                    {row.most_common_action_count
                      ? ` · ${row.most_common_action_count}`
                      : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
