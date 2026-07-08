import { ChartFrame } from '@/components/charts/chart-frame';
import type { PlayerEfficiencySummary } from '@/lib/db/analytics-repo';

const refreshEmptyState =
  'Metrics will appear after persisted Supabase summaries refresh.';

function formatDecimal(value: number | null, maximumFractionDigits = 1) {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatDelta(value: number | null) {
  if (value === null) {
    return '-';
  }

  const formatted = formatDecimal(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercentagePoints(value: number) {
  const percentagePoints = value * 100;
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(percentagePoints);

  return `${percentagePoints > 0 ? '+' : ''}${formatted} pts`;
}

export function EfficiencySummary({
  efficiencySummary,
}: {
  efficiencySummary: PlayerEfficiencySummary | null;
}) {
  return (
    <ChartFrame title="Efficiency Summary">
      {efficiencySummary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="tm-stat-card">
            <p className="tm-data-label">Points per Generation</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatDecimal(efficiencySummary.averagePointsPerGeneration)} pts/gen
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Normalized Efficiency</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatDecimal(efficiencySummary.averageNormalizedEfficiency, 2)}
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Expected Delta</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatDelta(efficiencySummary.averageScoreDeltaVsExpected)}
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Win Conversion</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatSignedPercentagePoints(
                efficiencySummary.winConversionOverExpected,
              )}
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Consistency Index</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatPercent(efficiencySummary.consistencyIndex)}
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Clutch Close Rate</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatPercent(efficiencySummary.clutchCloseRate)}
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Best Lane / Source</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {efficiencySummary.bestTagLane ?? efficiencySummary.bestScoreSource ?? '-'}
            </p>
            {efficiencySummary.bestTagLane && efficiencySummary.bestScoreSource ? (
              <p className="tm-muted-copy mt-1 text-sm">
                {efficiencySummary.bestScoreSource}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-400">{refreshEmptyState}</p>
      )}
    </ChartFrame>
  );
}
