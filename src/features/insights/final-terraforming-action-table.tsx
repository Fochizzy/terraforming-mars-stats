'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CircleDashed,
  Database,
  Leaf,
  ThermometerSun,
  TrendingUp,
  Trophy,
  Waves,
} from 'lucide-react';
import type { FinalTerraformingActionStat } from '@/lib/db/selection-stats-repo';

type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'commonFinisher'
  | 'delta'
  | 'finalActionWinRate'
  | 'finalActions'
  | 'importedGames'
  | 'overallWinRate'
  | 'player';

type SortState = {
  direction: SortDirection;
  key: SortKey;
};

type ActionType = 'ocean' | 'oxygen' | 'temperature' | 'unknown';

const defaultDirections: Record<SortKey, SortDirection> = {
  commonFinisher: 'asc',
  delta: 'desc',
  finalActionWinRate: 'desc',
  finalActions: 'desc',
  importedGames: 'desc',
  overallWinRate: 'desc',
  player: 'asc',
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatNullablePercent(value: number | null) {
  return value === null ? '—' : formatPercent(value);
}

function formatSignedPercent(value: number | null) {
  if (value === null) {
    return '—';
  }

  const percent = formatPercent(Math.abs(value));

  if (value === 0) {
    return percent;
  }

  return value > 0 ? `+${percent}` : `-${percent}`;
}

function formatWins(wins: number) {
  return `${wins} ${wins === 1 ? 'win' : 'wins'}`;
}

function normalizeActionType(actionType: string | null | undefined): ActionType {
  switch (actionType) {
    case 'ocean':
      return 'ocean';
    case 'oxygen':
      return 'oxygen';
    case 'temperature':
      return 'temperature';
    default:
      return 'unknown';
  }
}

function formatActionType(actionType: string | null | undefined) {
  switch (normalizeActionType(actionType)) {
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

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: SortDirection,
) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return direction === 'asc' ? left - right : right - left;
}

function compareRows(
  left: FinalTerraformingActionStat,
  right: FinalTerraformingActionStat,
  sort: SortState,
) {
  let comparison = 0;

  switch (sort.key) {
    case 'player':
      comparison = left.player_name.localeCompare(right.player_name);
      break;
    case 'importedGames':
      comparison = left.imported_games - right.imported_games;
      break;
    case 'finalActions':
      comparison =
        left.final_action_games - right.final_action_games ||
        left.final_action_rate - right.final_action_rate;
      break;
    case 'finalActionWinRate':
      comparison = compareNullableNumbers(
        left.final_action_win_rate,
        right.final_action_win_rate,
        sort.direction,
      );
      break;
    case 'overallWinRate':
      comparison = compareNullableNumbers(
        left.overall_win_rate,
        right.overall_win_rate,
        sort.direction,
      );
      break;
    case 'delta':
      comparison = compareNullableNumbers(
        left.win_rate_delta,
        right.win_rate_delta,
        sort.direction,
      );
      break;
    case 'commonFinisher':
      comparison = formatActionType(left.most_common_action_type).localeCompare(
        formatActionType(right.most_common_action_type),
      );
      if (comparison === 0) {
        comparison =
          (left.most_common_action_count ?? 0) -
          (right.most_common_action_count ?? 0);
      }
      break;
  }

  if (
    sort.key !== 'finalActionWinRate' &&
    sort.key !== 'overallWinRate' &&
    sort.key !== 'delta' &&
    sort.direction === 'desc'
  ) {
    comparison *= -1;
  }

  return (
    comparison ||
    right.final_action_games - left.final_action_games ||
    right.imported_games - left.imported_games ||
    left.player_name.localeCompare(right.player_name)
  );
}

function buildNarratives(rows: FinalTerraformingActionStat[]) {
  const usableRows = rows.filter(
    (row) => row.final_action_games > 0 && row.win_rate_delta !== null,
  );

  if (usableRows.length === 0) {
    return [
      'More imported final-action logs are needed before a reliable finishing pattern can be identified.',
    ];
  }

  const strongest = [...usableRows].sort(
    (left, right) =>
      (right.win_rate_delta ?? 0) - (left.win_rate_delta ?? 0) ||
      right.final_action_games - left.final_action_games,
  )[0];
  const mostFrequent = [...usableRows].sort(
    (left, right) =>
      right.final_action_games - left.final_action_games ||
      right.final_action_rate - left.final_action_rate,
  )[0];
  const actionCounts = new Map<string, number>();

  for (const row of rows) {
    if (row.most_common_action_type && row.most_common_action_count) {
      actionCounts.set(
        row.most_common_action_type,
        (actionCounts.get(row.most_common_action_type) ?? 0) +
          row.most_common_action_count,
      );
    }
  }

  const commonAction = [...actionCounts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0];
  const narratives = [
    `${strongest.player_name} has the largest final-action lift at ${formatSignedPercent(
      strongest.win_rate_delta,
    )} across ${strongest.final_action_games} recorded finishes.`,
    `${mostFrequent.player_name} controlled the final terraforming step in ${formatPercent(
      mostFrequent.final_action_rate,
    )} of ${mostFrequent.imported_games} imported games.`,
  ];

  if (commonAction) {
    narratives.push(
      `${formatActionType(commonAction[0])} is the most repeated finisher in this view (${commonAction[1]} recorded actions).`,
    );
  }

  if (strongest.final_action_games < 5) {
    narratives.push(
      'The leading delta is still a small-sample signal and should be treated as a pattern to watch rather than proof of causation.',
    );
  }

  return narratives;
}

function ActionIcon({ actionType }: { actionType: ActionType }) {
  const iconClassName = 'h-3.5 w-3.5';

  switch (actionType) {
    case 'ocean':
      return <Waves aria-hidden="true" className={iconClassName} />;
    case 'oxygen':
      return <Leaf aria-hidden="true" className={iconClassName} />;
    case 'temperature':
      return <ThermometerSun aria-hidden="true" className={iconClassName} />;
    default:
      return <CircleDashed aria-hidden="true" className={iconClassName} />;
  }
}

function ActionPill({
  actionCount,
  actionType,
}: {
  actionCount: number | null;
  actionType: string | null;
}) {
  const normalizedType = normalizeActionType(actionType);
  const tone = {
    ocean: 'border-sky-400/25 bg-sky-400/10 text-sky-200',
    oxygen: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
    temperature: 'border-orange-400/25 bg-orange-400/10 text-orange-200',
    unknown: 'border-white/10 bg-white/5 text-stone-300',
  }[normalizedType];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${tone}`}
    >
      <ActionIcon actionType={normalizedType} />
      <span>{formatActionType(actionType)}</span>
      {actionCount ? <span aria-hidden="true">·</span> : null}
      {actionCount ? <span className="tabular-nums">{actionCount}</span> : null}
    </span>
  );
}

function DeltaBadge({ value }: { value: number | null }) {
  const tone =
    value === null || value === 0
      ? 'border-white/10 bg-white/5 text-stone-300'
      : value > 0
        ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200'
        : 'border-rose-400/25 bg-rose-400/10 text-rose-200';

  return (
    <span
      className={`inline-flex min-w-[3.75rem] justify-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${tone}`}
    >
      {formatSignedPercent(value)}
    </span>
  );
}

function RankMarker({ rank }: { rank: number }) {
  if (rank > 3) {
    return <span className="w-6 shrink-0" />;
  }

  const tone =
    rank === 1
      ? 'border-amber-300/35 bg-amber-300/10 text-amber-200'
      : rank === 2
        ? 'border-stone-300/25 bg-stone-300/10 text-stone-200'
        : 'border-orange-400/25 bg-orange-400/10 text-orange-200';

  return (
    <span
      aria-label={`Rank ${rank}`}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.68rem] font-bold tabular-nums ${tone}`}
      title={`Rank ${rank} for the current sort`}
    >
      {rank}
    </span>
  );
}

