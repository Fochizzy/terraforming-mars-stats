import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listCurrentUserGroups } from './group-context-repo';

type RpcCapableClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * A row from `list_import_player_identity_candidates`, the security-definer RPC
 * that is now the only import-facing read path for roster identity. It resolves
 * a linked account to its username and an unlinked guest to a neutral,
 * non-identifying label, so `players.full_name` / `players.username` are never
 * read through the Data API.
 */
type RawIdentityCandidateRow = {
  is_linked: boolean;
  player_id: string;
  public_name: string;
};

type RawLeaderboardRow = {
  games_played: number;
  player_id: string;
};

export type ImportResolutionPlayer = {
  canonicalKey?: string;
  displayName: string;
  gamesPlayed: number;
  id: string;
  linkedFullName: string | null;
  linkedUsername: string | null;
};

async function listIdentityCandidates(
  supabase: RpcCapableClient,
  groupId: string,
) {
  const { data, error } = await supabase.rpc(
    'list_import_player_identity_candidates',
    { p_group_id: groupId },
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as RawIdentityCandidateRow[];
}

function buildGamesPlayedMap(rows: RawLeaderboardRow[] | null | undefined) {
  return new Map(
    (rows ?? []).map((row) => [row.player_id, row.games_played] as const),
  );
}

function toResolutionPlayer(
  row: RawIdentityCandidateRow,
  gamesPlayed: number,
): ImportResolutionPlayer {
  return {
    displayName: row.public_name,
    gamesPlayed,
    id: row.player_id,
    // A person's full name is no longer reachable from the Data API, and the
    // candidate RPC deliberately exposes a linked account's username only.
    linkedFullName: null,
    linkedUsername: row.is_linked ? row.public_name : null,
  };
}

/**
 * Two rows are the same roster person when they resolve to the same linked
 * account. Unlinked guests carry a neutral per-player label, so they stay
 * distinct rather than collapsing together on an unresolvable name.
 */
function canonicalKeyForCandidate(row: RawIdentityCandidateRow) {
  return row.is_linked
    ? `username:${normalizePlayerAlias(row.public_name)}`
    : `player:${row.player_id}`;
}

export type ImportNameMatch = {
  importedName: string;
  matchReason: string;
  playerId: string;
  publicName: string;
};

type RawNameMatchRow = {
  imported_name: string;
  match_reason: string;
  player_id: string;
  public_name: string;
};

/**
 * Ask the server which roster player each imported log name refers to.
 *
 * Matching needs `players.full_name` / `username` and the saved import aliases,
 * none of which the Data API exposes any more, so it runs inside a
 * security-definer RPC. Only a player id and the public label come back.
 */
export async function matchImportPlayerNames(
  groupId: string,
  importedNames: string[],
): Promise<ImportNameMatch[]> {
  const names = [
    ...new Set(importedNames.map((name) => name.trim()).filter(Boolean)),
  ];

  if (names.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('match_import_player_names', {
    p_group_id: groupId,
    p_imported_names: names,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawNameMatchRow[]).map((row) => ({
    importedName: row.imported_name,
    matchReason: row.match_reason,
    playerId: row.player_id,
    publicName: row.public_name,
  }));
}

export async function listImportResolutionPlayers(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const [candidates, { data: leaderboardRows, error: leaderboardError }] =
    await Promise.all([
      listIdentityCandidates(supabase, groupId),
      supabase
        .schema('analytics')
        .from('group_leaderboard')
        .select('player_id, games_played')
        .eq('group_id', groupId),
    ]);

  if (leaderboardError) {
    throw leaderboardError;
  }

  const gamesPlayedByPlayerId = buildGamesPlayedMap(
    leaderboardRows as RawLeaderboardRow[] | null,
  );

  return candidates
    .map((row) =>
      toResolutionPlayer(row, gamesPlayedByPlayerId.get(row.player_id) ?? 0),
    )
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

/**
 * The candidate pool for import player-linking, gathered across every group the
 * signed-in user plays in rather than only the active group. A 4-player game
 * imported while a 3-player group is active must still be able to match — and
 * offer — the fourth person, as long as the user knows them from another group.
 *
 * Every concrete roster row is returned here. The resolver collapses rows with
 * the same canonicalKey into one review option, while confirm-time validation
 * can still recognize any previously selected player id. This prevents a
 * confirmed selection from becoming unavailable when the representative row
 * changes between Analyze and Confirm.
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
  const [candidateGroups, { data: leaderboardRows, error: leaderboardError }] =
    await Promise.all([
      Promise.all(
        groupIds.map((groupId) => listIdentityCandidates(supabase, groupId)),
      ),
      supabase
        .schema('analytics')
        .from('group_leaderboard')
        .select('player_id, games_played')
        .in('group_id', groupIds),
    ]);

  if (leaderboardError) {
    throw leaderboardError;
  }

  const gamesPlayedByPlayerId = buildGamesPlayedMap(
    leaderboardRows as RawLeaderboardRow[] | null,
  );

  return candidateGroups
    .flat()
    .map((row) => ({
      ...toResolutionPlayer(row, gamesPlayedByPlayerId.get(row.player_id) ?? 0),
      canonicalKey: canonicalKeyForCandidate(row),
    }))
    .sort(
      (left, right) =>
        left.displayName.localeCompare(right.displayName) ||
        right.gamesPlayed - left.gamesPlayed ||
        left.id.localeCompare(right.id),
    );
}
