'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  chartAxisTick,
  chartSeriesColors,
} from '@/components/charts/chart-theme';
import type { SelectionDialogData } from '@/lib/db/selection-stats-repo';
import type { CorporationTagDatum } from './tag-outcomes-section';
import { SelectionNameButton } from './selection-name-link';

type SortDirection = 'asc' | 'desc';
type SortKey =
  | 'averageTagCount'
  | 'corporationName'
  | 'results'
  | 'tagUseRate'
  | 'winRate'
  | 'winsWithTag'
  | 'withTagResults';

type AxisTickProps = {
  payload?: { value?: string };
  x?: number;
  y?: number;
};

type TooltipPayloadItem = {
  payload?: CorporationTagDatum;
};

type CorporationTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
};

type RateTone = 'amber' | 'blue' | 'green' | 'muted' | 'rose';

const SOFT_GRID_STROKE = 'rgba(120, 113, 108, 0.2)';
const LIMITED_SAMPLE_SIZE = 3;

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function shortenLabel(value: string, maxLength = 18) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function pluralizeGames(value: number) {
  return `${value} ${value === 1 ? 'game' : 'games'}`;
}

function limitedSampleLabel(value: number) {
  if (value === 0) {
    return 'Limited · no tagged games';
  }

  return `Limited · ${value} tagged ${value === 1 ? 'game' : 'games'}`;
}

function compareRows(
  left: CorporationTagDatum,
  right: CorporationTagDatum,
  sortKey: SortKey,
  direction: SortDirection,
) {
  const multiplier = direction === 'asc' ? 1 : -1;
  const leftValue = left[sortKey];
  const rightValue = right[sortKey];

  if (typeof leftValue === 'string' && typeof rightValue === 'string') {
    const comparison = leftValue.localeCompare(rightValue);
    return comparison === 0
      ? left.corporationName.localeCompare(right.corporationName)
      : comparison * multiplier;
  }

  const comparison = Number(leftValue) - Number(rightValue);
  return comparison === 0
    ? left.corporationName.localeCompare(right.corporationName)
    : comparison * multiplier;
}

function getAriaSort(
  activeKey: SortKey,
  columnKey: SortKey,
  direction: SortDirection,
): 'ascending' | 'descending' | 'none' {
  if (activeKey !== columnKey) {
    return 'none';
  }

  return direction === 'asc' ? 'ascending' : 'descending';
}

function getWinRateTone(value: number | null, limited: boolean): RateTone {
  if (value === null || limited) {
    return 'muted';
  }

  if (value >= 60) {
    return 'green';
  }

  if (value >= 40) {
    return 'amber';
  }

  return 'rose';
}

function CorporationAxisTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  const name = payload?.value ?? '';

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{name}</title>
      <text
        fill="#cfc7bc"
        fontSize={11}
        textAnchor="end"
        transform="rotate(-36)"
        x={-5}
        y={7}
      >
        {shortenLabel(name)}
      </text>
    </g>
  );
}

