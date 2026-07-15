'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  chartAxisTick,
  chartGridStroke,
  chartTooltipStyle,
} from '@/components/charts/chart-theme';
import type {
  CorporationSelectionStat,
  PreludeSelectionStat,
} from '@/lib/db/selection-stats-repo';

// Stack order and hues validated together (CVD-safe adjacency on the dark
// surface) with the dataviz palette validator — keep order and colors paired.
const ORIGIN_SERIES = [
  { color: '#c14e1e', key: 'tr', label: 'TR' },
  { color: '#3388bb', key: 'cities', label: 'Cities' },
  { color: '#5f8b2c', key: 'greenery', label: 'Greenery' },
  { color: '#9a5fd0', key: 'milestones', label: 'Milestones' },
  { color: '#b08234', key: 'cards', label: 'Cards' },
  { color: '#c04a72', key: 'awards', label: 'Awards' },
] as const;
const CHART_SURFACE = '#141a22';
const AXIS_TICKS = [0, 25, 50, 75, 100];

type OriginSeriesKey = (typeof ORIGIN_SERIES)[number]['key'];
type SortMode = 'name' | 'plays' | 'vp';
type OriginKind = 'corporation' | 'prelude';

type OriginRow = (CorporationSelectionStat | PreludeSelectionStat) & {
  name: string;
};

type ShareRow = Record<OriginSeriesKey, number> & {
  averagePoints: number;
  name: string;
  plays: number;
};

type AxisTickProps = {
  payload?: { value?: string };
  x?: number;
  y?: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getOriginKind(row: OriginRow): OriginKind {
  return 'corporation_name' in row ? 'corporation' : 'prelude';
}

function toShareRow(row: OriginRow): ShareRow | null {
  const parts: Record<OriginSeriesKey, number> = {
    awards: Math.max(0, row.avg_award_points),
    cards: Math.max(0, row.avg_card_points),
    cities: Math.max(0, row.avg_cities_points),
    greenery: Math.max(0, row.avg_greenery_points),
    milestones: Math.max(0, row.avg_milestone_points),
    tr: Math.max(0, row.avg_tr_points),
  };
  const total = Object.values(parts).reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return null;
  }

  const shares = ORIGIN_SERIES.reduce<Record<OriginSeriesKey, number>>(
    (result, series) => {
      result[series.key] = Math.round((parts[series.key] / total) * 1000) / 10;
      return result;
    },
    {
      awards: 0,
      cards: 0,
      cities: 0,
      greenery: 0,
      milestones: 0,
      tr: 0,
    },
  );
  const roundedTotal = Object.values(shares).reduce(
    (sum, value) => sum + value,
    0,
  );
  const largestSeries = ORIGIN_SERIES.reduce((largest, series) =>
    shares[series.key] > shares[largest.key] ? series : largest,
  );

  // Rounding six independent shares can produce 99.9% or 100.1%. Correct the
  // largest segment so the normalized stack and its axis always end at 100%.
  shares[largestSeries.key] = Number(
    (shares[largestSeries.key] + (100 - roundedTotal)).toFixed(1),
  );

  return {
    averagePoints: row.avg_points,
    name: row.name,
    plays: row.plays,
    ...shares,
  };
}

function sortRows(rows: OriginRow[], sortMode: SortMode) {
  return [...rows].sort((left, right) => {
    if (sortMode === 'name') {
      return left.name.localeCompare(right.name);
    }

    if (sortMode === 'plays') {
      return (
        right.plays - left.plays ||
        right.avg_points - left.avg_points ||
        left.name.localeCompare(right.name)
      );
    }

    return (
      right.avg_points - left.avg_points ||
      right.win_rate - left.win_rate ||
      right.plays - left.plays ||
      left.name.localeCompare(right.name)
    );
  });
}

function MetricPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs tabular-nums text-stone-300">
      {children}
    </span>
  );
}

