import Link from 'next/link';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AppShell } from '@/components/layout/app-shell';
import { ProfileDashboard } from '@/features/analytics/profile-dashboard';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const context = await getCurrentGroupContext();

  if (!context) {
    return redirect('/log-game/import');
  }

  let profileAnalytics = null;
  let profileAnalyticsUnavailable = false;

  try {
    profileAnalytics = await getProfileAnalytics(context.groupId, context.userId);
  } catch (error) {
    profileAnalyticsUnavailable = true;
    console.error('Profile analytics load failed', error);
  }

  return (
    <AppShell
      headerActions={
        <GroupSwitcher currentGroupId={context.groupId} returnPath="/profile" />
      }
      title="My Profile"
    >
      {profileAnalyticsUnavailable ? (
        <ChartFrame title="Profile Analytics Unavailable">
          <p className="text-sm text-stone-300">
            We couldn&apos;t load your finalized-game profile analytics right
            now. Your saved players and logged games are still intact.
          </p>
          <Link className="tm-button-primary mt-4 inline-flex w-fit" href="/group/players">
            Open Saved Players
          </Link>
        </ChartFrame>
      ) : (
        <ProfileDashboard
          coverage={profileAnalytics?.coverage ?? null}
          headToHeadRows={profileAnalytics?.headToHeadRows ?? []}
          performance={profileAnalytics?.performance ?? null}
          playerName={profileAnalytics?.playerName ?? null}
          scoreAverages={profileAnalytics?.scoreAverages ?? null}
          styleAgreement={profileAnalytics?.styleAgreement ?? null}
        />
      )}
    </AppShell>
  );
}
