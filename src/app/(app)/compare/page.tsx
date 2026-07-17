import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';
import { pageMetadata, routeMetadataFor } from '@/lib/navigation/route-metadata';

export const metadata = pageMetadata('/compare');

export default function ComparePage() {
  const { title, description } = routeMetadataFor('/compare');

  return <RouteSkeletonPage description={description} returnPath="/compare" title={title} />;
}
