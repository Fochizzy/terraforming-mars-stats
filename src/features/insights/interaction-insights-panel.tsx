'use client';

import { useMemo, useState } from 'react';
import { Building2, ChartNoAxesColumnIncreasing, Sparkles, Trophy } from 'lucide-react';
import type { GroupInteractionRow } from '@/lib/db/analytics-repo';
import type { SelectionDialogData } from '@/lib/db/selection-stats-repo';
import {
  parseSelectionPairLabel,
  SelectionNameButton,
} from './selection-name-link';

type InteractionInsightRow = GroupInteractionRow & {
  playerId?: string;
  playerName?: string;
};

type SortMode = 'plays' | 'winRate' | 'averageScore';

type RankedInteractionRow = InteractionInsightRow & {
  corporationName: string;
  preludeNames: string[];
  rank: number;
};

type CorporationGroup = {
  corporationName: string;
  firstRank: number;
  rows: RankedInteractionRow[];
};

const sortOptions: Array<{ label: string; value: SortMode }> = [
  { label: 'Most played', value: 'plays' },
  { label: 'Highest win rate', value: 'winRate' },
  { label: 'Highest average VP', value: 'averageScore' },
];

const selectionLinkClass =
  'text-left font-semibold text-stone-100 no-underline transition hover:text-amber-200 hover:underline decoration-solid underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60';

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatGames(value: number) {
  return `${value} ${value === 1 ? 'game' : 'games'}`;
}

function getSampleConfidence(gamesPlayed: number) {
  if (gamesPlayed <= 1) {
    return {
      label: 'Low sample',
      className: 'border-amber-400/25 bg-amber-400/10 text-amber-100',
    };
  }

  if (gamesPlayed <= 3) {
    return {
      label: 'Early sample',
      className: 'border-sky-400/25 bg-sky-400/10 text-sky-100',
    };
  }

  if (gamesPlayed <= 7) {
    return {
      label: 'Moderate sample',
      className: 'border-teal-400/25 bg-teal-400/10 text-teal-100',
    };
  }

  return {
    label: 'Strong sample',
    className: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  };
}

function compareRows(left: InteractionInsightRow, right: InteractionInsightRow, sortMode: SortMode) {
  const leftSingleGame = left.gamesPlayed === 1 ? 1 : 0;
  const rightSingleGame = right.gamesPlayed === 1 ? 1 : 0;
  const samplePriority = leftSingleGame - rightSingleGame;

  if (samplePriority !== 0) {
    return samplePriority;
  }

  if (sortMode === 'winRate') {
    return (
      right.winRate - left.winRate ||
      right.gamesPlayed - left.gamesPlayed ||
      right.averageScore - left.averageScore ||
      left.label.localeCompare(right.label)
    );
  }

  if (sortMode === 'averageScore') {
    return (
      right.averageScore - left.averageScore ||
      right.gamesPlayed - left.gamesPlayed ||
      right.winRate - left.winRate ||
      left.label.localeCompare(right.label)
    );
  }

  return (
    right.gamesPlayed - left.gamesPlayed ||
    right.winRate - left.winRate ||
    right.averageScore - left.averageScore ||
    left.label.localeCompare(right.label)
  );
}

function parseInteractionRow(row: InteractionInsightRow, rank: number): RankedInteractionRow {
  const parsed = parseSelectionPairLabel(row.label);

  if (parsed) {
    return {
      ...row,
      corporationName: parsed.corporationName,
      preludeNames: parsed.preludeNames,
      rank,
    };
  }

  return {
    ...row,
    corporationName: row.label,
    preludeNames: [],
    rank,
  };
}

function groupRows(rows: RankedInteractionRow[]): CorporationGroup[] {
  const groups = new Map<string, CorporationGroup>();

  for (const row of rows) {
    const existing = groups.get(row.corporationName);

    if (existing) {
      existing.rows.push(row);
      existing.firstRank = Math.min(existing.firstRank, row.rank);
      continue;
    }

    groups.set(row.corporationName, {
      corporationName: row.corporationName,
      firstRank: row.rank,
      rows: [row],
    });
  }

  return [...groups.values()].sort(
    (left, right) =>
      left.firstRank - right.firstRank ||
      left.corporationName.localeCompare(right.corporationName),
  );
}

