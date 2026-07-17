import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';
import { pageMetadata, routeMetadataFor } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/improvement');

export default function ImprovementPage() {
  const { title, description } = routeMetadataFor('/improvement');

  return <RouteSkeletonPage description={description} returnPath="/improvement" title={title} />;
}