function RankingCard({
  dialogLabel,
  kind,
  rows,
}: {
  dialogLabel: string;
  kind: OriginKind;
  rows: OriginRow[];
}) {
  const rankedRows = sortRows(rows, 'vp').slice(0, 2);
  const title = kind === 'corporation' ? 'Top Corporations' : 'Top Preludes';

  if (rankedRows.length === 0) {
    return null;
  }

  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-sm font-semibold text-stone-100">{title}</h5>
        <span className="text-[0.65rem] uppercase tracking-[0.14em] text-stone-500">
          Ranked by average VP
        </span>
      </div>
      <ol className="mt-3 grid gap-2">
        {rankedRows.map((row, index) => {
          const isSmallSample = row.plays < 3;

          return (
            <li
              className="grid gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:border-white/15 hover:bg-white/[0.04] sm:grid-cols-[2rem_minmax(10rem,1fr)_auto] sm:items-center"
              key={row.name}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-orange-300/20 bg-orange-300/[0.08] text-xs font-semibold tabular-nums text-orange-100">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-100" title={row.name}>
                  {row.name}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">{dialogLabel}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                <MetricPill>{formatNumber(row.avg_points)} VP</MetricPill>
                <MetricPill>{formatPercent(row.win_rate)} win rate</MetricPill>
                <MetricPill>{formatNumber(row.avg_placement)} avg place</MetricPill>
                <MetricPill>{pluralize(row.plays, 'play')}</MetricPill>
                {isSmallSample ? (
                  <span className="inline-flex whitespace-nowrap rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2.5 py-1 text-xs text-amber-100/80">
                    Small sample
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function findScopeRoot(start: HTMLElement | null) {
  let candidate = start;

  while (candidate) {
    const hasDirectHeading = Array.from(candidate.children).some(
      (child) => child.tagName === 'H3',
    );

    if (hasDirectHeading) {
      return candidate;
    }

    candidate = candidate.parentElement;
  }

  return null;
}

export function SelectionOriginChart(props: { rows: OriginRow[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const minPlaysId = useId();
  const sortId = useId();
  const [isAllRecordedGames, setIsAllRecordedGames] = useState(false);
  const [minimumPlays, setMinimumPlays] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('vp');
  const kind: OriginKind = props.rows[0]
    ? getOriginKind(props.rows[0])
    : 'corporation';
  const kindLabel = kind === 'corporation' ? 'corporation' : 'prelude';
  const pluralKind = kind === 'corporation' ? 'corporations' : 'preludes';

  useEffect(() => {
    const root = rootRef.current;
    const wrapper = root?.parentElement ?? null;
    const scopeRoot = findScopeRoot(wrapper);
    const wrapperHeading = wrapper
      ? Array.from(wrapper.children).find((child) => child.tagName === 'H4')
      : null;
    const scopeHeading = scopeRoot
      ? Array.from(scopeRoot.children).find((child) => child.tagName === 'H3')
      : null;
    const headingText = scopeHeading?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const allRecorded = /all recorded games/i.test(headingText);
    const hiddenElements: HTMLElement[] = [];

    setIsAllRecordedGames(allRecorded);

    if (wrapperHeading instanceof HTMLElement) {
      wrapperHeading.hidden = true;
      wrapperHeading.dataset.selectionOriginHidden = 'true';
      hiddenElements.push(wrapperHeading);
    }

    if (kind === 'corporation' && scopeRoot) {
      const legacySummaryHeading = Array.from(
        scopeRoot.querySelectorAll<HTMLElement>('h4'),
      ).find((heading) =>
        /global value summary/i.test(
          heading.textContent?.replace(/\s+/g, ' ').trim() ?? '',
        ),
      );
      const legacySummary = legacySummaryHeading?.parentElement;

      if (legacySummary) {
        legacySummary.hidden = true;
        legacySummary.dataset.selectionOriginHidden = 'true';
        hiddenElements.push(legacySummary);
      }
    }

    if (scopeHeading instanceof HTMLElement) {
      scopeHeading.classList.add('text-base', 'sm:text-lg', 'tracking-[0.16em]');
    }

    return () => {
      for (const element of hiddenElements) {
        if (element.dataset.selectionOriginHidden === 'true') {
          element.hidden = false;
          delete element.dataset.selectionOriginHidden;
        }
      }

      if (scopeHeading instanceof HTMLElement) {
        scopeHeading.classList.remove(
          'text-base',
          'sm:text-lg',
          'tracking-[0.16em]',
        );
      }
    };
  }, [kind]);

  const filteredRows = useMemo(
    () => props.rows.filter((row) => row.plays >= minimumPlays),
    [minimumPlays, props.rows],
  );
  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortMode),
    [filteredRows, sortMode],
  );
  const data = useMemo(
    () =>
      sortedRows
        .slice(0, 8)
        .map(toShareRow)
        .filter((row): row is ShareRow => row !== null),
    [sortedRows],
  );
  const totalPlays = props.rows.reduce((sum, row) => sum + row.plays, 0);
  const weightedAverageVp =
    totalPlays > 0
      ? props.rows.reduce(
          (sum, row) => sum + row.avg_points * row.plays,
          0,
        ) / totalPlays
      : 0;

  const renderYAxisTick = ({ payload, x = 0, y = 0 }: AxisTickProps) => {
    const name = payload?.value ?? '';
    const row = data.find((entry) => entry.name === name);
    const shortenedName = name.length > 22 ? `${name.slice(0, 21)}…` : name;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          dominantBaseline="central"
          fill="#e7ded1"
          fontSize={12}
          textAnchor="end"
          x={-8}
          y={0}
        >
          <tspan>{shortenedName}</tspan>
          {row ? (
            <tspan dx={6} fill="#8d8275" fontSize={10}>
              {pluralize(row.plays, 'play')}
            </tspan>
          ) : null}
        </text>
      </g>
    );
  };

  if (props.rows.length === 0) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-white/10 bg-[rgba(7,10,15,0.48)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:p-5"
      data-selection-origin-chart={kind}
      ref={rootRef}
    >
      {isAllRecordedGames && kind === 'corporation' ? (
        <div className="mb-5 border-b border-white/10 pb-5">
          <p className="max-w-3xl text-sm leading-relaxed text-stone-300">
            Corporation, prelude, and card performance across every recorded game — including games you did not play in.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill>{pluralize(props.rows.length, 'corporation')}</MetricPill>
            <MetricPill>{pluralize(totalPlays, 'recorded play')}</MetricPill>
            <MetricPill>{formatNumber(weightedAverageVp)} avg VP</MetricPill>
          </div>
        </div>
      ) : null}

      <RankingCard
        dialogLabel={`${pluralize(filteredRows.length, kindLabel)} in the current filter`}
        kind={kind}
        rows={filteredRows}
      />

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-stone-500">
              Scoring composition
            </p>
            <h5 className="mt-1 text-base font-semibold text-stone-100">
              Where Points Come From
            </h5>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">
              Average share of final VP by {kindLabel}. Bars are normalized to 100%.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-[0.65rem] uppercase tracking-[0.12em] text-stone-500" htmlFor={minPlaysId}>
              Minimum sample
              <select
                className="rounded-lg border border-white/10 bg-stone-950/80 px-2.5 py-1.5 text-xs normal-case tracking-normal text-stone-200 outline-none transition focus:border-sky-300/40"
                id={minPlaysId}
                onChange={(event) => setMinimumPlays(Number(event.target.value))}
                value={minimumPlays}
              >
                <option value={1}>1+ plays</option>
                <option value={3}>3+ plays</option>
                <option value={5}>5+ plays</option>
              </select>
            </label>
            <label className="grid gap-1 text-[0.65rem] uppercase tracking-[0.12em] text-stone-500" htmlFor={sortId}>
              Sort
              <select
                className="rounded-lg border border-white/10 bg-stone-950/80 px-2.5 py-1.5 text-xs normal-case tracking-normal text-stone-200 outline-none transition focus:border-sky-300/40"
                id={sortId}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                value={sortMode}
              >
                <option value="vp">Average VP</option>
                <option value="plays">Most played</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>

        <div
          aria-label="Score-source legend"
          className="flex flex-wrap gap-x-4 gap-y-2 border-y border-white/[0.08] py-2.5 text-xs text-stone-400"
        >
          {ORIGIN_SERIES.map((series) => (
            <span className="inline-flex items-center gap-1.5" key={series.key}>
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </span>
          ))}
        </div>

        {data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-stone-400">
            No {pluralKind} meet the selected minimum sample.
          </p>
        ) : (
          <div style={{ height: 78 + data.length * 44 }}>
            <ResponsiveContainer height="100%" width="100%">
              <BarChart
                barCategoryGap={14}
                data={data}
                layout="vertical"
                margin={{ bottom: 4, left: 16, right: 16, top: 4 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke={chartGridStroke}
                  strokeDasharray="3 5"
                  vertical
                />
                <XAxis
                  allowDecimals={false}
                  domain={[0, 100]}
                  tick={chartAxisTick}
                  tickFormatter={(value: number) => `${Math.round(value)}%`}
                  ticks={AXIS_TICKS}
                  type="number"
                />
                <YAxis
                  dataKey="name"
                  interval={0}
                  tick={renderYAxisTick}
                  tickLine={false}
                  type="category"
                  width={205}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.035)' }}
                  formatter={(value, label) => [
                    `${formatNumber(Number(value))}%`,
                    String(label),
                  ]}
                />
                {ORIGIN_SERIES.map((series, index) => (
                  <Bar
                    barSize={18}
                    dataKey={series.key}
                    fill={series.color}
                    isAnimationActive={false}
                    key={series.key}
                    name={series.label}
                    radius={
                      index === 0
                        ? [5, 0, 0, 5]
                        : index === ORIGIN_SERIES.length - 1
                          ? [0, 5, 5, 0]
                          : 0
                    }
                    stackId="origin"
                    stroke={CHART_SURFACE}
                    strokeWidth={1}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
