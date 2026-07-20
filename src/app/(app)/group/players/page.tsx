import { AppShell } from '@/components/layout/app-shell';
import { usernameHandleSchema } from '@/features/auth/username-auth';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { PlayerList } from '@/features/groups/player-list';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { createPlayerIfMissing, linkPlayerToUser, listPlayers } from '@/lib/db/player-repo';
import { listClaimablePlayerProfiles } from '@/lib/db/player-claim-repo';
import { getUserProfile } from '@/lib/db/user-profile-repo';
import { revalidatePath } from 'next/cache';

export default async function PlayersPage() {
  const context = await requireGroupContextOrRedirect();
  const [players, userProfile, claimCandidates] = await Promise.all([
    listPlayers(context.groupId),
    getUserProfile(context.userId),
    // "This roster row is probably you" comes from the claim candidates the
    // security-definer RPC matched against the signed-in user's own identity —
    // never from comparing personal-name columns here. The highlight is an
    // affordance, so a failure to load it must not take down the roster.
    listClaimablePlayerProfiles().catch(() => []),
  ]);
  const claimablePlayerIds = new Set(
    claimCandidates
      .filter(
        (candidate) =>
          candidate.exactMatch && candidate.groupId === context.groupId,
      )
      .map((candidate) => candidate.playerId),
  );

  async function handleAddPlayer(username: string) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const parsedUsername = usernameHandleSchema.parse(username);
    await createPlayerIfMissing({
      displayName: parsedUsername,
      groupId: activeContext.groupId,
      linkedUserId: null,
      username: parsedUsername,
    });
    revalidatePath('/group/players');
    revalidatePath('/log-game');

    return {
      status: 'success' as const,
      message: 'Player added to the shared roster.',
    };
  }

  async function handleLinkPlayer(playerId: string) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    await linkPlayerToUser({
      groupId: activeContext.groupId,
      playerId,
      userId: activeContext.userId,
    });
    revalidatePath('/group/players');
    revalidatePath('/log-game');
    revalidatePath('/insights');
    revalidatePath('/profile');

    return {
      status: 'success' as const,
      message: 'That roster player is now linked to your profile.',
    };
  }

  return (
    <AppShell
      headerActions={
        <GroupSwitcher
          currentGroupId={context.groupId}
          returnPath="/group/players"
        />
      }
      title="Players"
    >
      <PlayerList
        currentUserId={context.userId}
        currentUserUsername={userProfile?.username ?? null}
        onAddPlayer={handleAddPlayer}
        onLinkPlayer={handleLinkPlayer}
        players={players.map((player) => ({
          ...player,
          matches_current_user: claimablePlayerIds.has(player.id),
        }))}
      />
    </AppShell>
  );
}
