import { notFound } from 'next/navigation';
import { CombinedDashboardFixture } from '@/features/dev/combined-dashboard-fixture';

/**
 * Internal development fixture. Production builds resolve this route to the
 * application 404; it is not linked from production navigation.
 */
export default async function CombinedDashboardFixturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return (
    <CombinedDashboardFixture initialSearchParams={await searchParams} />
  );
}
