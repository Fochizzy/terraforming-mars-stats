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

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-baseline gap-1.5 rounded-full border border-stone-700/70 bg-stone-950/35 px-3 py-1.5">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-stone-500">
        {label}
      </dt>
      <dd className="text-sm font-semibold tabular-nums text-stone-100">
        {value}
      </dd>
    </div>
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
      <div className="space-y-6">
        <p className="max-w-2xl text-sm leading-6 text-stone-300 sm:text-base">
          A plain-language read on the play styles these games fall into—what
          drives them, and how well each one works.
        </p>

        <div
          aria-label="Style effectiveness scope"
          className="inline-flex rounded-xl border border-stone-700/80 bg-stone-950/40 p-1"
          role="tablist"
        >
          <button
            aria-selected={scope === 'personal'}
            className={[
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-amber-300/70 disabled:cursor-not-allowed',
              'disabled:opacity-40',
              scope === 'personal'
                ? 'bg-stone-700 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-100',
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
              'rounded-lg px-4 py-2 text-sm font-medium transition',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-amber-300/70 disabled:cursor-not-allowed',
              'disabled:opacity-40',
              scope === 'global'
                ? 'bg-stone-700 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-100',
            ].join(' ')}
            disabled={globalRows.length === 0}
            onClick={() => setScope('global')}
            role="tab"
            type="button"
          >
            Global
          </button>
        </div>

        {primaryStyle ? (
          <section className="max-w-3xl rounded-2xl border border-amber-400/15 bg-amber-400/[0.045] p-4 sm:p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-300">
              Primary style
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-200 sm:text-base">
              {scope === 'personal'
                ? 'Your points come mostly from '
                : 'Points in this dataset come mostly from '}
              <span className="font-semibold text-amber-100">
                {sourceSummary}
              </span>
              —which most often plays as{' '}
              <span className="font-semibold text-amber-100">
                {humanizeStyleCode(primaryStyle.styleCode)}
              </span>
              .
            </p>
          </section>
        ) : null}

        {displayedRows.length === 0 ? (
          <p className="rounded-2xl border border-stone-800 bg-stone-950/30 p-4 text-sm text-stone-400">
            Style performance will appear after finalized games have enough
            scoring data to classify.
          </p>
        ) : (
          <div role="tabpanel">
            {displayedRows.map((row) => (
              <article
                className="border-t border-stone-800/80 py-5 first:border-t-0 first:pt-0 last:pb-0"
                key={row.styleCode}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-2xl">
                    <h3 className="font-serif text-lg font-semibold text-amber-200">
                      {humanizeStyleCode(row.styleCode)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-stone-400">
                      {STYLE_DESCRIPTIONS[row.styleCode] ??
                        'A distinct scoring pattern inferred from finalized games.'}
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-stone-700 bg-stone-900/70 px-3 py-1 text-xs font-medium text-stone-300">
                    {getComparisonLabel(
                      row.winRate,
                      benchmarkWinRate,
                      scope,
                    )}
                  </span>
                </div>

                <dl className="mt-4 flex flex-wrap gap-2">
                  <MetricPill
                    label="Games"
                    value={row.gamesPlayed.toLocaleString('en-US')}
                  />
                  <MetricPill
                    label="Avg points"
                    value={formatAverage(row.averageScore)}
                  />
                  <MetricPill
                    label="Avg finish"
                    value={formatAverage(row.averagePlacement)}
                  />
                  <MetricPill
                    label="Win rate"
                    value={formatPercent(row.winRate)}
                  />
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
