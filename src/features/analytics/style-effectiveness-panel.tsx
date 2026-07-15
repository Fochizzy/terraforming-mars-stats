'use client';

import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import type {
  GroupStylePerformanceRow,
  ScoreSourceAverages,
} from '@/lib/db/analytics-repo';

type StyleScope = 'personal' | 'global';

type StyleEffectivenessPanelProps = {
  globalRows: GroupStylePerformanceRow[];
  globalScoreAverages: ScoreSourceAverages | null;
  personalRows: GroupStylePerformanceRow[];
  personalScoreAverages: ScoreSourceAverages | null;
};

const STYLE_DESCRIPTIONS: Record<string, string> = {
  balanced: 'A broad mix of scoring across several sources.',
  board_control: 'Focused on city and greenery placement.',
  jovian_payoff: 'Focused on Jovian tags and multiplier effects.',
};

function humanizeStyleCode(styleCode: string) {
  return styleCode
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatList(items: string[]) {
  if (items.length === 0) {
    return 'several scoring sources';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function getTopScoreSources(scoreAverages: ScoreSourceAverages | null) {
  if (!scoreAverages) {
    return [];
  }

  return [
    { label: 'terraform rating', value: scoreAverages.averageTrPoints },
    { label: 'card points', value: scoreAverages.averageCardPoints },
    { label: 'city tiles', value: scoreAverages.averageCitiesPoints },
    { label: 'greenery', value: scoreAverages.averageGreeneryPoints },
    { label: 'awards', value: scoreAverages.averageAwardPoints },
    { label: 'milestones', value: scoreAverages.averageMilestonePoints },
    { label: 'Jovian tags', value: scoreAverages.averageJovianPoints },
    { label: 'animal cards', value: scoreAverages.averageAnimalPoints },
    { label: 'microbe cards', value: scoreAverages.averageMicrobePoints },
  ]
    .sort((left, right) => right.value - left.value)
    .slice(0, 3)
    .map((entry) => entry.label);
}

function getWeightedWinRate(rows: GroupStylePerformanceRow[]) {
  const gamesPlayed = rows.reduce((total, row) => total + row.gamesPlayed, 0);

  if (gamesPlayed === 0) {
    return 0;
  }

  return rows.reduce(
    (total, row) => total + row.winRate * row.gamesPlayed,
    0,
  ) / gamesPlayed;
}

function getComparisonLabel(
  winRate: number,
  benchmarkWinRate: number,
  scope: StyleScope,
) {
  const difference = winRate - benchmarkWinRate;

  if (scope === 'personal') {
    if (difference >= 0.05) {
      return 'Above your usual results';
    }

    if (difference <= -0.05) {
      return 'Below your usual results';
    }

    return 'In line with your other styles';
  }

  if (difference >= 0.05) {
    return 'Above global baseline';
  }

  if (difference <= -0.05) {
    return 'Below global baseline';
  }

  return 'In line with global baseline';
}

function getComparisonTone(winRate: number, benchmarkWinRate: number) {
  const difference = winRate - benchmarkWinRate;

  if (difference >= 0.05) {
    return 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200';
  }

  if (difference <= -0.05) {
    return 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200';
  }

  return 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-3">
      <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-stone-500">
        {label}
      </dt>
      <dd className="mt-1 text-base font-semibold tabular-nums text-stone-100">
        {value}
      </dd>
    </div>
  );
}

function StrategyIcon({ index }: { index: number }) {
  const paths = [
    <path d="m5 13 4-4 3 3 7-7" key="path" />,
    <>
      <path d="M5 19V9" key="a" />
      <path d="M12 19V5" key="b" />
      <path d="M19 19v-7" key="c" />
    </>,
    <>
      <circle cx="12" cy="12" key="a" r="7" />
      <path d="M12 5v14M5 12h14" key="b" />
    </>,
  ];

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.07] text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <svg
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        {paths[index % paths.length]}
      </svg>
    </span>
  );
}

