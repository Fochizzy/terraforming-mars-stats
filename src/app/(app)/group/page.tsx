import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { GroupDashboard } from '@/features/analytics/group-dashboard';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { getGroupAnalytics } from '@/lib/db/analytics-repo';

export default async function GroupPage() {
  const context = await requireGroupContextOrRedirect();
  const groupAnalytics = await getGroupAnalytics(context.groupId);

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
