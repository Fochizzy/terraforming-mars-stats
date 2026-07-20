import { AppShell } from '@/components/layout/app-shell';
import { GroupSwitcher } from '@/features/groups/group-switcher';
import { PlayerList } from '@/features/groups/player-list';
import { requireGroupContextOrRedirect } from '@/features/groups/require-group-context';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { createOrReuseGuestPlayerByPersonalName } from '@/lib/db/import-player-identity-repo';
import { listPlayers } from '@/lib/db/player-repo';
import { guestPersonalNameSchema } from '@/lib/player-identity/guest-personal-name';
import { pageMetadata } from '@/lib/navigation/route-metadata';
import { revalidatePath } from 'next/cache';

export const metadata = pageMetadata('/group/players');

export default async function PlayersPage() {
  const context = await requireGroupContextOrRedirect();
  const players = await listPlayers(context.groupId);

  async function handleAddPlayer(input: {
    firstName: string;
    lastName: string;
  }) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    // Explicit first-and-last-name identity mode. The guarded guest RPC
    // stores the personal name only in private.player_private_identities and
    // gives public.players.display_name a neutral "Guest XXXXXXXX" label —
    // a personal name is never copied into a readable display value. An
    // existing guest with the same normalized personal name is reused.
    const parsed = guestPersonalNameSchema.parse(input);
    const result = await createOrReuseGuestPlayerByPersonalName({
      firstName: parsed.firstName,
      groupId: activeContext.groupId,
      lastName: parsed.lastName,
    });
    revalidatePath('/group/players');
    revalidatePath('/log-game');

    return {
      status: 'success' as const,
      message:
        result.resolutionState === 'existing_unlinked_guest'
          ? `Matched the existing roster guest ${result.publicName}.`
          : `Added ${result.publicName} to the shared roster.`,
    };
  }

  return (
    <AppShell
      hasActiveGroup
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
