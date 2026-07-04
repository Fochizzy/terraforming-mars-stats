import { AppShell } from '@/components/layout/app-shell';
import { PlayerList } from '@/features/groups/player-list';
import { requireCurrentGroupContext } from '@/lib/db/group-context-repo';
import { listPlayers, upsertPlayer } from '@/lib/db/player-repo';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const playerNameSchema = z.string().trim().min(2).max(40);

export default async function PlayersPage() {
  const context = await requireCurrentGroupContext();
  const players = await listPlayers(context.groupId);

  async function handleAddPlayer(displayName: string) {
    'use server';

    const activeContext = await requireCurrentGroupContext();
    const parsedDisplayName = playerNameSchema.parse(displayName);
    await upsertPlayer({
      group_id: activeContext.groupId,
      display_name: parsedDisplayName,
    });
    revalidatePath('/group/players');
    revalidatePath('/log-game');

    return {
      status: 'success' as const,
      message: 'Player added to the shared roster.',
    };
  }

  return (
    <AppShell title="Players">
      <PlayerList onAddPlayer={handleAddPlayer} players={players} />
    </AppShell>
  );
}
