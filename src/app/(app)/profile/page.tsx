import Link from 'next/link';
import { ChartFrame } from '@/components/charts/chart-frame';
import { AppShell } from '@/components/layout/app-shell';
import { ProfileDashboard } from '@/features/analytics/profile-dashboard';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { getProfileAnalytics } from '@/lib/db/analytics-repo';
import {
  getCurrentGroupContext,
  listCurrentUserGroups,
  type CurrentUserGroup,
} from '@/lib/db/group-context-repo';

const noGroupNavItems = [
  { href: '/profile', label: 'My Profile' },
  { href: '/log-game', label: 'Log Game' },
] as const;

type ProfilePageProps = {
  searchParams?: Promise<{
    groupId?: string | string[];
  }>;
};

async function readSelectedGroupId(searchParams: ProfilePageProps['searchParams']) {
  const params = searchParams ? await searchParams : {};
  const groupId = params.groupId;

  return typeof groupId === 'string' ? groupId : null;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const context = await getCurrentGroupContext();

  if (!context) {
    return (
      <AppShell navItems={[...noGroupNavItems]} title="My Profile" wide>
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

  let overallProfileAnalytics = null;
  let profileAnalytics = null;
  let profileAnalyticsUnavailable = false;
  let groupOptions: CurrentUserGroup[] = [];
  let selectedGroupId = context.groupId;
  let selectedGroupName = context.groupName;

  try {
    groupOptions = await listCurrentUserGroups();
    const requestedGroupId = await readSelectedGroupId(searchParams);
    const selectedGroup =
      groupOptions.find((group) => group.groupId === requestedGroupId) ??
      groupOptions.find((group) => group.groupId === context.groupId) ??
      null;

    selectedGroupId = selectedGroup?.groupId ?? context.groupId;
    selectedGroupName = selectedGroup?.groupName ?? context.groupName;

    [profileAnalytics, overallProfileAnalytics] = await Promise.all([
      getProfileAnalytics(context.userId, { groupId: selectedGroupId }),
      getProfileAnalytics(context.userId),
    ]);
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
      wide
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
          groupOptions={groupOptions}
          headToHeadRows={profileAnalytics?.headToHeadRows ?? []}
          linkHref="/group/players"
          overallPerformance={overallProfileAnalytics?.performance ?? null}
          performance={profileAnalytics?.performance ?? null}
          playerName={
            profileAnalytics?.playerName ?? overallProfileAnalytics?.playerName ?? null
          }
          scoreAverages={profileAnalytics?.scoreAverages ?? null}
          selectedGroupId={selectedGroupId}
          selectedGroupName={selectedGroupName}
          styleAgreement={profileAnalytics?.styleAgreement ?? null}
        />
      )}
    </AppShell>
  );
}