export function StyleEffectivenessPanel({
  globalRows,
  globalScoreAverages,
  personalRows,
  personalScoreAverages,
}: StyleEffectivenessPanelProps) {
  const [scope, setScope] = useState<StyleScope>(
    personalRows.length > 0 ? 'personal' : 'global',
  );

  const activeRows = scope === 'personal' ? personalRows : globalRows;
  const activeScoreAverages =
    scope === 'personal' ? personalScoreAverages : globalScoreAverages;

  const displayedRows = useMemo(
    () =>
      [...activeRows]
        .sort(
          (left, right) =>
            right.gamesPlayed - left.gamesPlayed ||
            right.winRate - left.winRate ||
            left.styleCode.localeCompare(right.styleCode),
        )
        .slice(0, 5),
    [activeRows],
  );

  const benchmarkWinRate = getWeightedWinRate(activeRows);
  const primaryStyle = displayedRows[0] ?? null;
  const sourceSummary = formatList(getTopScoreSources(activeScoreAverages));

  return (
    <ChartFrame title="Style Effectiveness">
      <div className="relative -mx-1 overflow-hidden rounded-2xl border border-amber-400/15 bg-stone-950/25 sm:-mx-2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_82%_0%,rgba(194,92,35,0.28),transparent_42%),linear-gradient(180deg,rgba(245,158,11,0.06),transparent)]"
        />

        <div className="relative p-4 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/[0.08] text-amber-300 shadow-[0_0_28px_rgba(245,158,11,0.08)]">
                  <svg
                    aria-hidden="true"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="7" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </span>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-amber-300/90">
                  Strategy profile
                </p>
              </div>
              <p className="text-sm leading-6 text-stone-300 sm:text-base">
                A clear read on the play styles these games fall into, what
                drives them, and how consistently each one performs.
              </p>
            </div>

            <div
              aria-label="Style effectiveness scope"
              className="inline-grid w-fit grid-cols-2 rounded-xl border border-white/[0.08] bg-black/30 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              role="tablist"
            >
              <button
                aria-selected={scope === 'personal'}
                className={[
                  'min-w-28 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-amber-300/70 disabled:cursor-not-allowed',
                  'disabled:opacity-40',
                  scope === 'personal'
                    ? 'bg-gradient-to-b from-amber-300/20 to-amber-500/10 text-amber-50 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.28),0_4px_18px_rgba(0,0,0,0.22)]'
                    : 'text-stone-400 hover:bg-white/[0.04] hover:text-stone-100',
                ].join(' ')}
                disabled={personalRows.length === 0}
                onClick={() => setScope('personal')}
                role="tab"
                type="button"
              >
                Your games
              </button>
              <button
                aria-selected={scope === 'global'}
                className={[
                  'min-w-28 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-amber-300/70 disabled:cursor-not-allowed',
                  'disabled:opacity-40',
                  scope === 'global'
                    ? 'bg-gradient-to-b from-amber-300/20 to-amber-500/10 text-amber-50 shadow-[inset_0_0_0_1px_rgba(252,211,77,0.28),0_4px_18px_rgba(0,0,0,0.22)]'
                    : 'text-stone-400 hover:bg-white/[0.04] hover:text-stone-100',
                ].join(' ')}
                disabled={globalRows.length === 0}
                onClick={() => setScope('global')}
                role="tab"
                type="button"
              >
                Global
              </button>
            </div>
          </div>

          {primaryStyle ? (
            <section className="mt-6 flex items-start gap-4 rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-300/[0.09] via-amber-300/[0.04] to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
              <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-xl border border-amber-300/25 bg-black/25 text-amber-300">
                <svg
                  aria-hidden="true"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 18 9 13l3 3 8-9" />
                  <path d="M15 7h5v5" />
                </svg>
              </span>
              <div>
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-amber-300">
                  Primary style
                </p>
                <p className="mt-1.5 text-sm leading-6 text-stone-200 sm:text-base">
                  {scope === 'personal'
                    ? 'Your points come mostly from '
                    : 'Points in this dataset come mostly from '}
                  <span className="font-semibold text-amber-100">
                    {sourceSummary}
                  </span>
                  , which most often plays as{' '}
                  <span className="font-semibold text-amber-100">
                    {humanizeStyleCode(primaryStyle.styleCode)}
                  </span>
                  .
                </p>
              </div>
            </section>
          ) : null}

          {displayedRows.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-white/[0.07] bg-black/20 p-5 text-sm text-stone-400">
              Style performance will appear after finalized games have enough
              scoring data to classify.
            </p>
          ) : (
            <div className="mt-4 grid gap-3" role="tabpanel">
              {displayedRows.map((row, index) => (
                <article
                  className="group rounded-2xl border border-white/[0.075] bg-gradient-to-r from-white/[0.035] to-transparent p-4 transition hover:border-amber-300/20 hover:bg-amber-300/[0.025] sm:p-5"
                  key={row.styleCode}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-4">
                      <StrategyIcon index={index} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-serif text-lg font-semibold text-amber-100 sm:text-xl">
                            {humanizeStyleCode(row.styleCode)}
                          </h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[0.66rem] font-semibold ${getComparisonTone(
                              row.winRate,
                              benchmarkWinRate,
                            )}`}
                          >
                            {getComparisonLabel(
                              row.winRate,
                              benchmarkWinRate,
                              scope,
                            )}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-6 text-stone-400">
                          {STYLE_DESCRIPTIONS[row.styleCode] ??
                            'A distinct scoring pattern inferred from finalized games.'}
                        </p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[31rem]">
                      <Metric
                        label="Games"
                        value={row.gamesPlayed.toLocaleString('en-US')}
                      />
                      <Metric
                        label="Avg points"
                        value={formatAverage(row.averageScore)}
                      />
                      <Metric
                        label="Avg finish"
                        value={formatAverage(row.averagePlacement)}
                      />
                      <Metric
                        label="Win rate"
                        value={formatPercent(row.winRate)}
                      />
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </ChartFrame>
  );
}
