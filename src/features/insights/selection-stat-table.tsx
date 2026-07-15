'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type {
  SelectionDialogData,
  SelectionStatRow,
} from '@/lib/db/selection-stats-repo';
import {
  SELECTION_NAME_LINK_CLASS,
  SelectionNameButton,
} from './selection-name-link';

type NamedStatRow = SelectionStatRow & { name: string };
type AugmentedRow = NamedStatRow & { globalPlays: number };

type SelectionKind = 'Corporation' | 'Prelude';
type ColumnType = 'number' | 'string';
type ColumnAlign = 'left' | 'center' | 'right';
type MetricTone =
  | 'neutral'
  | 'positive'
  | 'caution'
  | 'negative'
  | 'points'
  | 'tr'
  | 'cards'
  | 'microbes'
  | 'animals'
  | 'greenery'
  | 'cities'
  | 'milestones'
  | 'awards';

type Column = {
  align?: ColumnAlign;
  headerTone?: MetricTone;
  key: string;
  label: string;
  render: (row: AugmentedRow) => ReactNode;
  sectionStart?: boolean;
  type: ColumnType;
  value: (row: AugmentedRow) => number | string;
};

const metricToneClasses: Record<MetricTone, string> = {
  neutral: 'border-white/10 bg-white/[0.05] text-stone-100',
  positive: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  caution: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
  negative: 'border-rose-400/25 bg-rose-400/10 text-rose-100',
  points: 'border-teal-400/25 bg-teal-400/10 text-teal-100',
  tr: 'border-orange-400/25 bg-orange-400/10 text-orange-100',
  cards: 'border-yellow-400/25 bg-yellow-400/10 text-yellow-100',
  microbes: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
  animals: 'border-lime-400/25 bg-lime-400/10 text-lime-100',
  greenery: 'border-green-400/25 bg-green-400/10 text-green-100',
  cities: 'border-blue-400/25 bg-blue-400/10 text-blue-100',
  milestones: 'border-violet-400/25 bg-violet-400/10 text-violet-100',
  awards: 'border-pink-400/25 bg-pink-400/10 text-pink-100',
};

const headerDotClasses: Record<MetricTone, string> = {
  neutral: 'bg-stone-400',
  positive: 'bg-emerald-400',
  caution: 'bg-amber-400',
  negative: 'bg-rose-400',
  points: 'bg-teal-400',
  tr: 'bg-orange-400',
  cards: 'bg-yellow-400',
  microbes: 'bg-sky-400',
  animals: 'bg-lime-400',
  greenery: 'bg-green-400',
  cities: 'bg-blue-400',
  milestones: 'bg-violet-400',
  awards: 'bg-pink-400',
};

function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function formatPlayrate(plays: number, totalGames: number) {
  if (!totalGames || totalGames <= 0) {
    return '-';
  }

  return `${Math.round((plays / totalGames) * 100)}%`;
}

