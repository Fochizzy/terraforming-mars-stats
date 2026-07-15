import { AppShell } from '@/components/layout/app-shell';
import { ProfileDashboard } from '@/features/analytics/profile-dashboard';
import { StyleEffectivenessPanel } from '@/features/analytics/style-effectiveness-panel';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { getGroupAnalytics, getProfileAnalytics } from '@/lib/db/analytics-repo';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';

export default async function ProfilePage() {
  const context = await requireCurrentGroupContext();
  const [profileAnalytics, groupAnalytics] = await Promise.all([
    getProfileAnalytics(context.groupId, context.userId),
    getGroupAnalytics(context.groupId),
  ]);

  const personalStyleRows = profileAnalytics?.playerId
    ? groupAnalytics.playerStylePerformanceRows.filter(
        (row) => row.playerId === profileAnalytics.playerId,
      )
    : [];

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/profile" />
      }
      title="My Profile"
    >
      <div className="flex flex-col gap-4">
        <StyleEffectivenessPanel
          globalRows={groupAnalytics.groupStylePerformanceRows}
          globalScoreAverages={groupAnalytics.scoreAverages}
          personalRows={personalStyleRows}
          personalScoreAverages={profileAnalytics?.scoreAverages ?? null}
        />
        <ProfileDashboard
          coverage={profileAnalytics?.coverage ?? null}
          efficiencySummary={profileAnalytics?.efficiencySummary ?? null}
          headToHeadRows={profileAnalytics?.headToHeadRows ?? []}
          mapMetricRows={profileAnalytics?.mapMetricRows ?? []}
          performance={profileAnalytics?.performance ?? null}
          playerName={profileAnalytics?.playerName ?? null}
          scoreAverages={profileAnalytics?.scoreAverages ?? null}
          styleAgreement={profileAnalytics?.styleAgreement ?? null}
        />
      </div>
    </AppShell>
  );
}
