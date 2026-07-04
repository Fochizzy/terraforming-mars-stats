import { buildScoreSourceEntries, type ScoreSourceAverages } from '@/lib/db/analytics-repo';

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
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

  const entries = buildScoreSourceEntries(scoreAverages);
  const maxValue = Math.max(...entries.map((entry) => entry.value), 1);

  return (
    <div className="grid gap-3">
      {entries.map((entry) => (
        <div className="grid gap-1" key={entry.label}>
          <div className="flex items-center justify-between text-sm text-stone-200">
            <span>{entry.label}</span>
            <span>{formatAverage(entry.value)}</span>
          </div>
          <div className="tm-score-track">
            <div
              className="tm-score-fill"
              style={{ width: `${Math.max((entry.value / maxValue) * 100, 6)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
