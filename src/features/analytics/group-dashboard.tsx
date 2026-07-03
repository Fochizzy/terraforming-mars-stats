import { ChartFrame } from '@/components/charts/chart-frame';

export function GroupDashboard() {
  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Weighted Leaderboard">
        <p className="text-sm text-stone-300">
          Show weighted score, win rate, placement, head-to-head records, and
          lineup-shift comparisons.
        </p>
      </ChartFrame>
    </div>
  );
}
