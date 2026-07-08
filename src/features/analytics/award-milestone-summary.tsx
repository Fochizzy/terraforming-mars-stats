import { ChartFrame } from '@/components/charts/chart-frame';
import type { PlayerEfficiencySummary } from '@/lib/db/analytics-repo';

const refreshEmptyState =
  'Metrics will appear after persisted Supabase summaries refresh.';

function formatDecimal(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function AwardMilestoneSummary({
  efficiencySummary,
}: {
  efficiencySummary: PlayerEfficiencySummary | null;
}) {
  return (
    <ChartFrame title="Awards/Milestones/Coverage">
      {efficiencySummary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="tm-stat-card">
            <p className="tm-data-label">Award ROI</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatDecimal(efficiencySummary.averageAwardRoi, 2)}x
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Clutch Close Rate</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatPercent(efficiencySummary.clutchCloseRate)}
            </p>
            <p className="tm-muted-copy mt-1 text-sm">
              {efficiencySummary.closeGameWins}/{efficiencySummary.closeGameCount} close games
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Tag Evidence Coverage</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatPercent(efficiencySummary.tagEvidenceCoverage)}
            </p>
          </div>
          <div className="tm-stat-card">
            <p className="tm-data-label">Milestone / Award Share</p>
            <p className="mt-2 text-lg font-semibold text-stone-100">
              {formatPercent(efficiencySummary.milestoneScoreShare)} /{' '}
              {formatPercent(efficiencySummary.awardScoreShare)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-400">{refreshEmptyState}</p>
      )}
    </ChartFrame>
  );
}
