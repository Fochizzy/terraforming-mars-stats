import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';

export default function GroupInsightsPage() {
  return (
    <RouteSkeletonPage
      description="The group analytics destination has a stable route and navigation owner. The working legacy group dashboard remains available while its sections are moved in later steps."
      returnPath="/insights/group"
      title="Group Insights"
    />
  );
}
