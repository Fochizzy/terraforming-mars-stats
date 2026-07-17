import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';
import { pageMetadata, routeMetadataFor } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/insights/individual');

export default function IndividualInsightsPage() {
  const { title, description } = routeMetadataFor('/insights/individual');

  return (
    <RouteSkeletonPage
      description={description}
      returnPath="/insights/individual"
      title={title}
    />
  );
}
