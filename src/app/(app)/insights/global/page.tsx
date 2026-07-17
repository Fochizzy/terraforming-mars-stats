import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';
import { pageMetadata, routeMetadataFor } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/insights/global');

export default function GlobalInsightsPage() {
  const { title, description } = routeMetadataFor('/insights/global');

  return (
    <RouteSkeletonPage description={description} returnPath="/insights/global" title={title} />
  );
}
