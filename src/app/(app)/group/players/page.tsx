import { AppShell } from '@/components/layout/app-shell';
import { signupFullNameSchema } from '@/features/auth/username-auth';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { PlayerList } from '@/features/groups/player-list';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { createPlayerIfMissing, linkPlayerToUser, listPlayers } from '@/lib/db/player-repo';
import { getUserProfile } from '@/lib/db/user-profile-repo';
import { revalidatePath } from 'next/cache';

export default async function PlayersPage() {
  const context = await requireGroupContextOrRedirect();
  const [players, userProfile] = await Promise.all([
    listPlayers(context.groupId),
    getUserProfile(context.userId),
  ]);

  async function handleAddPlayer(displayName: string) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const parsedDisplayName = signupFullNameSchema.parse(displayName);
    await createPlayerIfMissing({
      displayName: parsedDisplayName,
      groupId: activeContext.groupId,
      linkedUserId: null,
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
    const linkedPlayer = await linkPlayerToUser({
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
      message: `${linkedPlayer.display_name} is now linked to your profile.`,
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
        currentUserFullName={userProfile?.full_name ?? null}
        currentUserId={context.userId}
        onAddPlayer={handleAddPlayer}
        onLinkPlayer={handleLinkPlayer}
        players={players}
      />
    </AppShell>
  );
}
