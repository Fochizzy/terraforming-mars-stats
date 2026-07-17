import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';
import { pageMetadata, routeMetadataFor } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/insights/group');

export default function GroupInsightsPage() {
  const { title, description } = routeMetadataFor('/insights/group');

  return (
    <RouteSkeletonPage description={description} returnPath="/insights/group" title={title} />
  );
}
