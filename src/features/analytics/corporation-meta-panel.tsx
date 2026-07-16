'use client';

import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/charts/chart-frame';
import type { GlobalCorporationMetricRow } from '@/lib/db/analytics-repo';

type CorporationDisplayRow = GlobalCorporationMetricRow & {
  name: string;
  weightedPoints: number;
};

const weightedPointsPriorGames = 5;
const collapsedRowCount = 8;

function formatDecimal(value: number | null, maximumFractionDigits = 1) {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function humanizeCode(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
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

function calculateGlobalAveragePoints(rows: GlobalCorporationMetricRow[]) {
  const totals = rows.reduce(
    (result, row) => {
      if (row.gamesPlayed <= 0) {
        return result;
      }

      result.points += row.averagePoints * row.gamesPlayed;
      result.plays += row.gamesPlayed;
      return result;
    },
    { plays: 0, points: 0 },
  );

  return totals.plays > 0 ? totals.points / totals.plays : 0;
}

function calculateWeightedPoints(
  averagePoints: number,
  gamesPlayed: number,
  globalAveragePoints: number,
) {
  if (gamesPlayed <= 0) {
    return globalAveragePoints;
  }

  return (
    (averagePoints * gamesPlayed +
      globalAveragePoints * weightedPointsPriorGames) /
    (gamesPlayed + weightedPointsPriorGames)
  );
}

export function CorporationMetaPanel({
  rows,
}: {
  rows: GlobalCorporationMetricRow[];
}) {
  const [showAll, setShowAll] = useState(false);
  const summaryRows = useMemo(() => selectSummaryRows(rows), [rows]);
  const totalPlays = summaryRows.reduce((total, row) => total + row.gamesPlayed, 0);
  const globalAveragePoints = useMemo(
    () => calculateGlobalAveragePoints(summaryRows),
    [summaryRows],
  );

  const rankedRows = useMemo<CorporationDisplayRow[]>(
    () =>
      summaryRows
        .map((row) => ({
          ...row,
          name: row.corporationName ?? humanizeCode(row.corporationId),
          weightedPoints: calculateWeightedPoints(
            row.averagePoints,
            row.gamesPlayed,
            globalAveragePoints,
          ),
        }))
        .sort(
          (left, right) =>
            right.weightedPoints - left.weightedPoints ||
            right.gamesPlayed - left.gamesPlayed ||
            right.averagePoints - left.averagePoints ||
            left.name.localeCompare(right.name),
        ),
    [globalAveragePoints, summaryRows],
  );

  const visibleRows = showAll ? rankedRows : rankedRows.slice(0, collapsedRowCount);
  const chartMaximum = Math.max(...rankedRows.map((row) => row.weightedPoints), 0);
  const canExpand = rankedRows.length > collapsedRowCount;

  return (
    <ChartFrame title="Global Corporation Meta">
      <div className="space-y-5 text-sm sm:text-base">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="max-w-3xl leading-6 text-stone-300">
              Compare corporation results without letting a one-game score spike
              automatically outrank corporations with a stronger sample.
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {summaryRows.length} corporation summaries · {totalPlays} recorded
              corporation plays
            </p>
          </div>
          <span className="w-fit rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-3 py-1.5 text-xs font-medium text-sky-100">
            Sample-size adjusted
          </span>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-100 sm:text-lg">
                Best corporations
              </h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-500">
                Ranked by weighted VP. Average VP is pulled toward the global average
                when a corporation has only been played a few times.
              </p>
            </div>
            <p className="text-xs text-stone-500">
              Weighted VP · {weightedPointsPriorGames}-play baseline
            </p>
          </div>

          {visibleRows.length === 0 ? (
            <p className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-sm text-stone-400">
              No corporation summaries are available yet.
            </p>
          ) : (
            <>
              <div className="mt-5 space-y-3">
                {visibleRows.map((row) => (
                  <article
                    className="rounded-xl border border-white/[0.06] bg-stone-950/45 p-3"
                    data-testid="weighted-corporation-row"
                    key={row.corporationId}
                    title={`${row.name}: ${formatDecimal(row.weightedPoints)} weighted VP, ${formatDecimal(row.averagePoints)} average VP across ${row.gamesPlayed} plays`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold text-stone-100">
                          {row.name}
                        </h4>
                        <p className="mt-1 text-xs text-stone-500">
                          {formatDecimal(row.averagePoints)} avg VP · {row.gamesPlayed}{' '}
                          {row.gamesPlayed === 1 ? 'play' : 'plays'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1 text-sm font-semibold tabular-nums text-cyan-100">
                        {formatDecimal(row.weightedPoints)} VP
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-800">
                      <div
                        aria-hidden="true"
                        className="h-full rounded-full bg-gradient-to-r from-sky-700/80 to-cyan-300/85 transition-[width] duration-300"
                        style={{
                          width: `${Math.max(
                            chartMaximum > 0
                              ? (row.weightedPoints / chartMaximum) * 100
                              : 0,
                            row.weightedPoints > 0 ? 4 : 0,
                          )}%`,
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>

              {canExpand ? (
                <div className="mt-5 flex justify-center border-t border-white/[0.08] pt-5">
                  <button
                    aria-expanded={showAll}
                    className="rounded-xl border border-sky-300/20 bg-sky-300/[0.07] px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-300/[0.11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70"
                    onClick={() => setShowAll((current) => !current)}
                    type="button"
                  >
                    {showAll ? 'Show fewer' : `See all ${rankedRows.length}`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </ChartFrame>
  );
}
