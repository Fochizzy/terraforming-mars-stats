import { personLabel } from '@/lib/people/person-label';

type RpcCapableClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Batch-resolve `players.id -> user_profiles.username` for linked accounts.
 * Backed by the `get_player_usernames` security-definer RPC, which returns the
 * username only (never full name/email) and is callable by authenticated users
 * only. Players with no linked account, or whose account has no username, are
 * simply absent from the map.
 */
export async function fetchUsernamesByPlayerId(
  supabase: RpcCapableClient,
  playerIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(playerIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc('get_player_usernames', {
    p_player_ids: uniqueIds,
  });

  if (error) {
    throw error;
  }

  const usernameById = new Map<string, string>();
  for (const row of (data ?? []) as Array<{
    player_id: string;
    username: string | null;
  }>) {
    if (row.username) {
      usernameById.set(row.player_id, row.username);
    }
  }
  return usernameById;
}

/**
 * The (id column -> name column) pairs carried by analytics rows. Each name
 * column is rewritten in place to the canonical person label (username, or
 * first name when unregistered) resolved from its sibling id column.
 */
const DEFAULT_LABEL_PAIRS: ReadonlyArray<readonly [idKey: string, nameKey: string]> = [
  ['player_id', 'player_name'],
  ['left_player_id', 'left_player_name'],
  ['right_player_id', 'right_player_name'],
  ['funder_player_id', 'funder_player_name'],
  ['winner_player_id', 'winner_player_name'],
];

/**
 * Rewrite the person-name columns of raw analytics rows to the canonical
 * display label in place, so downstream row mappers and renderers never expose
 * a raw `display_name`. Rows are matched by their sibling player-id column, so
 * two unregistered people who share a first name stay distinct rows (they are
 * only ever collapsed for display, never for aggregation).
 */
export async function resolvePlayerLabelsInRows<T>(
  supabase: RpcCapableClient,
  rows: T[] | null | undefined,
  pairs: ReadonlyArray<readonly [string, string]> = DEFAULT_LABEL_PAIRS,
): Promise<T[]> {
  const list = (rows ?? []) as T[];
  if (list.length === 0) {
    return list;
  }

  const ids: string[] = [];
  for (const row of list) {
    const record = row as Record<string, unknown>;
    for (const [idKey] of pairs) {
      const id = record[idKey];
      if (typeof id === 'string') {
        ids.push(id);
      }
    }
  }

  const usernameById = await fetchUsernamesByPlayerId(supabase, ids);

  for (const row of list) {
    const record = row as Record<string, unknown>;
    for (const [idKey, nameKey] of pairs) {
      const id = record[idKey];
      if (typeof id === 'string' && typeof record[nameKey] === 'string') {
        record[nameKey] = personLabel({
          username: usernameById.get(id),
          displayName: record[nameKey] as string,
        });
      }
    }
  }

  return list;
}
