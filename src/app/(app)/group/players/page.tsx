import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { PlayerList } from '@/features/groups/player-list';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { createPlayerIfMissing, listPlayers } from '@/lib/db/player-repo';
import { signupFullNameSchema } from '@/features/auth/username-auth';
import { revalidatePath } from 'next/cache';

export default async function PlayersPage() {
  const context = await requireGroupContextOrRedirect();
  const players = await listPlayers(context.groupId);

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
      <PlayerList onAddPlayer={handleAddPlayer} players={players} />
    </AppShell>
  );
}