function formatAverage(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function getWinRateTone(winRate: number): MetricTone {
  if (winRate >= 0.5) {
    return 'positive';
  }

  if (winRate >= 0.3) {
    return 'caution';
  }

  return 'negative';
}

function getPlacementTone(placement: number): MetricTone {
  if (placement <= 1.5) {
    return 'positive';
  }

  if (placement <= 2) {
    return 'caution';
  }

  return 'negative';
}

function getInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words.at(-1)?.[0] ?? ''}`.toUpperCase();
}

function MetricValue({
  children,
  className = '',
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  tone?: MetricTone;
}) {
  return (
    <span
      className={`inline-flex min-w-[3.25rem] items-center justify-center rounded-md border px-2 py-1 text-[0.72rem] font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${metricToneClasses[tone]} ${className}`}
      data-metric-tone={tone}
    >
      {children}
    </span>
  );
}

function buildColumns(
  scopeTotalGames: number,
  globalTotalGames: number,
  kind: SelectionKind,
  dialogData?: SelectionDialogData,
): Column[] {
  return [
    {
      align: 'left',
      key: 'name',
      label: 'Name',
      type: 'string',
      value: (row) => row.name,
      render: (row) => (
        <div className="flex min-w-[11.5rem] items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-[0.62rem] font-bold tracking-[0.08em] text-stone-300"
          >
            {getInitials(row.name)}
          </span>
          <SelectionNameButton
            className={`${SELECTION_NAME_LINK_CLASS} max-w-[12rem] whitespace-normal text-left leading-[1.15]`}
            dialogData={dialogData}
            kind={kind}
            name={row.name}
          />
        </div>
      ),
    },
    {
      align: 'center',
      key: 'plays',
      label: 'Plays',
      type: 'number',
      value: (row) => row.plays,
      render: (row) => <MetricValue>{row.plays}</MetricValue>,
    },
    {
      align: 'center',
      key: 'playrate',
      label: 'Playrate',
      type: 'number',
      value: (row) => row.plays,
      render: (row) => (
        <MetricValue>{formatPlayrate(row.plays, scopeTotalGames)}</MetricValue>
      ),
    },
    {
      align: 'center',
      key: 'globalPlayrate',
      label: 'Global playrate',
      type: 'number',
      value: (row) => row.globalPlays,
      render: (row) => (
        <MetricValue>
          {formatPlayrate(row.globalPlays, globalTotalGames)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      key: 'winRate',
      label: 'Win rate',
      sectionStart: true,
      type: 'number',
      value: (row) => row.win_rate,
      render: (row) => (
        <MetricValue tone={getWinRateTone(row.win_rate)}>
          {formatWinRate(row.win_rate)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      key: 'avgPlacement',
      label: 'Avg place',
      type: 'number',
      value: (row) => row.avg_placement,
      render: (row) => (
        <MetricValue tone={getPlacementTone(row.avg_placement)}>
          {formatAverage(row.avg_placement, 2)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      key: 'finishes',
      label: '1st/2nd/3rd+',
      type: 'number',
      value: (row) => row.first_place_finishes,
      render: (row) => (
        <MetricValue className="min-w-[4.6rem]">
          {row.first_place_finishes}/{row.second_place_finishes}/
          {row.third_plus_finishes}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'points',
      key: 'avgPoints',
      label: 'Avg VP',
      type: 'number',
      value: (row) => row.avg_points,
      render: (row) => (
        <MetricValue tone="points">{formatAverage(row.avg_points)}</MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'tr',
      key: 'tr',
      label: 'TR',
      sectionStart: true,
      type: 'number',
      value: (row) => row.avg_tr_points,
      render: (row) => (
        <MetricValue tone="tr">{formatAverage(row.avg_tr_points)}</MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'cards',
      key: 'cards',
      label: 'Cards',
      type: 'number',
      value: (row) => row.avg_card_points,
      render: (row) => (
        <MetricValue tone="cards">
          {formatAverage(row.avg_card_points)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'microbes',
      key: 'microbes',
      label: 'Microbes',
      type: 'number',
      value: (row) => row.avg_microbe_points,
      render: (row) => (
        <MetricValue tone="microbes">
          {formatAverage(row.avg_microbe_points)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'animals',
      key: 'animals',
      label: 'Animals',
      type: 'number',
      value: (row) => row.avg_animal_points,
      render: (row) => (
        <MetricValue tone="animals">
          {formatAverage(row.avg_animal_points)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'greenery',
      key: 'greenery',
      label: 'Greenery',
      type: 'number',
      value: (row) => row.avg_greenery_points,
      render: (row) => (
        <MetricValue tone="greenery">
          {formatAverage(row.avg_greenery_points)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'cities',
      key: 'cities',
      label: 'Cities',
      type: 'number',
      value: (row) => row.avg_cities_points,
      render: (row) => (
        <MetricValue tone="cities">
          {formatAverage(row.avg_cities_points)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'milestones',
      key: 'milestones',
      label: 'Milestones',
      type: 'number',
      value: (row) => row.avg_milestone_points,
      render: (row) => (
        <MetricValue className="min-w-[4.5rem]" tone="milestones">
          {formatAverage(row.avg_milestone_points)} ({formatAverage(row.avg_milestones_won)})
        </MetricValue>
      ),
    },
    {
      align: 'center',
      headerTone: 'awards',
      key: 'awards',
      label: 'Awards',
      type: 'number',
      value: (row) => row.avg_award_points,
      render: (row) => (
        <MetricValue className="min-w-[4.5rem]" tone="awards">
          {formatAverage(row.avg_award_points)} ({formatAverage(row.avg_awards_won)})
        </MetricValue>
      ),
    },
  ];
}

function alignmentClasses(align: ColumnAlign = 'left') {
  if (align === 'center') {
    return 'text-center';
  }

  if (align === 'right') {
    return 'text-right';
  }

  return 'text-left';
}

export function SelectionStatTable(props: {
  rows: NamedStatRow[];
  scopeTotalGames: number;
  globalTotalGames: number;
  globalPlaysByName: Map<string, number>;
  kind: SelectionKind;
  dialogData?: SelectionDialogData;
}) {
  const columns = useMemo(
    () =>
      buildColumns(
        props.scopeTotalGames,
        props.globalTotalGames,
        props.kind,
        props.dialogData,
      ),
    [props.scopeTotalGames, props.globalTotalGames, props.kind, props.dialogData],
  );
  const [sortKey, setSortKey] = useState('plays');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const augmented = useMemo<AugmentedRow[]>(
    () =>
      props.rows.map((row) => ({
        ...row,
        globalPlays: props.globalPlaysByName.get(row.name) ?? 0,
      })),
    [props.rows, props.globalPlaysByName],
  );

  const sorted = useMemo(() => {
    const column = columns.find((entry) => entry.key === sortKey) ?? columns[0];
    const factor = direction === 'asc' ? 1 : -1;

    return [...augmented].sort((left, right) => {
      const leftValue = column.value(left);
      const rightValue = column.value(right);
      let comparison: number;

      if (typeof leftValue === 'string' || typeof rightValue === 'string') {
        comparison = String(leftValue).localeCompare(String(rightValue));
      } else {
        comparison = leftValue - rightValue;
      }

      return comparison * factor || left.name.localeCompare(right.name);
    });
  }, [augmented, columns, sortKey, direction]);

  function toggleSort(key: string, type: ColumnType) {
    if (key === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setDirection(type === 'string' ? 'asc' : 'desc');
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <p className="text-[0.7rem] font-medium text-stone-400">
          Sort any column to compare performance.
        </p>
        <p className="text-[0.68rem] text-stone-500">
          Names and headings remain visible while scrolling.
        </p>
      </div>
      <div
        className="max-h-[42rem] overflow-auto overscroll-contain"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table
          aria-label={`${props.kind} statistics`}
          className="min-w-[1390px] w-full border-separate border-spacing-0 text-xs"
        >
          <caption className="sr-only">
            {props.kind} play frequency, outcomes, and average victory-point sources.
          </caption>
          <thead>
            <tr>
              {columns.map((column, index) => {
                const active = column.key === sortKey;
                const SortIcon = active
                  ? direction === 'asc'
                    ? ArrowUp
                    : ArrowDown
                  : ChevronsUpDown;
                const stickyName = index === 0;

                return (
                  <th
                    aria-sort={
                      active
                        ? direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className={`sticky top-0 border-b border-white/10 bg-[#111821]/[0.98] px-3 py-2.5 ${alignmentClasses(column.align)} ${
                      stickyName
                        ? 'left-0 z-30 min-w-[14.5rem] border-r border-white/10'
                        : 'z-20'
                    } ${column.sectionStart ? 'border-l border-white/10' : ''}`}
                    key={column.key}
                  >
                    <button
                      className={`inline-flex w-full items-center gap-1.5 whitespace-nowrap font-semibold tracking-[0.045em] transition hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
                        column.align === 'center' ? 'justify-center' : 'justify-start'
                      } ${active ? 'text-stone-100' : 'text-stone-400'}`}
                      onClick={() => toggleSort(column.key, column.type)}
                      title={`Sort by ${column.label}`}
                      type="button"
                    >
                      {column.headerTone ? (
                        <span
                          aria-hidden
                          className={`h-2 w-2 rounded-sm ${headerDotClasses[column.headerTone]}`}
                        />
                      ) : null}
                      {column.label}
                      <SortIcon
                        aria-hidden
                        className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-45'}`}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                className="group odd:bg-white/[0.012] even:bg-white/[0.028] transition-colors hover:bg-amber-300/[0.055] focus-within:bg-amber-300/[0.055]"
                key={row.name}
              >
                {columns.map((column, index) => {
                  const stickyName = index === 0;

                  return (
                    <td
                      className={`border-b border-white/[0.055] px-3 py-2.5 align-middle ${alignmentClasses(column.align)} ${
                        stickyName
                          ? 'sticky left-0 z-10 border-r border-white/10 bg-[#11161d] group-hover:bg-[#1d1b18] group-focus-within:bg-[#1d1b18]'
                          : ''
                      } ${column.sectionStart ? 'border-l border-white/10' : ''}`}
                      key={column.key}
                    >
                      {column.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
