'use client';

import { Fragment, type ReactNode, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  CircleDashed,
  Database,
  Info,
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

type ConsolidatedFinalActionRow = FinalTerraformingActionStat & {
  detailRows: FinalTerraformingActionStat[];
  groupKey: string;
};

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

function normalizePlayerKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function consolidateRows(rows: FinalTerraformingActionStat[]) {
  const grouped = new Map<string, FinalTerraformingActionStat[]>();

  for (const row of rows) {
    const key = normalizePlayerKey(row.player_name) || row.player_id;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  return [...grouped.entries()].map<ConsolidatedFinalActionRow>(
    ([groupKey, detailRows]) => {
      const importedGames = detailRows.reduce(
        (total, row) => total + row.imported_games,
        0,
      );
      const finalActionGames = detailRows.reduce(
        (total, row) => total + row.final_action_games,
        0,
      );
      const finalActionWins = detailRows.reduce(
        (total, row) => total + row.final_action_wins,
        0,
      );
      const overallWins = detailRows.reduce(
        (total, row) => total + row.overall_wins,
        0,
      );
      const actionCounts = new Map<string, number>();

      for (const row of detailRows) {
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
      const finalActionWinRate =
        finalActionGames > 0 ? finalActionWins / finalActionGames : null;
      const overallWinRate = importedGames > 0 ? overallWins / importedGames : null;

      return {
        detailRows: [...detailRows].sort(
          (left, right) =>
            right.imported_games - left.imported_games ||
            right.final_action_games - left.final_action_games ||
            left.player_id.localeCompare(right.player_id),
        ),
        final_action_games: finalActionGames,
        final_action_rate:
          importedGames > 0 ? finalActionGames / importedGames : 0,
        final_action_win_rate: finalActionWinRate,
        final_action_wins: finalActionWins,
        groupKey,
        imported_games: importedGames,
        most_common_action_count: commonAction?.[1] ?? null,
        most_common_action_type: commonAction?.[0] ?? null,
        overall_win_rate: overallWinRate,
        overall_wins: overallWins,
        player_id: detailRows[0]?.player_id ?? groupKey,
        player_name: detailRows[0]?.player_name.trim() || 'Unknown player',
        win_rate_delta:
          finalActionWinRate !== null && overallWinRate !== null
            ? finalActionWinRate - overallWinRate
            : null,
      };
    },
  );
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
  left: ConsolidatedFinalActionRow,
  right: ConsolidatedFinalActionRow,
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold tracking-[0.04em] ${tone}`}
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
      ? 'border-white/10 bg-white/5 text-stone-400'
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
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
          {label}
        </p>
        <span className="text-stone-400">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-stone-100">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-stone-400">{detail}</p>
    </article>
  );
}

function InsightCard({
  detail,
  label,
  tone = 'neutral',
  value,
}: {
  detail: string;
  label: string;
  tone?: 'neutral' | 'positive' | 'warning';
  value: string;
}) {
  const toneClass = {
    neutral: 'border-sky-300/15 bg-sky-300/[0.035]',
    positive: 'border-emerald-300/15 bg-emerald-300/[0.035]',
    warning: 'border-amber-300/15 bg-amber-300/[0.035]',
  }[tone];

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-stone-100">{value}</p>
      <p className="mt-1.5 text-sm leading-6 text-stone-400">{detail}</p>
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
  className = '',
  label,
  onSort,
  sort,
  sortKey,
}: {
  align?: 'left' | 'right';
  className?: string;
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
      className={`sticky top-0 z-20 border-b border-white/10 bg-stone-950/95 px-4 py-3.5 backdrop-blur ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${active ? 'bg-amber-300/[0.06] text-amber-100' : 'text-stone-500'} ${className}`}
      scope="col"
    >
      <button
        aria-label={`Sort by ${label}`}
        className={`inline-flex w-full items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
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
  return active ? 'bg-amber-300/[0.028]' : '';
}

function DetailMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2.5">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-stone-200">
        {value}
      </dd>
    </div>
  );
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const consolidatedRows = useMemo(() => consolidateRows(rows), [rows]);
  const sortedRows = useMemo(
    () =>
      [...consolidatedRows].sort((left, right) => compareRows(left, right, sort)),
    [consolidatedRows, sort],
  );
  const summary = useMemo(() => {
    const totalImportedPlayerGames = consolidatedRows.reduce(
      (total, row) => total + row.imported_games,
      0,
    );
    const actionCounts = new Map<string, number>();

    for (const row of consolidatedRows) {
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
    const topCloser = [...consolidatedRows]
      .filter(
        (row) => row.final_action_games > 0 && row.final_action_win_rate !== null,
      )
      .sort(
        (left, right) =>
          (right.final_action_win_rate ?? 0) -
            (left.final_action_win_rate ?? 0) ||
          right.final_action_games - left.final_action_games,
      )[0];
    const largestPositiveDelta = [...consolidatedRows]
      .filter((row) => (row.win_rate_delta ?? 0) > 0)
      .sort(
        (left, right) =>
          (right.win_rate_delta ?? 0) - (left.win_rate_delta ?? 0) ||
          right.final_action_games - left.final_action_games,
      )[0];
    const mostFrequentCloser = [...consolidatedRows]
      .filter((row) => row.final_action_games > 0)
      .sort(
        (left, right) =>
          right.final_action_games - left.final_action_games ||
          right.final_action_rate - left.final_action_rate,
      )[0];

    return {
      commonFinisher,
      largestPositiveDelta,
      mostFrequentCloser,
      topCloser,
      totalImportedPlayerGames,
    };
  }, [consolidatedRows]);

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

  const toggleExpanded = (groupKey: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const strongestSample = summary.largestPositiveDelta?.final_action_games ?? 0;
  const sampleWarning =
    strongestSample < 5
      ? 'The strongest delta is based on fewer than five finishes. Treat it as a pattern to monitor, not evidence that taking the final action caused the wins.'
      : 'The signal has a broader sample, but it still describes association rather than causation.';

  return (
    <section className="my-2 flex flex-col gap-5 rounded-2xl border border-white/12 bg-[rgba(7,10,15,0.58)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-6">
      <div className="flex flex-col gap-1.5 border-b border-white/[0.08] pb-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
          Imported-log evidence
        </p>
        <h3 className="text-xl font-semibold text-stone-100">
          Final Terraforming Action
        </h3>
        <p className="max-w-3xl text-sm leading-6 text-stone-400">
          One consolidated row per player, showing who most often completes the
          final global parameter and how those games compare with their overall
          imported results.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          detail="Player-game records included after duplicate names are consolidated."
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
          label="Highest closing win rate"
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

      <div className="max-h-[38rem] overflow-auto rounded-xl border border-white/10 bg-stone-950/40 shadow-inner">
        <table className="min-w-[760px] w-full border-separate border-spacing-0 text-[0.92rem]">
          <caption className="sr-only">
            Sortable final terraforming action statistics by consolidated player
          </caption>
          <thead>
            <tr>
              <SortableHeader
                align="left"
                className="left-0 z-30 min-w-56 border-r border-white/[0.07]"
                label="Player"
                onSort={handleSort}
                sort={sort}
                sortKey="player"
              />
              <SortableHeader
                className="hidden md:table-cell"
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
                label="Closing win rate"
                onSort={handleSort}
                sort={sort}
                sortKey="finalActionWinRate"
              />
              <SortableHeader
                className="hidden lg:table-cell"
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
                className="hidden xl:table-cell"
                label="Finisher"
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
              const isExpanded = expandedRows.has(row.groupKey);
              const detailsId = `final-action-details-${index}`;

              return (
                <Fragment key={row.groupKey}>
                  <tr
                    className={`${rowTone} transition-colors hover:bg-white/[0.045] focus-within:bg-white/[0.045]`}
                  >
                    <td
                      className={`sticky left-0 z-10 border-b border-r border-white/[0.07] bg-stone-950/95 px-4 py-4 ${cellHighlight(
                        sort.key === 'player',
                      )}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <RankMarker rank={index + 1} />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-stone-100">
                            {row.player_name}
                          </span>
                          {row.detailRows.length > 1 ? (
                            <span className="mt-0.5 block text-xs text-stone-500">
                              {row.detailRows.length} source records combined
                            </span>
                          ) : null}
                        </div>
                        <button
                          aria-controls={detailsId}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Hide' : 'Show'} details for ${row.player_name}`}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-stone-400 transition hover:border-white/20 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                          onClick={() => toggleExpanded(row.groupKey)}
                          type="button"
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </td>
                    <td
                      className={`hidden border-b border-white/5 px-4 py-4 text-right tabular-nums text-stone-400 md:table-cell ${cellHighlight(
                        sort.key === 'importedGames',
                      )}`}
                    >
                      {row.imported_games}
                    </td>
                    <td
                      className={`border-b border-white/5 px-4 py-4 ${cellHighlight(
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
                              className="h-full rounded-full bg-stone-300/65"
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
                      className={`border-b border-white/5 px-4 py-4 text-right ${cellHighlight(
                        sort.key === 'finalActionWinRate',
                      )}`}
                    >
                      <span className="font-semibold tabular-nums text-stone-100">
                        {formatNullablePercent(row.final_action_win_rate)}
                      </span>
                      <span className="ml-1.5 hidden text-xs text-stone-500 sm:inline">
                        · {formatWins(row.final_action_wins)}
                      </span>
                    </td>
                    <td
                      className={`hidden border-b border-white/5 px-4 py-4 text-right lg:table-cell ${cellHighlight(
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
                      className={`border-b border-white/5 px-4 py-4 text-right ${cellHighlight(
                        sort.key === 'delta',
                      )}`}
                    >
                      <DeltaBadge value={row.win_rate_delta} />
                    </td>
                    <td
                      className={`hidden border-b border-white/5 px-4 py-4 text-right xl:table-cell ${cellHighlight(
                        sort.key === 'commonFinisher',
                      )}`}
                    >
                      <ActionPill
                        actionCount={row.most_common_action_count}
                        actionType={row.most_common_action_type}
                      />
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr id={detailsId}>
                      <td
                        className="border-b border-white/[0.07] bg-black/25 px-4 py-4"
                        colSpan={7}
                      >
                        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          <DetailMetric
                            label="Imported games"
                            value={row.imported_games}
                          />
                          <DetailMetric
                            label="Closing results"
                            value={`${row.final_action_games} actions · ${formatWins(row.final_action_wins)}`}
                          />
                          <DetailMetric
                            label="Overall results"
                            value={`${formatNullablePercent(row.overall_win_rate)} · ${formatWins(row.overall_wins)}`}
                          />
                          <DetailMetric
                            label="Delta"
                            value={<DeltaBadge value={row.win_rate_delta} />}
                          />
                          <DetailMetric
                            label="Common finisher"
                            value={
                              <ActionPill
                                actionCount={row.most_common_action_count}
                                actionType={row.most_common_action_type}
                              />
                            }
                          />
                        </dl>
                        {row.detailRows.length > 1 ? (
                          <div className="mt-4 overflow-x-auto rounded-lg border border-white/[0.07]">
                            <table className="w-full min-w-[620px] text-xs">
                              <caption className="sr-only">
                                Source-record breakdown for {row.player_name}
                              </caption>
                              <thead className="bg-white/[0.025] text-stone-500">
                                <tr>
                                  <th className="px-3 py-2 text-left font-semibold">Record</th>
                                  <th className="px-3 py-2 text-right font-semibold">Games</th>
                                  <th className="px-3 py-2 text-right font-semibold">Actions</th>
                                  <th className="px-3 py-2 text-right font-semibold">Closing rate</th>
                                  <th className="px-3 py-2 text-right font-semibold">Delta</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.detailRows.map((detail, detailIndex) => (
                                  <tr
                                    className="border-t border-white/[0.06] text-stone-300"
                                    key={`${detail.player_id}-${detailIndex}`}
                                  >
                                    <td className="px-3 py-2 text-left text-stone-500">
                                      {detailIndex + 1}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {detail.imported_games}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {detail.final_action_games}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {formatNullablePercent(detail.final_action_win_rate)}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">
                                      {formatSignedPercent(detail.win_rate_delta)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="finishing-patterns-heading">
        <div className="mb-3 flex items-center gap-2">
          <Info aria-hidden="true" className="h-4 w-4 text-stone-500" />
          <h4
            className="text-sm font-semibold text-stone-200"
            id="finishing-patterns-heading"
          >
            What the finishing patterns suggest
          </h4>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <InsightCard
            detail={
              summary.largestPositiveDelta
                ? `${summary.largestPositiveDelta.final_action_games} recorded finishes, compared with a ${formatNullablePercent(summary.largestPositiveDelta.overall_win_rate)} overall win rate.`
                : 'No player has a positive closing delta in the current evidence.'
            }
            label="Strongest association"
            tone="positive"
            value={
              summary.largestPositiveDelta
                ? `${summary.largestPositiveDelta.player_name} · ${formatSignedPercent(summary.largestPositiveDelta.win_rate_delta)}`
                : 'No positive signal'
            }
          />
          <InsightCard
            detail={
              summary.mostFrequentCloser
                ? `${summary.mostFrequentCloser.final_action_games} final actions across ${summary.mostFrequentCloser.imported_games} imported games (${formatPercent(summary.mostFrequentCloser.final_action_rate)}).`
                : 'No final-action evidence is available.'
            }
            label="Most frequent closer"
            value={summary.mostFrequentCloser?.player_name ?? 'No qualifying player'}
          />
          <InsightCard
            detail={sampleWarning}
            label="How to read this"
            tone="warning"
            value={
              strongestSample > 0
                ? `${strongestSample} finishes in the leading sample`
                : 'More evidence needed'
            }
          />
        </div>
      </section>
    </section>
  );
}
