import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';
import { pageMetadata, routeMetadataFor } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/leaderboard');

export default function LeaderboardPage() {
  const { title, description } = routeMetadataFor('/leaderboard');

  return <RouteSkeletonPage description={description} returnPath="/leaderboard" title={title} />;
}
