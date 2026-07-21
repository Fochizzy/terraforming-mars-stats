'use client';

import { Fragment, type ReactNode, useId, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Columns3,
  Search,
} from 'lucide-react';
import {
  CorporationLogo,
  hasCorporationLogo,
} from '@/components/ui/corporation-logo';
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
type ColumnGroup = 'identity' | 'usage' | 'results' | 'production';
type ColumnPreset = 'all' | 'overview' | 'performance' | 'engine' | 'custom';
type SortDirection = 'asc' | 'desc';
type MetricTone = 'neutral' | 'positive' | 'caution' | 'negative' | 'points';

type SortRule = {
  direction: SortDirection;
  key: string;
};

type CellContext = {
  averageVp: number;
  expanded: boolean;
  hasMobileDetails: boolean;
  lowSample: boolean;
  toggleExpanded: () => void;
};

type Column = {
  align?: ColumnAlign;
  description: string;
  group: ColumnGroup;
  key: string;
  label: string;
  mobile: boolean;
  render: (row: AugmentedRow, context: CellContext) => ReactNode;
  type: ColumnType;
  value: (row: AugmentedRow) => number | string;
};

const LOW_SAMPLE_PLAYS = 3;
const UNAVAILABLE = '\u2014';

const groupLabels: Record<ColumnGroup, string> = {
  identity: 'Selection',
  usage: 'Usage',
  results: 'Results',
  production: 'Production',
};

const presetLabels: Record<Exclude<ColumnPreset, 'custom'>, string> = {
  all: 'All metrics',
  overview: 'Overview',
  performance: 'Performance',
  engine: 'Engine stats',
};

const presetColumnKeys: Record<Exclude<ColumnPreset, 'custom'>, string[]> = {
  all: [
    'name',
    'plays',
    'playRate',
    'globalPlayRate',
    'winRate',
    'avgPlacement',
    'finishes',
    'avgPoints',
    'tr',
    'cards',
    'microbes',
    'animals',
    'greenery',
    'cities',
    'milestones',
    'awards',
  ],
  overview: ['name', 'plays', 'winRate', 'avgPlacement', 'avgPoints'],
  performance: [
    'name',
    'plays',
    'playRate',
    'globalPlayRate',
    'winRate',
    'avgPlacement',
    'finishes',
    'avgPoints',
  ],
  engine: [
    'name',
    'avgPoints',
    'tr',
    'cards',
    'microbes',
    'animals',
    'greenery',
    'cities',
    'milestones',
    'awards',
  ],
};

const scoreSourceLegend = [
  { label: 'Terraform rating', shortLabel: 'TR' },
  { label: 'Cards', shortLabel: 'Cards' },
  { label: 'Microbes', shortLabel: 'Microbes' },
  { label: 'Animals', shortLabel: 'Animals' },
  { label: 'Greenery', shortLabel: 'Greenery' },
  { label: 'Cities', shortLabel: 'Cities' },
  { label: 'Milestones', shortLabel: 'Milestones' },
  { label: 'Awards', shortLabel: 'Awards' },
];

const metricToneClasses: Record<MetricTone, string> = {
  neutral: 'border-white/10 bg-white/[0.045] text-stone-100',
  positive: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100',
  caution: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-100',
  negative: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-100',
  points: 'border-teal-400/25 bg-teal-400/[0.08] text-teal-100',
};

