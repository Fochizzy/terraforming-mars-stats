import { ChartFrame } from '@/components/charts/chart-frame';
import { AppShell } from '@/components/layout/app-shell';
import { InsightsLoadingPopup } from '@/components/navigation/insights-loading-popup';

function LoadingBar({ widthClass }: { widthClass: string }) {
  return (
    <div
      aria-hidden
      className={`h-3 rounded-full bg-stone-700/70 ${widthClass}`}
    />
  );
}

function LoadingPanel({ title }: { title: string }) {
  return (
    <ChartFrame title={title}>
      <div className="space-y-4" aria-hidden>
        <LoadingBar widthClass="w-3/4" />
        <LoadingBar widthClass="w-1/2" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-md border border-orange-900/30 bg-stone-900/50" />
          <div className="h-24 rounded-md border border-orange-900/30 bg-stone-900/50" />
          <div className="h-24 rounded-md border border-orange-900/30 bg-stone-900/50" />
        </div>
      </div>
    </ChartFrame>
  );
}

export default function InsightsLoading() {
  return (
    <AppShell
      showReviewSavedGamesLink
      title="Insights"
      wide
    >
      <div className="space-y-4 opacity-45" aria-hidden>
        <ChartFrame
          title="Loading Insights"
          description="Pulling the latest group, player, and card analytics."
        >
          <div className="flex items-center gap-3 text-sm text-stone-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-orange-300" />
            <span>Preparing the Insights Lab...</span>
          </div>
        </ChartFrame>
        <div className="grid gap-4 lg:grid-cols-2">
          <LoadingPanel title="Leaderboard Snapshot" />
          <LoadingPanel title="Interaction Signals" />
        </div>
      </div>
      <InsightsLoadingPopup />
    </AppShell>
  );
}
