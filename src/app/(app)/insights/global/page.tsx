import { RouteSkeletonPage } from '@/features/navigation/route-skeleton-page';

export default function GlobalInsightsPage() {
  return (
    <RouteSkeletonPage
      description="The global analytics destination has a stable route and navigation owner. Its real data panels remain with the existing Insights page until their dedicated implementation step."
      returnPath="/insights/global"
      title="Global Insights"
    />
  );
}
