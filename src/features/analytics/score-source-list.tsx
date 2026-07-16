import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';

function buildScoreSourceEntries(row: ScoreSourceAverages) {
  return [
    { label: 'Terraform Rating', value: row.averageTrPoints },
    { label: 'Card Points', value: row.averageCardPoints },
    { label: 'Other Card', value: row.averageOtherCardPoints },
    { label: 'Greenery', value: row.averageGreeneryPoints },
    { label: 'Cities', value: row.averageCitiesPoints },
    { label: 'Milestones', value: row.averageMilestonePoints },
    { label: 'Awards', value: row.averageAwardPoints },
    { label: 'Jovian', value: row.averageJovianPoints },
    { label: 'Microbe', value: row.averageMicrobePoints },
    { label: 'Animal', value: row.averageAnimalPoints },
  ];
}

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function ScoreSourceList({
  scoreAverages,
}: {
  scoreAverages: ScoreSourceAverages | null;
}) {
  if (!scoreAverages) {
    return (
      <p className="text-sm text-stone-400">
        No finalized score-source rows are available yet.
      </p>
    );
  }

  const entries = buildScoreSourceEntries(scoreAverages)
    .map((entry) => ({ ...entry, value: Math.max(entry.value, 0) }))
    .sort(
      (left, right) =>
        right.value - left.value || left.label.localeCompare(right.label),
    );
  const trackedPoints = entries.reduce((total, entry) => total + entry.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold text-stone-100">
            Where points come from
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-400">
            Average tracked victory points by source. Percentages use the tracked
            score-source total, so the breakdown stays comparable as data coverage
            grows.
          </p>
        </div>
        <div className="w-fit rounded-xl border border-sky-300/20 bg-sky-300/[0.07] px-3 py-2 text-right">
          <p className="text-xs font-medium text-sky-200/70">Tracked average VP</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-sky-100">
            {formatAverage(trackedPoints)}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {entries.map((entry) => {
          const share = trackedPoints > 0 ? entry.value / trackedPoints : 0;

          return (
            <div
              className="rounded-xl border border-white/[0.07] bg-black/15 p-3 transition hover:border-sky-300/20 hover:bg-sky-300/[0.025]"
              key={entry.label}
              title={`${entry.label}: ${formatAverage(entry.value)} average points, ${formatPercent(share)} of tracked VP`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium text-stone-200 sm:text-base">
                  {entry.label}
                </span>
                <span className="text-right text-sm tabular-nums text-stone-300">
                  <strong className="font-semibold text-stone-100">
                    {formatAverage(entry.value)}
                  </strong>{' '}
                  <span className="text-stone-500">· {formatPercent(share)}</span>
                </span>
              </div>
              <div
                aria-label={`${entry.label} accounts for ${formatPercent(share)} of tracked victory points`}
                className="mt-2.5 h-3 overflow-hidden rounded-full border border-white/[0.06] bg-stone-950/70"
                role="img"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-700/80 to-sky-300/80"
                  style={{
                    width: `${Math.max(share * 100, share > 0 ? 1.5 : 0)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