const metricBarClasses: Record<MetricTone, string> = {
  neutral: 'bg-stone-300/10',
  positive: 'bg-emerald-300/10',
  caution: 'bg-amber-300/10',
  negative: 'bg-rose-300/10',
  points: 'bg-teal-300/10',
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatWinRate(winRate: number) {
  return `${Math.round(winRate * 100)}%`;
}

function formatPlayRate(plays: number, totalGames: number) {
  if (!totalGames || totalGames <= 0) {
    return UNAVAILABLE;
  }

  return `${Math.round((plays / totalGames) * 100)}%`;
}

function formatAverage(value: number, fractionDigits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
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
  barPercent,
  children,
  className = '',
  tone = 'neutral',
}: {
  barPercent?: number;
  children: ReactNode;
  className?: string;
  tone?: MetricTone;
}) {
  return (
    <span
      className={`relative inline-flex min-w-[4rem] items-center justify-end overflow-hidden rounded-md border px-2.5 py-1.5 text-[0.78rem] font-semibold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] ${metricToneClasses[tone]} ${className}`}
      data-metric-tone={tone}
    >
      {barPercent === undefined ? null : (
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 ${metricBarClasses[tone]}`}
          style={{ width: `${clampPercent(barPercent)}%` }}
        />
      )}
      <span className="relative">{children}</span>
    </span>
  );
}

function TabularValue({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-block min-w-[3.5rem] text-right font-medium tabular-nums text-stone-200"
      data-numeric-value
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
      description: `${kind} name. Open it for detailed statistics.`,
      group: 'identity',
      key: 'name',
      label: kind,
      mobile: true,
      type: 'string',
      value: (row) => row.name,
      render: (row, context) => (
        <div className="flex min-w-[12.5rem] items-center gap-3">
          {context.hasMobileDetails ? (
            <button
              aria-expanded={context.expanded}
              aria-label={`${context.expanded ? 'Hide' : 'Show'} details for ${row.name}`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-stone-400 transition hover:border-amber-300/30 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 md:hidden"
              onClick={(event) => {
                event.stopPropagation();
                context.toggleExpanded();
              }}
              type="button"
            >
              {context.expanded ? (
                <ChevronDown aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight aria-hidden className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
          {kind === 'Corporation' && hasCorporationLogo(row.name) ? (
            <CorporationLogo
              className="h-8 w-16 shrink-0 rounded-lg border border-white/10 bg-white/[0.05] p-0.5"
              name={row.name}
              size={32}
            />
          ) : (
            <span
              aria-hidden
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-[0.64rem] font-bold tracking-[0.08em] text-stone-300"
            >
              {getInitials(row.name)}
            </span>
          )}
          <div className="min-w-0">
            <SelectionNameButton
              className={`${SELECTION_NAME_LINK_CLASS} max-w-[13rem] whitespace-normal text-left text-[0.82rem] font-semibold leading-[1.2] text-stone-50`}
              dialogData={dialogData}
              kind={kind}
              name={row.name}
            />
            {context.lowSample ? (
              <span
                className="mt-1 inline-flex rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-amber-200"
                data-low-sample-indicator
                title={`Performance metrics are based on fewer than ${LOW_SAMPLE_PLAYS} plays.`}
              >
                Low sample
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      align: 'right',
      description: `Recorded ${kind.toLowerCase()} selections in this view`,
      group: 'usage',
      key: 'plays',
      label: 'Plays',
      mobile: true,
      type: 'number',
      value: (row) => row.plays,
      render: (row) => <TabularValue>{row.plays}</TabularValue>,
    },
    {
      align: 'right',
      description: 'Share of games in the current scope using this selection',
      group: 'usage',
      key: 'playRate',
      label: 'Play rate',
      mobile: false,
      type: 'number',
      value: (row) => (scopeTotalGames > 0 ? row.plays / scopeTotalGames : 0),
      render: (row) => (
        <TabularValue>{formatPlayRate(row.plays, scopeTotalGames)}</TabularValue>
      ),
    },
    {
      align: 'right',
      description: 'Share of all recorded games using this selection',
      group: 'usage',
      key: 'globalPlayRate',
      label: 'Global rate',
      mobile: false,
      type: 'number',
      value: (row) => (globalTotalGames > 0 ? row.globalPlays / globalTotalGames : 0),
      render: (row) => (
        <TabularValue>
          {formatPlayRate(row.globalPlays, globalTotalGames)}
        </TabularValue>
      ),
    },
    {
      align: 'right',
      description: 'Percentage of recorded plays that resulted in a win',
      group: 'results',
      key: 'winRate',
      label: 'Win rate',
      mobile: true,
      type: 'number',
      value: (row) => row.win_rate,
      render: (row) => (
        <MetricValue
          barPercent={row.win_rate * 100}
          tone={getWinRateTone(row.win_rate)}
        >
          {formatWinRate(row.win_rate)}
        </MetricValue>
      ),
    },
    {
      align: 'right',
      description: 'Average finishing position; lower is better',
      group: 'results',
      key: 'avgPlacement',
      label: 'Avg placement',
      mobile: true,
      type: 'number',
      value: (row) => row.avg_placement,
      render: (row) => (
        <MetricValue
          barPercent={((4 - row.avg_placement) / 3) * 100}
          tone={getPlacementTone(row.avg_placement)}
        >
          {formatAverage(row.avg_placement, 2)}
        </MetricValue>
      ),
    },
    {
      align: 'center',
      description: 'First, second, and third-or-lower finishes',
      group: 'results',
      key: 'finishes',
      label: 'Placements',
      mobile: false,
      type: 'number',
      value: (row) => row.first_place_finishes,
      render: (row) => (
        <span
          className="inline-flex min-w-[5.25rem] justify-center rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[0.75rem] font-medium tabular-nums text-stone-200"
          title="First / second / third or lower"
        >
          {row.first_place_finishes} / {row.second_place_finishes} /{' '}
          {row.third_plus_finishes}
        </span>
      ),
    },
    {
      align: 'right',
      description: 'Average total victory points',
      group: 'results',
      key: 'avgPoints',
      label: 'Average VP',
      mobile: true,
      type: 'number',
      value: (row) => row.avg_points,
      render: (row, context) => (
        <MetricValue
          barPercent={(row.avg_points / 120) * 100}
          tone={row.avg_points >= context.averageVp ? 'positive' : 'points'}
        >
          {formatAverage(row.avg_points)}
        </MetricValue>
      ),
    },
    {
      align: 'right',
      description: 'Average victory points from Terraform Rating',
      group: 'production',
      key: 'tr',
      label: 'Terraform rating',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_tr_points,
      render: (row) => <TabularValue>{formatAverage(row.avg_tr_points)}</TabularValue>,
    },
    {
      align: 'right',
      description: 'Average victory points printed on cards',
      group: 'production',
      key: 'cards',
      label: 'Card points',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_card_points,
      render: (row) => <TabularValue>{formatAverage(row.avg_card_points)}</TabularValue>,
    },
    {
      align: 'right',
      description: 'Average victory points from microbes',
      group: 'production',
      key: 'microbes',
      label: 'Microbes',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_microbe_points,
      render: (row) => (
        <TabularValue>{formatAverage(row.avg_microbe_points)}</TabularValue>
      ),
    },
    {
      align: 'right',
      description: 'Average victory points from animals',
      group: 'production',
      key: 'animals',
      label: 'Animals',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_animal_points,
      render: (row) => (
        <TabularValue>{formatAverage(row.avg_animal_points)}</TabularValue>
      ),
    },
    {
      align: 'right',
      description: 'Average victory points from greenery tiles',
      group: 'production',
      key: 'greenery',
      label: 'Greenery',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_greenery_points,
      render: (row) => (
        <TabularValue>{formatAverage(row.avg_greenery_points)}</TabularValue>
      ),
    },
    {
      align: 'right',
      description: 'Average victory points from city tiles',
      group: 'production',
      key: 'cities',
      label: 'Cities',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_cities_points,
      render: (row) => (
        <TabularValue>{formatAverage(row.avg_cities_points)}</TabularValue>
      ),
    },
    {
      align: 'right',
      description: 'Average milestone points, with milestones won in parentheses',
      group: 'production',
      key: 'milestones',
      label: 'Milestones',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_milestone_points,
      render: (row) => (
        <TabularValue>
          {formatAverage(row.avg_milestone_points)} ({formatAverage(row.avg_milestones_won)})
        </TabularValue>
      ),
    },
    {
      align: 'right',
      description: 'Average award points, with awards won in parentheses',
      group: 'production',
      key: 'awards',
      label: 'Awards',
      mobile: false,
      type: 'number',
      value: (row) => row.avg_award_points,
      render: (row) => (
        <TabularValue>
          {formatAverage(row.avg_award_points)} ({formatAverage(row.avg_awards_won)})
        </TabularValue>
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

function defaultDirection(type: ColumnType): SortDirection {
  return type === 'string' ? 'asc' : 'desc';
}

function compareValues(leftValue: number | string, rightValue: number | string) {
  if (typeof leftValue === 'string' || typeof rightValue === 'string') {
    return String(leftValue).localeCompare(String(rightValue));
  }

  return leftValue - rightValue;
}

function parseMinimumPlays(value: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export function SelectionStatTable(props: {
  rows: NamedStatRow[];
  scopeTotalGames: number;
  globalTotalGames: number;
  globalPlaysByName: Map<string, number>;
  kind: SelectionKind;
  dialogData?: SelectionDialogData;
}) {
  const reactId = useId();
  const searchId = `${reactId}-search`;
  const minimumSampleId = `${reactId}-min-plays`;

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
  const [preset, setPreset] = useState<ColumnPreset>('all');
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(
    () => new Set(presetColumnKeys.all),
  );
  const [sortRules, setSortRules] = useState<SortRule[]>([
    { direction: 'desc', key: 'plays' },
  ]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set());
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [minimumPlays, setMinimumPlays] = useState(0);

  const augmented = useMemo<AugmentedRow[]>(
    () =>
      props.rows.map((row) => ({
        ...row,
        globalPlays: props.globalPlaysByName.get(row.name) ?? 0,
      })),
    [props.rows, props.globalPlaysByName],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return augmented.filter((row) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        row.name.toLowerCase().includes(normalizedSearch);

      return matchesSearch && row.plays >= minimumPlays;
    });
  }, [augmented, minimumPlays, searchTerm]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnKeys.has(column.key)),
    [columns, visibleColumnKeys],
  );

  const hiddenMobileColumns = useMemo(
    () => visibleColumns.filter((column) => !column.mobile),
    [visibleColumns],
  );

  const groupedColumns = useMemo(
    () =>
      (['identity', 'usage', 'results', 'production'] as ColumnGroup[])
        .map((group) => ({
          columns: visibleColumns.filter((column) => column.group === group),
          group,
        }))
        .filter((entry) => entry.columns.length > 0),
    [visibleColumns],
  );

  const sorted = useMemo(() => {
    return [...filteredRows].sort((left, right) => {
      for (const rule of sortRules) {
        const column = columns.find((entry) => entry.key === rule.key);

        if (!column) {
          continue;
        }

        const comparison = compareValues(column.value(left), column.value(right));
        if (comparison !== 0) {
          return comparison * (rule.direction === 'asc' ? 1 : -1);
        }
      }

      return left.name.localeCompare(right.name);
    });
  }, [columns, filteredRows, sortRules]);

  const summary = useMemo(() => {
    const totalPlays = augmented.reduce((total, row) => total + row.plays, 0);
    const weightedVp =
      totalPlays > 0
        ? augmented.reduce((total, row) => total + row.avg_points * row.plays, 0) /
          totalPlays
        : 0;

    return {
      competitiveRows: augmented.filter((row) => row.win_rate >= 0.5).length,
      lowSampleRows: filteredRows.filter((row) => row.plays < LOW_SAMPLE_PLAYS).length,
      totalPlays,
      weightedVp,
    };
  }, [augmented, filteredRows]);

  function applyPreset(nextPreset: Exclude<ColumnPreset, 'custom'>) {
    setPreset(nextPreset);
    setVisibleColumnKeys(new Set(presetColumnKeys[nextPreset]));
    setSortRules([
      {
        direction: 'desc',
        key: nextPreset === 'engine' ? 'avgPoints' : 'plays',
      },
    ]);
  }

  function toggleColumn(key: string) {
    if (key === 'name') {
      return;
    }

    setPreset('custom');
    setVisibleColumnKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      setSortRules((currentRules) => {
        const visibleRules = currentRules.filter((rule) => next.has(rule.key));
        return visibleRules.length > 0
          ? visibleRules
          : [{ direction: 'asc', key: 'name' }];
      });

      return next;
    });
  }

  function toggleSort(key: string, type: ColumnType, additive: boolean) {
    setSortRules((current) => {
      const existingIndex = current.findIndex((rule) => rule.key === key);

      if (!additive) {
        if (existingIndex === 0 && current.length === 1) {
          return [
            {
              direction: current[0].direction === 'asc' ? 'desc' : 'asc',
              key,
            },
          ];
        }

        return [{ direction: defaultDirection(type), key }];
      }

      if (existingIndex >= 0) {
        return current.map((rule, index) =>
          index === existingIndex
            ? {
                ...rule,
                direction: rule.direction === 'asc' ? 'desc' : 'asc',
              }
            : rule,
        );
      }

      return [...current, { direction: defaultDirection(type), key }];
    });
  }

  function toggleExpandedRow(name: string) {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  const entityLabel = props.kind === 'Corporation' ? 'corporations' : 'preludes';

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_18px_45px_rgba(0,0,0,0.18)]">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl border-b border-white/10 bg-white/10 lg:grid-cols-4">
        <div className="bg-[#111821] px-4 py-3">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
            Showing
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums text-stone-100">
            {filteredRows.length} / {augmented.length} {entityLabel}
          </p>
        </div>
        <div className="bg-[#111821] px-4 py-3">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
            Total plays
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums text-stone-100">
            {summary.totalPlays}
          </p>
        </div>
        <div className="bg-[#111821] px-4 py-3">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
            Win rate 50%+
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums text-emerald-200">
            {summary.competitiveRows}
          </p>
        </div>
        <div className="bg-[#111821] px-4 py-3">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
            Weighted avg VP
          </p>
          <p className="mt-1 text-base font-semibold tabular-nums text-teal-100">
            {formatAverage(summary.weightedVp)}
          </p>
        </div>
      </div>

      {/* Search + min-sample + column controls */}
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-[minmax(14rem,1fr)_9rem]">
            <div>
              <label
                className="mb-1.5 block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-stone-500"
                htmlFor={searchId}
              >
                Search
              </label>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500"
                />
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 hover:border-white/20 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                  id={searchId}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={`Search ${entityLabel}`}
                  type="search"
                  value={searchTerm}
                />
              </div>
            </div>

            <div>
              <label
                className="mb-1.5 block text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-stone-500"
                htmlFor={minimumSampleId}
              >
                Min plays
              </label>
              <input
                className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-stone-100 outline-none transition hover:border-white/20 focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                id={minimumSampleId}
                min={0}
                onChange={(event) => setMinimumPlays(parseMinimumPlays(event.target.value))}
                type="number"
                value={minimumPlays}
              />
            </div>
          </div>

          <div className="relative z-40 flex flex-wrap items-end gap-2">
            <div>
              <p className="mb-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Columns
              </p>
              <div className="flex flex-wrap gap-2">
                <div
                  aria-label="Column presets"
                  className="inline-flex flex-wrap rounded-lg border border-white/10 bg-black/25 p-1"
                  role="group"
                >
                  {(Object.keys(presetLabels) as Array<Exclude<ColumnPreset, 'custom'>>).map(
                    (key) => (
                      <button
                        aria-pressed={preset === key}
                        className={`rounded-md px-2.5 py-1.5 text-[0.68rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
                          preset === key
                            ? 'bg-amber-300/[0.12] text-amber-100 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.18)]'
                            : 'text-stone-400 hover:bg-white/[0.05] hover:text-stone-100'
                        }`}
                        key={key}
                        onClick={() => applyPreset(key)}
                        type="button"
                      >
                        {presetLabels[key]}
                      </button>
                    ),
                  )}
                </div>

                <details className="relative">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-[0.68rem] font-semibold text-stone-300 transition hover:border-white/20 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60">
                    <Columns3 aria-hidden className="h-3.5 w-3.5" />
                    Columns
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-white/10 bg-[#111821] p-3 shadow-2xl">
                    <p className="mb-2 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Visible metrics
                    </p>
                    <div className="grid max-h-72 gap-1 overflow-auto pr-1">
                      {columns.map((column) => (
                        <label
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-xs text-stone-300 hover:bg-white/[0.045]"
                          key={column.key}
                          title={column.description}
                        >
                          <span>{column.label}</span>
                          <input
                            checked={visibleColumnKeys.has(column.key)}
                            className="accent-amber-400"
                            disabled={column.key === 'name'}
                            onChange={() => toggleColumn(column.key)}
                            type="checkbox"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>

        {/* Status + low-sample warning */}
        <div className="flex flex-col gap-2 text-[0.72rem] text-stone-400 lg:flex-row lg:items-center lg:justify-between">
          <p aria-live="polite" role="status">
            Showing {sorted.length} of {augmented.length} {entityLabel}. Click a heading
            to sort; hold Shift to add a secondary sort.
          </p>
          {summary.lowSampleRows > 0 ? (
            <p
              className="rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-amber-100"
              data-low-sample-summary
            >
              {summary.lowSampleRows} low-sample{' '}
              {summary.lowSampleRows === 1 ? 'row has' : 'rows have'} muted performance
              cells.
            </p>
          ) : null}
        </div>
      </div>

      {/* Score-source legend — separated from table header */}
      <div
        aria-label="Score source legend"
        className="border-b border-white/10 px-4 py-3 text-[0.72rem] text-stone-400"
      >
        <span className="mr-2 font-semibold uppercase tracking-[0.12em] text-stone-500">
          Score sources
        </span>
        <span className="inline-flex flex-wrap gap-1.5 align-middle">
          {scoreSourceLegend.map((item) => (
            <span
              className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-1 text-stone-300"
              key={item.label}
              title={item.label}
            >
              {item.shortLabel}
            </span>
          ))}
        </span>
      </div>

      {/* Active sort indicator */}
      <div className="border-b border-white/10 px-4 py-2 text-[0.66rem] text-stone-500">
        <span className="font-semibold text-stone-400">Sort:</span>{' '}
        {sortRules.map((rule, index) => {
          const column = columns.find((entry) => entry.key === rule.key);
          return (
            <span key={rule.key}>
              {index > 0 ? ' · ' : ''}
              {column?.label ?? rule.key} {rule.direction === 'asc' ? '↑' : '↓'}
            </span>
          );
        })}
      </div>

      {/* Scroll container with right-edge shadow affordance */}
      <div className="relative overflow-hidden rounded-b-2xl">
        <div
          aria-label={`${props.kind} table scroll area`}
          className="max-h-[44rem] overflow-auto overscroll-contain"
          data-scroll-container
          style={{ scrollbarGutter: 'stable' }}
        >
          <table
            aria-label={`${props.kind} statistics`}
            className="w-full min-w-[43rem] border-separate border-spacing-0 text-[0.8rem] md:min-w-[1600px]"
          >
            <caption className="sr-only">
              {props.kind} play frequency, outcomes, and average victory-point sources.
            </caption>
            <thead>
              <tr className="hidden md:table-row">
                {groupedColumns.map((entry, index) => (
                  <th
                    className={`sticky top-0 border-b border-r border-white/10 bg-[#17202a]/[0.99] px-4 py-2 text-left text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-stone-500 ${
                      index === 0 ? 'left-0 z-50' : 'z-30'
                    }`}
                    colSpan={entry.columns.length}
                    data-column-group={entry.group}
                    key={entry.group}
                    scope="colgroup"
                  >
                    {groupLabels[entry.group]}
                  </th>
                ))}
              </tr>
              <tr>
                {visibleColumns.map((column, index) => {
                  const sortIndex = sortRules.findIndex((rule) => rule.key === column.key);
                  const activeRule = sortIndex >= 0 ? sortRules[sortIndex] : null;
                  const SortIcon = activeRule
                    ? activeRule.direction === 'asc'
                      ? ArrowUp
                      : ArrowDown
                    : ChevronsUpDown;
                  const stickyName = index === 0;

                  return (
                    <th
                      aria-sort={
                        sortIndex === 0
                          ? activeRule?.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                      className={`sticky top-0 border-b border-r border-white/10 bg-[#151e28]/[0.99] px-4 py-3 md:top-[2rem] ${alignmentClasses(column.align)} ${
                        stickyName
                          ? 'left-0 z-50 min-w-[16rem]'
                          : 'z-30'
                      } ${column.mobile ? '' : 'hidden md:table-cell'}`}
                      data-sticky-column={stickyName ? 'name' : undefined}
                      key={column.key}
                      scope="col"
                    >
                      <button
                        className={`group/sort inline-flex w-full items-center gap-1.5 whitespace-nowrap text-[0.72rem] font-semibold tracking-[0.025em] transition hover:text-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
                          column.align === 'right'
                            ? 'justify-end'
                            : column.align === 'center'
                              ? 'justify-center'
                              : 'justify-start'
                        } ${activeRule ? 'text-amber-100' : 'text-stone-300'}`}
                        onClick={(event) =>
                          toggleSort(column.key, column.type, event.shiftKey)
                        }
                        title={`${column.description}. Click to sort; hold Shift to add it as a secondary sort.`}
                        type="button"
                      >
                        {column.label}
                        <span className="sr-only">{` sort by ${column.key === 'name' ? 'name' : column.label}`}</span>
                        {activeRule ? (
                          <span
                            aria-label={`Sort priority ${sortIndex + 1}`}
                            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-300/[0.14] px-1 text-[0.58rem] font-bold text-amber-100"
                          >
                            {sortIndex + 1}
                          </span>
                        ) : null}
                        <SortIcon
                          aria-hidden
                          className={`h-3 w-3 transition-opacity ${
                            activeRule
                              ? 'opacity-100'
                              : 'opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60'
                          }`}
                          data-sort-icon-state={activeRule ? 'active' : 'idle'}
                        />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    className="border-b border-white/[0.075] px-5 py-8 text-center text-sm text-stone-400"
                    colSpan={visibleColumns.length}
                  >
                    No {entityLabel} match the current filters.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => {
                  const expanded = expandedRows.has(row.name);
                  const selected = selectedName === row.name;
                  const lowSample = row.plays < LOW_SAMPLE_PLAYS;

                  return (
                    <Fragment key={row.name}>
                      <tr
                        aria-selected={selected}
                        className={`group cursor-default odd:bg-white/[0.014] even:bg-white/[0.032] transition-colors hover:bg-amber-300/[0.06] focus:bg-amber-300/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/50 ${
                          selected ? 'bg-amber-300/[0.075] shadow-[inset_3px_0_0_rgba(252,211,77,0.7)]' : ''
                        }`}
                        onClick={() => setSelectedName(row.name)}
                        onKeyDown={(event) => {
                          if (event.currentTarget !== event.target) {
                            return;
                          }

                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedName(row.name);
                          }
                        }}
                        tabIndex={0}
                      >
                        {visibleColumns.map((column, index) => {
                          const stickyName = index === 0;

                          return (
                            <td
                              className={`border-b border-r border-white/[0.075] px-4 py-3.5 align-middle ${alignmentClasses(column.align)} ${
                                stickyName
                                  ? 'sticky left-0 z-20 bg-[#111820] group-hover:bg-[#211e19] group-focus:bg-[#211e19]'
                                  : ''
                              } ${column.mobile ? '' : 'hidden md:table-cell'} ${
                                lowSample && column.group === 'results' ? 'opacity-55' : ''
                              }`}
                              data-sticky-column={stickyName ? 'name' : undefined}
                              key={column.key}
                            >
                              {column.render(row, {
                                averageVp: summary.weightedVp,
                                expanded,
                                hasMobileDetails: hiddenMobileColumns.length > 0,
                                lowSample,
                                toggleExpanded: () => toggleExpandedRow(row.name),
                              })}
                            </td>
                          );
                        })}
                      </tr>
                      {expanded && hiddenMobileColumns.length > 0 ? (
                        <tr className="md:hidden">
                          <td
                            className="border-b border-white/10 bg-[#0f151d] px-4 py-4"
                            colSpan={visibleColumns.length}
                          >
                            <div
                              aria-label={`Mobile details for ${row.name}`}
                              className="grid grid-cols-2 gap-3"
                            >
                              {hiddenMobileColumns.map((column) => (
                                <div
                                  className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"
                                  key={column.key}
                                >
                                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-stone-500">
                                    {column.label}
                                  </p>
                                  <div
                                    className={`mt-1.5 ${alignmentClasses(column.align)} ${
                                      lowSample && column.group === 'results'
                                        ? 'opacity-55'
                                        : ''
                                    }`}
                                  >
                                    {column.render(row, {
                                      averageVp: summary.weightedVp,
                                      expanded,
                                      hasMobileDetails: true,
                                      lowSample,
                                      toggleExpanded: () => toggleExpandedRow(row.name),
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Right-edge scroll affordance */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-40 w-10 bg-gradient-to-l from-[#0f151d] via-[#0f151d]/80 to-transparent"
          data-scroll-shadow="right"
        />
      </div>
    </div>
  );
}
