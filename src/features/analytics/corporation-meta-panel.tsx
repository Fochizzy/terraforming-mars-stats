'use client';

import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import type { GlobalCorporationMetricRow } from '@/lib/db/analytics-repo';

type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'averageNormalizedEfficiency'
  | 'averagePoints'
  | 'averagePointsPerGeneration'
  | 'gamesPlayed'
  | 'name'
  | 'playShare'
  | 'winRate'
  | 'wins';

type CorporationDisplayRow = GlobalCorporationMetricRow & {
  name: string;
  playShare: number;
};

const minimumGameOptions = [0, 2, 3, 5, 10] as const;

function formatDecimal(value: number | null, maximumFractionDigits = 1) {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function humanizeCode(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getContextLabel(row: GlobalCorporationMetricRow) {
  const parts = [
    row.mapName ?? (row.mapId ? humanizeCode(row.mapId) : 'All maps'),
    row.playerCount > 0 ? `${row.playerCount} players` : 'All player counts',
  ];

  return parts.join(' · ');
}

function getWinRateTone(winRate: number) {
  if (winRate >= 0.5) {
    return 'border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100';
  }

  if (winRate >= 0.3) {
    return 'border-sky-300/20 bg-sky-300/[0.08] text-sky-100';
  }

  return 'border-stone-500/25 bg-stone-500/10 text-stone-200';
}

function selectSummaryRows(rows: GlobalCorporationMetricRow[]) {
  const allMapAllPlayerRows = rows.filter(
    (row) => row.mapId === null && row.playerCount === 0,
  );
  const candidates = allMapAllPlayerRows.length > 0 ? allMapAllPlayerRows : rows;
  const uniqueRows = new Map<string, GlobalCorporationMetricRow>();

  for (const row of candidates) {
    const current = uniqueRows.get(row.corporationId);

    if (
      !current ||
      row.gamesPlayed > current.gamesPlayed ||
      (row.gamesPlayed === current.gamesPlayed && row.winRate > current.winRate)
    ) {
      uniqueRows.set(row.corporationId, row);
    }
  }

  return [...uniqueRows.values()];
}

function compareRows(
  left: CorporationDisplayRow,
  right: CorporationDisplayRow,
  sortKey: SortKey,
) {
  if (sortKey === 'name') {
    return left.name.localeCompare(right.name);
  }

  const leftValue = left[sortKey] ?? Number.NEGATIVE_INFINITY;
  const rightValue = right[sortKey] ?? Number.NEGATIVE_INFINITY;

  return leftValue - rightValue;
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) {
    return <span aria-hidden="true" className="text-stone-600">↕</span>;
  }

  return (
    <span aria-hidden="true" className="text-amber-300">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

function SortableHeader({
  align = 'right',
  direction,
  label,
  onSort,
  sortKey,
  activeSortKey,
  title,
}: {
  activeSortKey: SortKey;
  align?: 'left' | 'right';
  direction: SortDirection;
  label: string;
  onSort: (sortKey: SortKey) => void;
  sortKey: SortKey;
  title?: string;
}) {
  const active = activeSortKey === sortKey;

  return (
    <th
      aria-sort={
        active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      className={[
        'whitespace-nowrap border-b border-white/[0.08] bg-[#11161d]/95 px-3 py-3',
        'text-xs font-semibold text-stone-400 backdrop-blur',
        align === 'left' ? 'text-left' : 'text-right',
      ].join(' ')}
      scope="col"
      title={title}
    >
      <button
        className={[
          'inline-flex items-center gap-1.5 rounded-md transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70',
          active ? 'text-amber-200' : 'hover:text-stone-100',
        ].join(' ')}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        {label}
        <SortIndicator active={active} direction={direction} />
      </button>
    </th>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5">
      <dt className="text-xs font-medium text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-stone-100">
        {value}
      </dd>
    </div>
  );
}

export function CorporationMetaPanel({
  rows,
}: {
  rows: GlobalCorporationMetricRow[];
}) {
  const [query, setQuery] = useState('');
  const [minimumGames, setMinimumGames] = useState(0);
  const [showMoreStats, setShowMoreStats] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('gamesPlayed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const summaryRows = useMemo(() => selectSummaryRows(rows), [rows]);
  const totalPlays = summaryRows.reduce((total, row) => total + row.gamesPlayed, 0);

  const displayRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return summaryRows
      .map((row) => ({
        ...row,
        name: row.corporationName ?? humanizeCode(row.corporationId),
        playShare: totalPlays > 0 ? row.gamesPlayed / totalPlays : 0,
      }))
      .filter(
        (row) =>
          row.gamesPlayed >= minimumGames &&
          (normalizedQuery.length === 0 ||
            row.name.toLowerCase().includes(normalizedQuery)),
      )
      .sort((left, right) => {
        const result = compareRows(left, right, sortKey);
        const directedResult = sortDirection === 'asc' ? result : result * -1;

        return directedResult || left.name.localeCompare(right.name);
      });
  }, [minimumGames, query, sortDirection, sortKey, summaryRows, totalPlays]);

  const chartRows = useMemo(
    () =>
      [...displayRows]
        .sort(
          (left, right) =>
            right.gamesPlayed - left.gamesPlayed ||
            right.winRate - left.winRate ||
            left.name.localeCompare(right.name),
        )
        .slice(0, 8),
    [displayRows],
  );

  function handleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === 'name' ? 'asc' : 'desc');
  }

  return (
    <ChartFrame title="Global Corporation Meta">
      <div className="space-y-5 text-sm sm:text-base">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="max-w-3xl leading-6 text-stone-300">
              Compare corporation usage and results without mixing map-specific or
              player-count variants into duplicate rows.
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {summaryRows.length} corporation summaries · {totalPlays} recorded
              corporation plays
            </p>
          </div>
          <span className="w-fit rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-3 py-1.5 text-xs font-medium text-sky-100">
            Global dataset
          </span>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-100 sm:text-lg">
                Corporation win rate
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Top corporations by recorded plays after the current filters.
              </p>
            </div>
            <p className="mt-2 text-xs text-stone-500 sm:mt-0">
              Percent of games won
            </p>
          </div>

          {chartRows.length === 0 ? (
            <p className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-sm text-stone-400">
              No corporations match these filters.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {chartRows.map((row) => (
                <div
                  className="grid grid-cols-[minmax(7.5rem,10rem)_minmax(0,1fr)_3.25rem] items-center gap-3"
                  key={row.corporationId}
                  title={`${row.name}: ${formatPercent(row.winRate)} win rate across ${row.gamesPlayed} plays`}
                >
                  <span className="truncate text-right text-sm font-medium text-stone-200">
                    {row.name}
                  </span>
                  <div className="relative h-7 overflow-hidden rounded-lg border border-white/[0.06] bg-stone-950/70">
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 opacity-60"
                      style={{
                        backgroundImage:
                          'linear-gradient(to right, transparent calc(25% - 1px), rgba(255,255,255,0.08) 25%, transparent calc(25% + 1px), transparent calc(50% - 1px), rgba(255,255,255,0.08) 50%, transparent calc(50% + 1px), transparent calc(75% - 1px), rgba(255,255,255,0.08) 75%, transparent calc(75% + 1px))',
                      }}
                    />
                    <div
                      className="relative h-full rounded-md bg-gradient-to-r from-sky-700/80 to-sky-300/80 transition-[width] duration-300"
                      style={{
                        width: `${Math.max(
                          row.winRate * 100,
                          row.winRate > 0 ? 2 : 0,
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums text-stone-100">
                    {formatPercent(row.winRate)}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-[minmax(7.5rem,10rem)_minmax(0,1fr)_3.25rem] gap-3 text-[0.7rem] tabular-nums text-stone-600">
                <span />
                <div className="flex justify-between">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                <span />
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-100 sm:text-lg">
                Corporations
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                {displayRows.length} shown · Sort any column or expand a mobile card
                for the full context.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto_auto]">
              <label className="grid gap-1.5 text-xs font-medium text-stone-400">
                Search
                <input
                  className="tm-input min-h-10 w-full rounded-xl px-3 py-2 text-sm"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a corporation"
                  type="search"
                  value={query}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-stone-400">
                Minimum plays
                <select
                  className="tm-input min-h-10 rounded-xl px-3 py-2 text-sm"
                  onChange={(event) => setMinimumGames(Number(event.target.value))}
                  value={minimumGames}
                >
                  {minimumGameOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === 0 ? 'Any' : `${option}+`}
                    </option>
                  ))}
                </select>
              </label>
              <button
                aria-pressed={showMoreStats}
                className="min-h-10 self-end rounded-xl border border-sky-300/20 bg-sky-300/[0.07] px-3 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-300/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                onClick={() => setShowMoreStats((current) => !current)}
                type="button"
              >
                {showMoreStats ? 'Fewer stats' : 'More stats'}
              </button>
            </div>
          </div>

          {displayRows.length === 0 ? (
            <p className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-sm text-stone-400">
              No corporations match the selected search and minimum-play filter.
            </p>
          ) : (
            <>
              <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/[0.08] lg:block">
                <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[0.8rem] xl:text-sm">
                  <thead className="sticky top-0 z-20">
                    <tr>
                      <SortableHeader
                        activeSortKey={sortKey}
                        align="left"
                        direction={sortDirection}
                        label="Corporation"
                        onSort={handleSort}
                        sortKey="name"
                      />
                      <SortableHeader
                        activeSortKey={sortKey}
                        direction={sortDirection}
                        label="Plays"
                        onSort={handleSort}
                        sortKey="gamesPlayed"
                      />
                      <SortableHeader
                        activeSortKey={sortKey}
                        direction={sortDirection}
                        label="Play share"
                        onSort={handleSort}
                        sortKey="playShare"
                        title="Share of all corporation selections in this global summary"
                      />
                      <SortableHeader
                        activeSortKey={sortKey}
                        direction={sortDirection}
                        label="Win rate"
                        onSort={handleSort}
                        sortKey="winRate"
                        title="Wins divided by recorded corporation plays"
                      />
                      {showMoreStats ? (
                        <>
                          <SortableHeader
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            label="Wins"
                            onSort={handleSort}
                            sortKey="wins"
                          />
                          <SortableHeader
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            label="Avg points"
                            onSort={handleSort}
                            sortKey="averagePoints"
                          />
                          <SortableHeader
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            label="Pts / gen"
                            onSort={handleSort}
                            sortKey="averagePointsPerGeneration"
                            title="Average points scored per generation"
                          />
                          <SortableHeader
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            label="Efficiency"
                            onSort={handleSort}
                            sortKey="averageNormalizedEfficiency"
                            title="Normalized efficiency relative to the stored global baseline"
                          />
                          <th
                            className="whitespace-nowrap border-b border-white/[0.08] bg-[#11161d]/95 px-3 py-3 text-left text-xs font-semibold text-stone-400 backdrop-blur"
                            scope="col"
                          >
                            Scope
                          </th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, index) => (
                      <tr
                        className="group transition odd:bg-white/[0.015] hover:bg-sky-300/[0.035]"
                        key={row.corporationId}
                      >
                        <th
                          className="sticky left-0 z-10 min-w-44 border-b border-white/[0.055] bg-[#11161d] px-3 py-3 text-left align-middle font-semibold text-stone-100 group-hover:text-white"
                          scope="row"
                        >
                          <span className="block max-w-52 whitespace-normal leading-5">
                            {row.name}
                          </span>
                          <span className="mt-0.5 block text-xs font-normal text-stone-600">
                            #{index + 1}
                          </span>
                        </th>
                        <td className="border-b border-white/[0.055] px-3 py-3 text-right align-middle tabular-nums text-stone-200">
                          {row.gamesPlayed}
                        </td>
                        <td className="border-b border-white/[0.055] px-3 py-3 text-right align-middle tabular-nums text-stone-200">
                          {formatPercent(row.playShare)}
                        </td>
                        <td className="border-b border-white/[0.055] px-3 py-3 text-right align-middle">
                          <span
                            className={`inline-flex min-w-14 justify-center rounded-full border px-2.5 py-1 font-semibold tabular-nums ${getWinRateTone(row.winRate)}`}
                          >
                            {formatPercent(row.winRate)}
                          </span>
                        </td>
                        {showMoreStats ? (
                          <>
                            <td className="border-b border-white/[0.055] px-3 py-3 text-right align-middle tabular-nums text-stone-200">
                              {row.wins}
                            </td>
                            <td className="border-b border-white/[0.055] px-3 py-3 text-right align-middle tabular-nums text-stone-200">
                              {formatDecimal(row.averagePoints)}
                            </td>
                            <td className="border-b border-white/[0.055] px-3 py-3 text-right align-middle tabular-nums text-stone-200">
                              {formatDecimal(row.averagePointsPerGeneration, 2)}
                            </td>
                            <td className="border-b border-white/[0.055] px-3 py-3 text-right align-middle tabular-nums text-stone-200">
                              {formatDecimal(row.averageNormalizedEfficiency, 2)}
                            </td>
                            <td className="min-w-44 border-b border-white/[0.055] px-3 py-3 text-left align-middle text-stone-400">
                              {getContextLabel(row)}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-3 lg:hidden">
                {displayRows.map((row) => (
                  <details
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] open:border-sky-300/20 open:bg-sky-300/[0.025]"
                    key={row.corporationId}
                  >
                    <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold leading-5 text-stone-100">
                            {row.name}
                          </h4>
                          <p className="mt-1 text-sm text-stone-500">
                            {row.gamesPlayed} plays · {formatPercent(row.playShare)} of
                            selections
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-sm font-semibold tabular-nums ${getWinRateTone(row.winRate)}`}
                        >
                          {formatPercent(row.winRate)}
                        </span>
                      </div>
                    </summary>
                    <dl className="grid grid-cols-2 gap-2 border-t border-white/[0.07] p-4">
                      <Metric label="Wins" value={String(row.wins)} />
                      <Metric
                        label="Avg points"
                        value={formatDecimal(row.averagePoints)}
                      />
                      <Metric
                        label="Pts / gen"
                        value={formatDecimal(row.averagePointsPerGeneration, 2)}
                      />
                      <Metric
                        label="Efficiency"
                        value={formatDecimal(row.averageNormalizedEfficiency, 2)}
                      />
                      <div className="col-span-2 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-2.5">
                        <dt className="text-xs font-medium text-stone-500">Scope</dt>
                        <dd className="mt-1 text-sm text-stone-200">
                          {getContextLabel(row)}
                        </dd>
                      </div>
                    </dl>
                  </details>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </ChartFrame>
  );
}
