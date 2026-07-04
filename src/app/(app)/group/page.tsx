import { AppShell } from '@/components/layout/app-shell';
import { GroupDashboard } from '@/features/analytics/group-dashboard';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';

export default async function GroupPage() {
  const context = await requireCurrentGroupContext();
  const groupAnalytics = await getGroupAnalytics(context.groupId);

  return (
    <AppShell title="Group">
      <GroupDashboard
        coverage={groupAnalytics.coverage}
        headToHeadRows={groupAnalytics.headToHeadRows}
        leaderboardRows={groupAnalytics.leaderboardRows}
        lineupEffectRows={groupAnalytics.lineupEffectRows}
        scoreAverages={groupAnalytics.scoreAverages}
        styleAgreementRows={groupAnalytics.styleAgreementRows}
      />
    </AppShell>
  );
}
