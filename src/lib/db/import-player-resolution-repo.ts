import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listCurrentUserGroups } from './group-context-repo';

type RawPlayerRow = {
  display_name: string;
  id: string;
  linked_user_id: string | null;
};

type RawGroupPlayerRow = RawPlayerRow & {
  group_id: string;
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

/**
 * Two people are the same roster person when they share a linked account, or —
 * for unlinked players — when their display names normalize identically. This
 * lets the same person appearing in several groups collapse to one option.
 */
function dedupeKeyForPlayer(player: RawGroupPlayerRow) {
  return player.linked_user_id
    ? `user:${player.linked_user_id}`
    : `name:${normalizePlayerAlias(player.display_name)}`;
}

/**
 * The candidate pool for import player-linking, gathered across every group the
 * signed-in user plays in rather than only the active group. A 4-player game
 * imported while a 3-player group is active must still be able to match — and
 * offer — the fourth person, as long as the user knows them from another group.
 * Each person collapses to a single option, with games summed across groups.
 */
export async function listImportResolutionPlayersForCurrentUser(): Promise<
  ImportResolutionPlayer[]
> {
  const memberships = await listCurrentUserGroups();
  const groupIds = [...new Set(memberships.map((group) => group.groupId))];

  if (groupIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const [
    { data: players, error: playersError },
    { data: leaderboardRows, error: leaderboardError },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('id, display_name, linked_user_id, group_id')
      .in('group_id', groupIds)
      .order('display_name'),
    supabase
      .schema('analytics')
      .from('group_leaderboard')
      .select('player_id, games_played')
      .in('group_id', groupIds),
  ]);

  if (playersError) {
    throw playersError;
  }

  if (leaderboardError) {
    throw leaderboardError;
  }

  const playerRows = (players ?? []) as RawGroupPlayerRow[];
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

  const dedupedByKey = new Map<string, ImportResolutionPlayer>();

  for (const player of playerRows) {
    const profile = player.linked_user_id
      ? profileByUserId.get(player.linked_user_id) ?? null
      : null;
    const gamesPlayed = gamesPlayedByPlayerId.get(player.id) ?? 0;
    const key = dedupeKeyForPlayer(player);
    const existing = dedupedByKey.get(key);

    if (!existing) {
      dedupedByKey.set(key, {
        displayName: player.display_name,
        gamesPlayed,
        id: player.id,
        linkedFullName: profile?.full_name ?? null,
        linkedUsername: profile?.username ?? null,
      });
      continue;
    }

    // Keep the representative id from the group where this person has played the
    // most, and sum their games across groups (each group's games are disjoint).
    dedupedByKey.set(key, {
      displayName: existing.displayName,
      gamesPlayed: existing.gamesPlayed + gamesPlayed,
      id: gamesPlayed > existing.gamesPlayed ? player.id : existing.id,
      linkedFullName: existing.linkedFullName ?? profile?.full_name ?? null,
      linkedUsername: existing.linkedUsername ?? profile?.username ?? null,
    });
  }

  return [...dedupedByKey.values()].sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}
