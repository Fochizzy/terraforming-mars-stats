import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { GroupDashboard } from '@/features/analytics/group-dashboard';
import {
  GroupPlayComparison,
  type GroupPlayComparisonGroup,
} from '@/features/analytics/group-play-comparison';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { getGroupAnalytics, getProfileAnalytics } from '@/lib/db/analytics-repo';
import { listCurrentUserGroups } from '@/lib/db/group-context-repo';

type GroupPageProps = {
  searchParams?: Promise<{ compareGroupId?: string | string[] }>;
};

export default async function GroupPage({ searchParams }: GroupPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const context = await requireGroupContextOrRedirect();
  const requestedCompareGroupId = Array.isArray(
    resolvedSearchParams.compareGroupId,
  )
    ? resolvedSearchParams.compareGroupId[0]
    : resolvedSearchParams.compareGroupId;

  const [groupAnalytics, memberGroups] = await Promise.all([
    getGroupAnalytics(context.groupId),
    listCurrentUserGroups(),
  ]);
  const compareGroups: GroupPlayComparisonGroup[] =
    memberGroups.length > 0
      ? memberGroups.map((group) => ({
          groupId: group.groupId,
          groupName: group.groupName,
        }))
      : [{ groupId: context.groupId, groupName: context.groupName }];
  const selectedGroupId = compareGroups.some(
    (group) => group.groupId === requestedCompareGroupId,
  )
    ? (requestedCompareGroupId as string)
    : context.groupId;

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <GroupSwitcher currentGroupId={context.groupId} returnPath="/group" />
          <Link className="tm-button-secondary px-4 py-2 text-xs" href="/group/settings">
            Group Settings
          </Link>
        </div>
      }
      title="Group"
      wide
    >
      <div className="flex flex-col gap-4">
        <GroupPlayComparison
          groups={compareGroups}
          overallPerformance={overallPerformance}
          playerName={playerName}
          selectedGroupId={selectedGroupId}
          selectedGroupPerformance={selectedGroupPerformance}
          unavailable={comparisonUnavailable}
        />
        <GroupDashboard
          coverage={groupAnalytics.coverage}
          headToHeadRows={groupAnalytics.headToHeadRows}
          leaderboardRows={groupAnalytics.leaderboardRows}
          lineupEffectRows={groupAnalytics.lineupEffectRows}
          scoreAverages={groupAnalytics.scoreAverages}
          styleAgreementRows={groupAnalytics.styleAgreementRows}
        />
      </div>
    </AppShell>
  );
}