function PreludeChips({
  dialogData,
  preludeNames,
}: {
  dialogData?: SelectionDialogData;
  preludeNames: string[];
}) {
  if (preludeNames.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-xs text-stone-400">
        <Sparkles aria-hidden className="h-3.5 w-3.5" />
        No Prelude
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {preludeNames.map((preludeName) => (
        <span
          className="inline-flex items-center gap-1.5 rounded-md border border-violet-400/20 bg-violet-400/[0.075] px-2 py-1 text-xs"
          key={preludeName}
        >
          <Sparkles aria-hidden className="h-3.5 w-3.5 text-violet-300" />
          <SelectionNameButton
            className={selectionLinkClass}
            dialogData={dialogData}
            kind="Prelude"
            name={preludeName}
          />
        </span>
      ))}
    </div>
  );
}

export function InteractionInsightsPanel({
  dialogData,
  rows,
}: {
  dialogData?: SelectionDialogData;
  rows: InteractionInsightRow[];
}) {
  const [sortMode, setSortMode] = useState<SortMode>('plays');

  const rankedRows = useMemo(
    () =>
      [...rows]
        .sort((left, right) => compareRows(left, right, sortMode))
        .slice(0, 12)
        .map((row, index) => parseInteractionRow(row, index + 1)),
    [rows, sortMode],
  );

  const corporationGroups = useMemo(() => groupRows(rankedRows), [rankedRows]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="tm-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-300">
            Combination performance
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-stone-100">
            Interaction insights
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-400">
            Corporation and Prelude combinations ranked by performance.
          </p>
        </div>

        <div
          aria-label="Sort interaction insights"
          className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1"
          role="group"
        >
          {sortOptions.map((option) => {
            const active = option.value === sortMode;

            return (
              <button
                aria-pressed={active}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60 ${
                  active
                    ? 'bg-amber-300/15 text-amber-100 shadow-sm'
                    : 'text-stone-400 hover:bg-white/[0.05] hover:text-stone-100'
                }`}
                key={option.value}
                onClick={() => setSortMode(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-400">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1">
          <ChartNoAxesColumnIncreasing aria-hidden className="h-3.5 w-3.5 text-sky-300" />
          Larger samples rank ahead of one-game results
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1">
          <Trophy aria-hidden className="h-3.5 w-3.5 text-emerald-300" />
          Win rate is directional, not conclusive
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {corporationGroups.map((group) => (
          <article
            className="overflow-hidden rounded-xl border border-white/10 bg-black/20 transition duration-200 hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-white/[0.025] hover:shadow-lg"
            key={group.corporationName}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-orange-400/20 bg-orange-400/[0.08]">
                  <Building2 aria-hidden className="h-4 w-4 text-orange-300" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
                    Corporation
                  </p>
                  <SelectionNameButton
                    className={`${selectionLinkClass} block truncate`}
                    dialogData={dialogData}
                    kind="Corporation"
                    name={group.corporationName}
                  />
                </div>
              </div>
              {group.rows.length > 1 ? (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[0.68rem] text-stone-400">
                  {group.rows.length} pairings
                </span>
              ) : null}
            </div>

            <div className="divide-y divide-white/[0.07]">
              {group.rows.map((row) => {
                const confidence = getSampleConfidence(row.gamesPlayed);

                return (
                  <div
                    className="grid gap-2 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
                    data-interaction-rank={row.rank}
                    key={`${row.playerId ?? 'group'}-${row.interactionType}-${row.label}`}
                  >
                    <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-xs font-semibold tabular-nums text-stone-300">
                      #{row.rank}
                    </span>

                    <div className="min-w-0">
                      <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-stone-500">
                        Prelude
                      </p>
                      <PreludeChips
                        dialogData={dialogData}
                        preludeNames={row.preludeNames}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.7rem] tabular-nums text-stone-300">
                        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">
                          {formatGames(row.gamesPlayed)}
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">
                          {formatAverage(row.averageScore)} avg VP
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1">
                          {formatAverage(row.averagePlacement)} avg finish
                        </span>
                        <span
                          className={`rounded-md border px-2 py-1 ${confidence.className}`}
                        >
                          {confidence.label}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-100 sm:justify-self-end">
                      {formatPercent(row.winRate)} win rate
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