function SummaryCard({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/15 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
          {label}
        </p>
        <span className="text-amber-300/80">{icon}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tabular-nums text-stone-100">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-stone-400">{detail}</p>
    </article>
  );
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-45" />;
  }

  return direction === 'asc' ? (
    <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
  );
}

function SortableHeader({
  align = 'right',
  label,
  onSort,
  sort,
  sortKey,
}: {
  align?: 'left' | 'right';
  label: string;
  onSort: (sortKey: SortKey) => void;
  sort: SortState;
  sortKey: SortKey;
}) {
  const active = sort.key === sortKey;

  return (
    <th
      aria-sort={
        active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      className={`sticky top-0 z-10 border-b border-white/10 bg-stone-950/95 px-3 py-3 backdrop-blur ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${active ? 'bg-amber-300/[0.075] text-amber-200' : 'text-stone-400'}`}
      scope="col"
    >
      <button
        aria-label={`Sort by ${label}`}
        className={`inline-flex w-full items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
          align === 'right' ? 'justify-end' : 'justify-start'
        }`}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        <span>{label}</span>
        <SortIndicator active={active} direction={sort.direction} />
      </button>
    </th>
  );
}

function cellHighlight(active: boolean) {
  return active ? 'bg-amber-300/[0.035]' : '';
}

export function FinalTerraformingActionTable({
  rows,
}: {
  rows: FinalTerraformingActionStat[];
}) {
  const [sort, setSort] = useState<SortState>({
    direction: 'desc',
    key: 'finalActions',
  });
  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => compareRows(left, right, sort)),
    [rows, sort],
  );
  const narratives = useMemo(() => buildNarratives(rows), [rows]);
  const summary = useMemo(() => {
    const totalImportedPlayerGames = rows.reduce(
      (total, row) => total + row.imported_games,
      0,
    );
    const actionCounts = new Map<string, number>();

    for (const row of rows) {
      if (row.most_common_action_type && row.most_common_action_count) {
        actionCounts.set(
          row.most_common_action_type,
          (actionCounts.get(row.most_common_action_type) ?? 0) +
            row.most_common_action_count,
        );
      }
    }

    const commonFinisher = [...actionCounts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )[0];
    const topCloser = [...rows]
      .filter(
        (row) =>
          row.final_action_games > 0 && row.final_action_win_rate !== null,
      )
      .sort(
        (left, right) =>
          (right.final_action_win_rate ?? 0) -
            (left.final_action_win_rate ?? 0) ||
          right.final_action_games - left.final_action_games,
      )[0];
    const largestPositiveDelta = [...rows]
      .filter((row) => (row.win_rate_delta ?? 0) > 0)
      .sort(
        (left, right) =>
          (right.win_rate_delta ?? 0) - (left.win_rate_delta ?? 0) ||
          right.final_action_games - left.final_action_games,
      )[0];

    return {
      commonFinisher,
      largestPositiveDelta,
      topCloser,
      totalImportedPlayerGames,
    };
  }, [rows]);

  if (rows.length === 0) {
    return null;
  }

  const handleSort = (sortKey: SortKey) => {
    setSort((current) =>
      current.key === sortKey
        ? {
            direction: current.direction === 'asc' ? 'desc' : 'asc',
            key: sortKey,
          }
        : { direction: defaultDirections[sortKey], key: sortKey },
    );
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-300">
          Imported logs
        </p>
        <h3 className="text-lg font-semibold text-stone-100">
          Final Terraforming Action
        </h3>
        <p className="max-w-3xl text-sm leading-6 text-stone-400">
          Who most often completes the final global parameter, and how those games
          compare with each player&apos;s overall results.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          detail="Player-game records with imported final-action evidence."
          icon={<Database aria-hidden="true" className="h-4 w-4" />}
          label="Imported player-games"
          value={summary.totalImportedPlayerGames.toLocaleString('en-US')}
        />
        <SummaryCard
          detail={
            summary.commonFinisher
              ? `${summary.commonFinisher[1]} recorded finishing actions`
              : 'No finishing action recorded yet'
          }
          icon={
            <ActionIcon
              actionType={normalizeActionType(summary.commonFinisher?.[0])}
            />
          }
          label="Most frequent finisher"
          value={
            summary.commonFinisher
              ? formatActionType(summary.commonFinisher[0])
              : '—'
          }
        />
        <SummaryCard
          detail={
            summary.topCloser
              ? `${summary.topCloser.player_name} · ${summary.topCloser.final_action_games} finishes`
              : 'No qualifying player yet'
          }
          icon={<Trophy aria-hidden="true" className="h-4 w-4" />}
          label="Highest final-action win rate"
          value={
            summary.topCloser
              ? formatNullablePercent(summary.topCloser.final_action_win_rate)
              : '—'
          }
        />
        <SummaryCard
          detail={
            summary.largestPositiveDelta
              ? `${summary.largestPositiveDelta.player_name} versus overall results`
              : 'No positive delta yet'
          }
          icon={<TrendingUp aria-hidden="true" className="h-4 w-4" />}
          label="Largest positive delta"
          value={
            summary.largestPositiveDelta
              ? formatSignedPercent(summary.largestPositiveDelta.win_rate_delta)
              : '—'
          }
        />
      </div>

      <div className="max-h-[34rem] overflow-auto rounded-xl border border-white/10 bg-stone-950/35 shadow-inner">
        <table className="min-w-[980px] w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">
            Sortable final terraforming action statistics by player
          </caption>
          <thead>
            <tr>
              <SortableHeader
                align="left"
                label="Player"
                onSort={handleSort}
                sort={sort}
                sortKey="player"
              />
              <SortableHeader
                label="Games"
                onSort={handleSort}
                sort={sort}
                sortKey="importedGames"
              />
              <SortableHeader
                label="Final actions"
                onSort={handleSort}
                sort={sort}
                sortKey="finalActions"
              />
              <SortableHeader
                label="Win rate after final action"
                onSort={handleSort}
                sort={sort}
                sortKey="finalActionWinRate"
              />
              <SortableHeader
                label="Overall"
                onSort={handleSort}
                sort={sort}
                sortKey="overallWinRate"
              />
              <SortableHeader
                label="Delta"
                onSort={handleSort}
                sort={sort}
                sortKey="delta"
              />
              <SortableHeader
                label="Most common"
                onSort={handleSort}
                sort={sort}
                sortKey="commonFinisher"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const rowTone =
                index % 2 === 0 ? 'bg-white/[0.018]' : 'bg-black/10';
              const frequencyPercent = Math.round(row.final_action_rate * 100);

              return (
                <tr
                  className={`${rowTone} transition-colors hover:bg-amber-300/[0.055] focus-visible:bg-amber-300/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/50`}
                  key={row.player_id}
                  tabIndex={0}
                >
                  <td
                    className={`border-b border-white/5 px-3 py-3.5 ${cellHighlight(
                      sort.key === 'player',
                    )}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <RankMarker rank={index + 1} />
                      <span className="font-semibold text-stone-100">
                        {row.player_name}
                      </span>
                    </div>
                  </td>
                  <td
                    className={`border-b border-white/5 px-3 py-3.5 text-right tabular-nums text-stone-400 ${cellHighlight(
                      sort.key === 'importedGames',
                    )}`}
                  >
                    {row.imported_games}
                  </td>
                  <td
                    className={`border-b border-white/5 px-3 py-3.5 ${cellHighlight(
                      sort.key === 'finalActions',
                    )}`}
                  >
                    <div className="ml-auto flex w-36 flex-col items-end gap-1.5">
                      <span className="font-semibold tabular-nums text-stone-100">
                        {row.final_action_games} / {row.imported_games}
                      </span>
                      <div className="flex w-full items-center gap-2">
                        <div
                          aria-label={`${row.player_name} final-action frequency`}
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={frequencyPercent}
                          className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                          role="progressbar"
                        >
                          <div
                            className="h-full rounded-full bg-amber-300/75"
                            style={{ width: `${Math.min(100, frequencyPercent)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[0.68rem] tabular-nums text-stone-500">
                          {frequencyPercent}%
                        </span>
                      </div>
                    </div>
                  </td>
                  <td
                    className={`border-b border-white/5 px-3 py-3.5 text-right ${cellHighlight(
                      sort.key === 'finalActionWinRate',
                    )}`}
                  >
                    <span className="font-semibold tabular-nums text-stone-100">
                      {formatNullablePercent(row.final_action_win_rate)}
                    </span>
                    <span className="ml-1.5 text-xs text-stone-500">
                      · {formatWins(row.final_action_wins)}
                    </span>
                  </td>
                  <td
                    className={`border-b border-white/5 px-3 py-3.5 text-right ${cellHighlight(
                      sort.key === 'overallWinRate',
                    )}`}
                  >
                    <span className="tabular-nums text-stone-300">
                      {formatNullablePercent(row.overall_win_rate)}
                    </span>
                    <span className="ml-1.5 text-xs text-stone-500">
                      · {formatWins(row.overall_wins)}
                    </span>
                  </td>
                  <td
                    className={`border-b border-white/5 px-3 py-3.5 text-right ${cellHighlight(
                      sort.key === 'delta',
                    )}`}
                  >
                    <DeltaBadge value={row.win_rate_delta} />
                  </td>
                  <td
                    className={`border-b border-white/5 px-3 py-3.5 text-right ${cellHighlight(
                      sort.key === 'commonFinisher',
                    )}`}
                  >
                    <ActionPill
                      actionCount={row.most_common_action_count}
                      actionType={row.most_common_action_type}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <aside className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-3.5">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-200">
          What the finishing patterns suggest
        </p>
        <div className="mt-2 grid gap-1.5 text-sm leading-6 text-stone-300 lg:grid-cols-2">
          {narratives.map((narrative) => (
            <p key={narrative}>{narrative}</p>
          ))}
        </div>
      </aside>
    </section>
  );
}
