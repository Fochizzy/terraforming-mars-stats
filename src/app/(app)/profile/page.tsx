import Link from 'next/link';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AppShell } from '@/components/layout/app-shell';
import { ProfileDashboard } from '@/features/analytics/profile-dashboard';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';
import { getCurrentGroupContext } from '@/lib/db/group-context-repo';

const noGroupNavItems = [{ href: '/profile', label: 'My Profile' }] as const;

export default async function ProfilePage() {
  const context = await getCurrentGroupContext();

  if (!context) {
    return (
      <AppShell navItems={[...noGroupNavItems]} title="My Profile">
        <ChartFrame title="Claim Your Saved Player">
          <p className="text-sm text-stone-300">
            Claim a saved player profile to join the group that already has your
            history and unlock your personal analytics.
          </p>
          <Link className="tm-button-primary mt-4 inline-flex w-fit" href="/claim-player">
            Review Saved Player Matches
          </Link>
        </ChartFrame>
      </AppShell>
    );
  }

  let profileAnalytics = null;
  let profileAnalyticsUnavailable = false;

  try {
    profileAnalytics = await getProfileAnalytics(context.userId);
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
          linkHref="/group/players"
          performance={profileAnalytics?.performance ?? null}
          playerName={profileAnalytics?.playerName ?? null}
          scoreAverages={profileAnalytics?.scoreAverages ?? null}
          styleAgreement={profileAnalytics?.styleAgreement ?? null}
        />
      )}
    </AppShell>
  );
}
