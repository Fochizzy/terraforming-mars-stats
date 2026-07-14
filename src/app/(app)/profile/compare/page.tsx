import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { PlayerComparison } from '@/features/analytics/player-comparison';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import {
  buildEmptyGroupAnalytics,
  getCrossGroupFocusData,
  getOverallAnalytics,
  type CrossGroupFocusPerson,
  type OverallAnalytics,
} from '@/lib/db/analytics-repo';
import {
  buildEmptyExtendedAnalytics,
  type ExtendedGroupAnalytics,
} from '@/lib/db/extended-analytics-repo';

type PlayerComparePageProps = {
  searchParams?: Promise<{ playerId?: string | string[] }>;
};

const emptyOverallAnalytics: OverallAnalytics = {
  analytics: buildEmptyGroupAnalytics(),
  extended: buildEmptyExtendedAnalytics(),
};

export default async function PlayerComparePage({
  searchParams,
}: PlayerComparePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedOpponentId = Array.isArray(resolvedSearchParams.playerId)
    ? resolvedSearchParams.playerId[0]
    : resolvedSearchParams.playerId;
  const context = await requireGroupContextOrRedirect();
  const selfCanonicalId = `user:${context.userId}`;

  let focusPeople: CrossGroupFocusPerson[] = [];
  let overallAnalytics = emptyOverallAnalytics;
  let comparisonUnavailable = false;

  try {
    const [people, overall] = await Promise.all([
      getCrossGroupFocusData(context.userId, context.groupId),
      getOverallAnalytics(context.userId),
    ]);

    focusPeople = people;
    overallAnalytics = overall;
  } catch (error) {
    comparisonUnavailable = true;
    console.error('Player comparison load failed', error);
  }

  return (
    <AppShell
      headerActions={
        <Link className="tm-button-secondary px-4 py-2 text-xs" href="/profile">
          Back to Profile
        </Link>
      }
      showReviewSavedGamesLink
      title="Compare Players"
      wide
    >
      <PlayerComparison
        overallAnalytics={overallAnalytics.analytics}
        overallExtended={overallAnalytics.extended as ExtendedGroupAnalytics}
        people={focusPeople}
        selectedOpponentId={selectedOpponentId}
        selfCanonicalId={selfCanonicalId}
        unavailable={comparisonUnavailable}
      />
    </AppShell>
  );
}
