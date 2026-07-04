import { AppShell } from '@/components/layout/app-shell';
import { ProfileDashboard } from '@/features/analytics/profile-dashboard';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';

export default async function ProfilePage() {
  const context = await requireCurrentGroupContext();
  const profileAnalytics = await getProfileAnalytics(context.groupId, context.userId);

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/profile" />
      }
      title="My Profile"
    >
      <ProfileDashboard
        coverage={profileAnalytics?.coverage ?? null}
        headToHeadRows={profileAnalytics?.headToHeadRows ?? []}
        performance={profileAnalytics?.performance ?? null}
        playerName={profileAnalytics?.playerName ?? null}
        scoreAverages={profileAnalytics?.scoreAverages ?? null}
        styleAgreement={profileAnalytics?.styleAgreement ?? null}
      />
    </AppShell>
  );
}
