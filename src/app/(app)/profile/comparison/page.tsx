import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import {
  GroupPlayComparison,
  type GroupPlayComparisonGroup,
} from '@/features/analytics/group-play-comparison';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';
import { listCurrentUserGroups } from '@/lib/db/group-context-repo';

type ProfileComparisonPageProps = {
  searchParams?: Promise<{ groupId?: string | string[] }>;
};

export default async function ProfileComparisonPage({
  searchParams,
}: ProfileComparisonPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const context = await requireGroupContextOrRedirect();
  const requestedGroupId = Array.isArray(resolvedSearchParams.groupId)
    ? resolvedSearchParams.groupId[0]
    : resolvedSearchParams.groupId;

  const memberGroups = await listCurrentUserGroups();
  const compareGroups: GroupPlayComparisonGroup[] =
    memberGroups.length > 0
      ? memberGroups.map((group) => ({
          groupId: group.groupId,
          groupName: group.groupName,
        }))
      : [{ groupId: context.groupId, groupName: context.groupName }];
  // A groupId the user never played in must not be compared, so an unknown one
  // falls back to the group the rest of the app is showing.
  const selectedGroupId =
    compareGroups.find((group) => group.groupId === requestedGroupId)
      ?.groupId ??
    compareGroups.find((group) => group.groupId === context.groupId)?.groupId ??
    compareGroups[0]!.groupId;

  let playerName: string | null = null;
  let overallPerformance = null;
  let selectedGroupPerformance = null;
  let comparisonUnavailable = false;

  try {
    const [overallAnalytics, selectedGroupAnalytics] = await Promise.all([
      getProfileAnalytics(context.userId),
      getProfileAnalytics(context.userId, { groupId: selectedGroupId }),
    ]);

    playerName = overallAnalytics?.playerName ?? null;
    overallPerformance = overallAnalytics?.performance ?? null;
    selectedGroupPerformance = selectedGroupAnalytics?.performance ?? null;
  } catch (error) {
    comparisonUnavailable = true;
    console.error('Group play comparison load failed', error);
  }

  return (
    <AppShell
      headerActions={
        <Link className="tm-button-secondary px-4 py-2 text-xs" href="/profile">
          Back to Profile
        </Link>
      }
      showReviewSavedGamesLink
      title="My Play vs Overall"
      wide
    >
      <GroupPlayComparison
        groups={compareGroups}
        overallPerformance={overallPerformance}
        playerName={playerName}
        selectedGroupId={selectedGroupId}
        selectedGroupPerformance={selectedGroupPerformance}
        unavailable={comparisonUnavailable}
      />
    </AppShell>
  );
}