function SummaryMetric({
  detail,
  label,
  value,
}: {
  detail?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </dt>
      <dd
        className="mt-1 truncate text-base font-semibold tabular-nums text-stone-100"
        title={value}
      >
        {value}
      </dd>
      {detail ? (
        <p className="mt-1 truncate text-[0.68rem] text-stone-500" title={detail}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function RateCell({
  limited = false,
  tone,
  value,
}: {
  limited?: boolean;
  tone: 'usage' | 'win';
  value: number | null;
}) {
  const resolvedTone =
    tone === 'usage' ? 'blue' : getWinRateTone(value, limited);
  const toneClasses: Record<RateTone, { fill: string; text: string }> = {
    amber: { fill: 'bg-amber-300/20', text: 'text-amber-100' },
    blue: { fill: 'bg-sky-400/20', text: 'text-sky-100' },
    green: { fill: 'bg-lime-400/20', text: 'text-lime-100' },
    muted: { fill: 'bg-stone-400/10', text: 'text-stone-400' },
    rose: { fill: 'bg-rose-400/20', text: 'text-rose-100' },
  };
  const classes = toneClasses[resolvedTone];

  return (
    <div
      aria-label={value === null ? 'No tagged games' : `${value}%`}
      className="relative ml-auto h-7 w-24 overflow-hidden rounded-lg border border-white/[0.07] bg-black/20"
    >
      {value !== null ? (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 ${classes.fill}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      ) : null}
      <span
        className={`relative z-10 flex h-full items-center justify-end px-2 font-medium tabular-nums ${classes.text}`}
      >
        {value === null ? '—' : `${value}%`}
      </span>
    </div>
  );
}

function SortButton({
  activeDirection,
  align = 'right',
  label,
  onClick,
}: {
  activeDirection: SortDirection | null;
  align?: 'left' | 'right';
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`Sort by ${label}`}
      aria-pressed={activeDirection !== null}
      className={`inline-flex w-full items-center gap-1 rounded px-1 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-stone-400 transition hover:bg-white/[0.045] hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 ${
        align === 'right' ? 'justify-end' : 'justify-start'
      }`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="w-3 text-center text-[0.6rem] text-orange-200">
        {activeDirection === 'asc' ? '↑' : activeDirection === 'desc' ? '↓' : '↕'}
      </span>
    </button>
  );
}

function CorporationTooltip({ active, payload }: CorporationTooltipProps) {
  const row = payload?.[0]?.payload;

  if (!active || !row) {
    return null;
  }

  const losses = Math.max(0, row.withTagResults - row.winsWithTag);

  return (
    <div className="min-w-56 rounded-xl border border-orange-300/20 bg-[#11171f]/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="font-semibold text-stone-100">{row.corporationName}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 tabular-nums">
        <dt className="text-stone-500">Tagged games</dt>
        <dd className="text-right text-stone-200">
          {row.withTagResults}/{row.results}
        </dd>
        <dt className="text-stone-500">Use rate</dt>
        <dd className="text-right text-stone-200">{row.tagUseRate}%</dd>
        <dt className="text-stone-500">Average tags</dt>
        <dd className="text-right text-stone-200">
          {formatNumber(row.averageTagCount)}
        </dd>
        <dt className="text-stone-500">Record</dt>
        <dd className="text-right text-stone-200">
          {row.winsWithTag}-{losses}
        </dd>
        <dt className="text-stone-500">Win rate</dt>
        <dd className="text-right font-semibold text-lime-100">
          {row.withTagResults > 0 ? `${row.winRate}%` : '—'}
        </dd>
      </dl>
      {row.withTagResults < LIMITED_SAMPLE_SIZE ? (
        <p className="mt-2 border-t border-white/[0.07] pt-2 text-[0.68rem] text-amber-100/80">
          Limited sample: {pluralizeGames(row.withTagResults)} with this tag.
        </p>
      ) : null}
    </div>
  );
}

export function CorporationRelationshipPanel({
  data,
  dialogData,
}: {
  data: CorporationTagDatum[];
  dialogData?: SelectionDialogData;
}) {
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sortKey, setSortKey] = useState<SortKey>('withTagResults');

  const sortedData = useMemo(
    () => [...data].sort((left, right) => compareRows(left, right, sortKey, sortDirection)),
    [data, sortDirection, sortKey],
  );

  const chartData = useMemo(
    () =>
      [...data].sort(
        (left, right) =>
          right.withTagResults - left.withTagResults ||
          right.winRate - left.winRate ||
          left.corporationName.localeCompare(right.corporationName),
      ),
    [data],
  );

  const summary = useMemo(() => {
    const totalResults = data.reduce((sum, entry) => sum + entry.results, 0);
    const totalTaggedResults = data.reduce(
      (sum, entry) => sum + entry.withTagResults,
      0,
    );
    const averageCount =
      totalResults > 0
        ? data.reduce(
            (sum, entry) => sum + entry.averageTagCount * entry.results,
            0,
          ) / totalResults
        : 0;
    const mostTagged = [...data].sort(
      (left, right) =>
        right.withTagResults - left.withTagResults ||
        right.tagUseRate - left.tagUseRate ||
        right.results - left.results ||
        left.corporationName.localeCompare(right.corporationName),
    )[0];
    const reliableWinRates = data.filter(
      (entry) => entry.withTagResults >= LIMITED_SAMPLE_SIZE,
    );
    const highestWinRate = [...(reliableWinRates.length > 0 ? reliableWinRates : data)]
      .filter((entry) => entry.withTagResults > 0)
      .sort(
        (left, right) =>
          right.winRate - left.winRate ||
          right.withTagResults - left.withTagResults ||
          left.corporationName.localeCompare(right.corporationName),
      )[0];

    return {
      averageCount,
      highestWinRate,
      mostTagged,
      totalResults,
      totalTaggedResults,
    };
  }, [data]);

  const showUseRate = useMemo(
    () => new Set(data.map((entry) => entry.tagUseRate)).size > 1,
    [data],
  );
  const maxTaggedGames = Math.max(
    1,
    ...chartData.map((entry) => entry.withTagResults),
  );
  const chartMinWidth = Math.max(760, chartData.length * 92);

  const handleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === 'corporationName' ? 'asc' : 'desc');
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-white/10 bg-[rgba(7,10,15,0.42)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-5"
      data-corporation-relationship-panel
    >
      <div className="flex flex-col gap-1 border-b border-white/[0.07] pb-4">
        <h3 className="font-serif text-xl font-semibold text-stone-100">
          Corporation performance
        </h3>
        <p className="max-w-3xl text-xs leading-5 text-stone-400 sm:text-sm">
          Compare how often the selected tag appeared for each corporation and how those tagged games performed.
        </p>
      </div>

      <section className="mt-4 rounded-xl border border-white/[0.07] bg-black/10 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-orange-300/80">
              Overview
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Summary metrics use corporation-game records and flag limited samples separately.
            </p>
          </div>
        </div>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryMetric label="Corporations" value={String(data.length)} />
          <SummaryMetric
            detail={`${summary.totalResults} corporation-game records`}
            label="Tagged games"
            value={String(summary.totalTaggedResults)}
          />
          <SummaryMetric
            detail={
              summary.mostTagged
                ? `${summary.mostTagged.tagUseRate}% use rate`
                : undefined
            }
            label="Most tagged"
            value={summary.mostTagged?.corporationName ?? '—'}
          />
          <SummaryMetric
            detail={
              summary.highestWinRate
                ? `${summary.highestWinRate.winsWithTag}/${summary.highestWinRate.withTagResults} wins${
                    summary.highestWinRate.withTagResults < LIMITED_SAMPLE_SIZE
                      ? ' · limited data'
                      : ''
                  }`
                : undefined
            }
            label="Best win rate"
            value={
              summary.highestWinRate
                ? `${summary.highestWinRate.corporationName} · ${summary.highestWinRate.winRate}%`
                : '—'
            }
          />
          <SummaryMetric
            label="Average tags"
            value={formatNumber(summary.averageCount)}
          />
        </dl>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-white/[0.07] bg-black/15">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4">
          <div>
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-orange-300/80">
              Comparison chart
            </p>
            <h4 className="mt-1 text-sm font-semibold text-stone-100">
              Tagged games and win rate
            </h4>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Bars show sample volume on the left axis; the line shows win rate on the right axis.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-sm bg-sky-400/80"
              />
              Tagged games
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="relative h-2.5 w-5">
                <span className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-lime-400" />
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#11171f] bg-lime-400" />
              </span>
              Win rate
            </span>
          </div>
        </div>

        <div className="overflow-x-auto px-2 pt-2">
          <div style={{ minWidth: `${chartMinWidth}px` }}>
            <ResponsiveContainer height={240} width="100%">
              <ComposedChart
                barCategoryGap="36%"
                data={chartData}
                margin={{ bottom: 54, left: 0, right: 2, top: 8 }}
              >
                <CartesianGrid
                  stroke={SOFT_GRID_STROKE}
                  strokeDasharray="3 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="corporationName"
                  height={64}
                  interval={0}
                  tick={<CorporationAxisTick />}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, Math.max(2, maxTaggedGames + 1)]}
                  tick={chartAxisTick}
                  tickLine={false}
                  width={34}
                  yAxisId="games"
                />
                <YAxis
                  domain={[0, 100]}
                  orientation="right"
                  tick={chartAxisTick}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  width={42}
                  yAxisId="rate"
                />
                <Tooltip
                  content={({ active, payload }) => (
                    <CorporationTooltip
                      active={active}
                      payload={
                        payload as unknown as TooltipPayloadItem[] | undefined
                      }
                    />
                  )}
                  cursor={{ fill: 'rgba(255,255,255,0.035)' }}
                />
                <Bar
                  barSize={24}
                  dataKey="withTagResults"
                  fill={chartSeriesColors.accent}
                  name="Tagged games"
                  radius={[7, 7, 0, 0]}
                  yAxisId="games"
                />
                <Line
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  dataKey="winRate"
                  dot={{ fill: chartSeriesColors.greenery, r: 4, strokeWidth: 2 }}
                  name="Win rate"
                  stroke={chartSeriesColors.greenery}
                  strokeWidth={3}
                  type="monotone"
                  unit="%"
                  yAxisId="rate"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-black/15">
        <div className="flex flex-col gap-2 border-b border-white/[0.07] px-3 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-4">
          <div>
            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-orange-300/80">
              Corporation detail
            </p>
            <h4 className="mt-1 text-sm font-semibold text-stone-100">
              Sortable performance table
            </h4>
          </div>
          <p className="text-xs text-stone-500">
            Select any column heading to reorder the rows.
          </p>
        </div>

        {!showUseRate ? (
          <p className="border-b border-white/[0.07] bg-sky-400/[0.035] px-4 py-2 text-[0.68rem] leading-5 text-stone-500">
            Use rate is identical for every corporation in this view, so that column is hidden until it provides a meaningful comparison.
          </p>
        ) : null}

        <div className="max-h-[440px] overflow-auto">
          <table
            className={`w-full table-fixed text-xs text-stone-300 ${
              showUseRate ? 'min-w-[900px]' : 'min-w-[780px]'
            }`}
          >
            <thead className="sticky top-0 z-10 bg-[#11171f]/95 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
              <tr>
                <th
                  aria-sort={getAriaSort(sortKey, 'corporationName', sortDirection)}
                  className="w-[27%] px-3 py-2 text-left"
                >
                  <SortButton
                    activeDirection={
                      sortKey === 'corporationName' ? sortDirection : null
                    }
                    align="left"
                    label="Corporation"
                    onClick={() => handleSort('corporationName')}
                  />
                </th>
                <th
                  aria-sort={getAriaSort(sortKey, 'results', sortDirection)}
                  className="w-[10%] px-2 py-2 text-right"
                >
                  <SortButton
                    activeDirection={sortKey === 'results' ? sortDirection : null}
                    label="Games"
                    onClick={() => handleSort('results')}
                  />
                </th>
                <th
                  aria-sort={getAriaSort(sortKey, 'withTagResults', sortDirection)}
                  className="w-[11%] px-2 py-2 text-right"
                >
                  <SortButton
                    activeDirection={
                      sortKey === 'withTagResults' ? sortDirection : null
                    }
                    label="Tagged"
                    onClick={() => handleSort('withTagResults')}
                  />
                </th>
                {showUseRate ? (
                  <th
                    aria-sort={getAriaSort(sortKey, 'tagUseRate', sortDirection)}
                    className="w-[15%] px-2 py-2 text-right"
                  >
                    <SortButton
                      activeDirection={
                        sortKey === 'tagUseRate' ? sortDirection : null
                      }
                      label="Use rate"
                      onClick={() => handleSort('tagUseRate')}
                    />
                  </th>
                ) : null}
                <th
                  aria-sort={getAriaSort(sortKey, 'averageTagCount', sortDirection)}
                  className="w-[12%] px-2 py-2 text-right"
                >
                  <SortButton
                    activeDirection={
                      sortKey === 'averageTagCount' ? sortDirection : null
                    }
                    label="Avg tags"
                    onClick={() => handleSort('averageTagCount')}
                  />
                </th>
                <th
                  aria-sort={getAriaSort(sortKey, 'winRate', sortDirection)}
                  className="w-[15%] px-2 py-2 text-right"
                >
                  <SortButton
                    activeDirection={sortKey === 'winRate' ? sortDirection : null}
                    label="Win rate"
                    onClick={() => handleSort('winRate')}
                  />
                </th>
                <th
                  aria-sort={getAriaSort(sortKey, 'winsWithTag', sortDirection)}
                  className="w-[12%] px-3 py-2 text-right"
                >
                  <SortButton
                    activeDirection={
                      sortKey === 'winsWithTag' ? sortDirection : null
                    }
                    label="Record"
                    onClick={() => handleSort('winsWithTag')}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((entry) => {
                const limited = entry.withTagResults < LIMITED_SAMPLE_SIZE;

                return (
                  <tr
                    className={`border-t border-white/[0.055] odd:bg-white/[0.015] transition-colors hover:bg-white/[0.045] focus-within:bg-white/[0.055] ${
                      limited ? 'text-stone-400' : ''
                    }`}
                    key={entry.corporationId ?? entry.corporationName}
                  >
                    <td className="px-4 py-3 text-left">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <SelectionNameButton
                          className="min-w-0 truncate text-left font-medium text-stone-200 transition hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60"
                          dialogData={dialogData}
                          kind="Corporation"
                          name={entry.corporationName}
                        />
                        {limited ? (
                          <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-0.5 text-[0.62rem] text-amber-100/80">
                            {limitedSampleLabel(entry.withTagResults)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-stone-200">
                      {entry.results}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-stone-200">
                      {entry.withTagResults}
                    </td>
                    {showUseRate ? (
                      <td className="px-3 py-3 text-right">
                        <RateCell tone="usage" value={entry.tagUseRate} />
                      </td>
                    ) : null}
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-stone-200">
                      {formatNumber(entry.averageTagCount)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <RateCell
                        limited={limited}
                        tone="win"
                        value={entry.withTagResults > 0 ? entry.winRate : null}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-stone-200">
                      {entry.withTagResults > 0
                        ? `${entry.winsWithTag}/${entry.withTagResults}`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-3 text-[0.68rem] leading-5 text-stone-500">
        Win rate and record use only games where the selected tag appeared. Rows with fewer than three tagged games are marked as limited data and should not be treated as conclusive.
      </p>
    </section>
  );
}
