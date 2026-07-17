import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';

export default function LeaderboardPage() {
  return (
    <RouteSkeletonPage
      description="The leaderboard destination has a stable route and navigation owner. Ranking methodology and live rankings remain deferred until their approved implementation step."
      returnPath="/leaderboard"
      title="Leaderboard"
    />
  );
}
