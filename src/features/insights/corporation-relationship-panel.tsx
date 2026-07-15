'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  chartAxisTick,
  chartSeriesColors,
  chartTooltipStyle,
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
  | 'winsWithTag';

type AxisTickProps = {
  payload?: { value?: string };
  x?: number;
  y?: number;
};

const SOFT_GRID_STROKE = 'rgba(120, 113, 108, 0.22)';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function shortenLabel(value: string, maxLength = 17) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
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

function CorporationAxisTick({ payload, x = 0, y = 0 }: AxisTickProps) {
  const name = payload?.value ?? '';

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{name}</title>
      <text
        fill="#cfc7bc"
        fontSize={11}
        textAnchor="end"
        transform="rotate(-38)"
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
      <dd className="mt-1 truncate text-base font-semibold tabular-nums text-stone-100" title={value}>
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

function RateCell({ tone, value }: { tone: 'green' | 'blue'; value: number }) {
  const fillClass = tone === 'green' ? 'bg-lime-400/20' : 'bg-sky-400/20';

  return (
    <div
      aria-label={`${value}%`}
      className="relative ml-auto h-7 w-24 overflow-hidden rounded-lg border border-white/[0.07] bg-black/20"
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 ${fillClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      <span
        className={`relative z-10 flex h-full items-center justify-end px-2 font-medium tabular-nums ${
          value === 100 ? 'text-stone-300' : 'text-stone-100'
        }`}
      >
        {value}%
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

export function CorporationRelationshipPanel({
  data,
  dialogData,
}: {
  data: CorporationTagDatum[];
  dialogData?: SelectionDialogData;
}) {
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [sortKey, setSortKey] = useState<SortKey>('results');

  const sortedData = useMemo(
    () => [...data].sort((left, right) => compareRows(left, right, sortKey, sortDirection)),
    [data, sortDirection, sortKey],
  );

  const summary = useMemo(() => {
    const totalResults = data.reduce((sum, entry) => sum + entry.results, 0);
    const averageCount =
      totalResults > 0
        ? data.reduce(
            (sum, entry) => sum + entry.averageTagCount * entry.results,
            0,
          ) / totalResults
        : 0;
    const mostUsed = [...data].sort(
      (left, right) =>
        right.withTagResults - left.withTagResults ||
        right.tagUseRate - left.tagUseRate ||
        right.results - left.results ||
        left.corporationName.localeCompare(right.corporationName),
    )[0];
    const highestWinRate = [...data]
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
      mostUsed,
      totalResults,
    };
  }, [data]);

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
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-orange-200 sm:text-base">
          Corporation relationship
        </h3>
        <p className="max-w-3xl text-xs leading-5 text-stone-400 sm:text-sm">
          Compare how often each corporation used the selected tag with the win rate of those tagged results.
        </p>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryMetric label="Corporations tracked" value={String(data.length)} />
        <SummaryMetric label="Corporation results" value={String(summary.totalResults)} />
        <SummaryMetric
          detail={summary.mostUsed ? `${summary.mostUsed.tagUseRate}% use rate` : undefined}
          label="Most used"
          value={summary.mostUsed?.corporationName ?? '—'}
        />
        <SummaryMetric
          detail={
            summary.highestWinRate
              ? `${summary.highestWinRate.winsWithTag}/${summary.highestWinRate.withTagResults} wins`
              : undefined
          }
          label="Highest win rate"
          value={
            summary.highestWinRate
              ? `${summary.highestWinRate.corporationName} · ${summary.highestWinRate.winRate}%`
              : '—'
          }
        />
        <SummaryMetric
          label="Average tag count"
          value={formatNumber(summary.averageCount)}
        />
      </dl>

      <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.07] bg-black/15 px-2 pt-2">
        <div className="min-w-[760px]">
          <ResponsiveContainer height={260} width="100%">
            <ComposedChart
              barCategoryGap="34%"
              data={data}
              margin={{ bottom: 60, left: 2, right: 16, top: 10 }}
            >
              <CartesianGrid stroke={SOFT_GRID_STROKE} strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="corporationName"
                height={70}
                interval={0}
                tick={<CorporationAxisTick />}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={chartAxisTick}
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                width={42}
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend
                iconSize={10}
                verticalAlign="top"
                wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
              />
              <Bar
                barSize={24}
                dataKey="tagUseRate"
                fill={chartSeriesColors.accent}
                name="Use rate"
                radius={[7, 7, 0, 0]}
                unit="%"
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
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 max-h-[430px] overflow-auto rounded-xl border border-white/[0.08] bg-black/15">
        <table className="min-w-[760px] w-full table-fixed text-xs text-stone-300">
          <thead className="sticky top-0 z-10 bg-[#11171f]/95 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
            <tr>
              <th
                aria-sort={
                  sortKey === 'corporationName'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="w-[30%] px-3 py-2 text-left"
              >
                <SortButton
                  activeDirection={sortKey === 'corporationName' ? sortDirection : null}
                  align="left"
                  label="Corporation"
                  onClick={() => handleSort('corporationName')}
                />
              </th>
              <th
                aria-sort={
                  sortKey === 'results'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="w-[12%] px-2 py-2 text-right"
              >
                <SortButton
                  activeDirection={sortKey === 'results' ? sortDirection : null}
                  label="Results"
                  onClick={() => handleSort('results')}
                />
              </th>
              <th
                aria-sort={
                  sortKey === 'tagUseRate'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="w-[16%] px-2 py-2 text-right"
              >
                <SortButton
                  activeDirection={sortKey === 'tagUseRate' ? sortDirection : null}
                  label="Use rate"
                  onClick={() => handleSort('tagUseRate')}
                />
              </th>
              <th
                aria-sort={
                  sortKey === 'averageTagCount'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="w-[13%] px-2 py-2 text-right"
              >
                <SortButton
                  activeDirection={sortKey === 'averageTagCount' ? sortDirection : null}
                  label="Avg count"
                  onClick={() => handleSort('averageTagCount')}
                />
              </th>
              <th
                aria-sort={
                  sortKey === 'winRate'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="w-[16%] px-2 py-2 text-right"
              >
                <SortButton
                  activeDirection={sortKey === 'winRate' ? sortDirection : null}
                  label="Win rate"
                  onClick={() => handleSort('winRate')}
                />
              </th>
              <th
                aria-sort={
                  sortKey === 'winsWithTag'
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                className="w-[13%] px-3 py-2 text-right"
              >
                <SortButton
                  activeDirection={sortKey === 'winsWithTag' ? sortDirection : null}
                  label="Wins"
                  onClick={() => handleSort('winsWithTag')}
                />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((entry) => (
              <tr
                className="border-t border-white/[0.055] odd:bg-white/[0.015] transition-colors hover:bg-white/[0.045]"
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
                    {entry.results < 3 ? (
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-0.5 text-[0.62rem] text-amber-100/80">
                        Small sample
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-stone-200">
                  {entry.results}
                </td>
                <td className="px-3 py-3 text-right">
                  <RateCell tone="blue" value={entry.tagUseRate} />
                </td>
                <td className="px-3 py-3 text-right font-medium tabular-nums text-stone-200">
                  {formatNumber(entry.averageTagCount)}
                </td>
                <td className="px-3 py-3 text-right">
                  <RateCell tone="green" value={entry.winRate} />
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums text-stone-200">
                  {entry.winsWithTag}/{entry.withTagResults}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[0.68rem] leading-5 text-stone-500">
        Win rate is based only on results where the selected tag appeared. Rows with fewer than three results are marked as small samples.
      </p>
    </section>
  );
}
