import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RawPlayerRow = {
  display_name: string;
  id: string;
  linked_user_id: string | null;
};

type RawLeaderboardRow = {
  games_played: number;
  player_id: string;
};

type RawUserProfileRow = {
  full_name: string;
  user_id: string;
  username: string;
};

export type ImportResolutionPlayer = {
  displayName: string;
  gamesPlayed: number;
  id: string;
  linkedFullName: string | null;
  linkedUsername: string | null;
};

function isMissingServiceRoleKey(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes('SUPABASE_SERVICE_ROLE_KEY')
  );
}

async function listLinkedUserProfiles(linkedUserIds: string[]) {
  if (linkedUserIds.length === 0) {
    return [] as RawUserProfileRow[];
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('user_profiles')
      .select('user_id, full_name, username')
      .in('user_id', linkedUserIds);

    if (error) {
      throw error;
    }

    return (data ?? []) as RawUserProfileRow[];
  } catch (error) {
    if (isMissingServiceRoleKey(error)) {
      return [];
    }

    throw error;
  }
}

export async function listImportResolutionPlayers(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: players, error: playersError }, { data: leaderboardRows, error: leaderboardError }] =
    await Promise.all([
      supabase
        .from('players')
        .select('id, display_name, linked_user_id')
        .eq('group_id', groupId)
        .order('display_name'),
      supabase
        .schema('analytics')
        .from('group_leaderboard')
        .select('player_id, games_played')
        .eq('group_id', groupId),
    ]);

  if (playersError) {
    throw playersError;
  }

  if (leaderboardError) {
    throw leaderboardError;
  }

  const playerRows = (players ?? []) as RawPlayerRow[];
  const gamesPlayedByPlayerId = new Map(
    ((leaderboardRows ?? []) as RawLeaderboardRow[]).map((row) => [
      row.player_id,
      row.games_played,
    ]),
  );
  const linkedUserIds = [
    ...new Set(
      playerRows
        .map((player) => player.linked_user_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const linkedProfiles = await listLinkedUserProfiles(linkedUserIds);
  const profileByUserId = new Map(
    linkedProfiles.map((profile) => [profile.user_id, profile]),
  );

  return playerRows.map((player) => {
    const profile = player.linked_user_id
      ? profileByUserId.get(player.linked_user_id) ?? null
      : null;

    return {
      displayName: player.display_name,
      gamesPlayed: gamesPlayedByPlayerId.get(player.id) ?? 0,
      id: player.id,
      linkedFullName: profile?.full_name ?? null,
      linkedUsername: profile?.username ?? null,
    } satisfies ImportResolutionPlayer;
  });
}
