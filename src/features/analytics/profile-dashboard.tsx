import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';

export function ProfileDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Recent Form">
        <p className="text-sm text-stone-300">
          Show rolling win rate, recent placement trend, and final megacredit
          tiebreak frequency.
        </p>
      </ChartFrame>
      <ChartFrame title="Optional Data Coverage">
        <CoverageBadge label="Jovian data" value={0.75} />
      </ChartFrame>
    </div>
  );
}
