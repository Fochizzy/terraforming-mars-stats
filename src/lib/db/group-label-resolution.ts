import { fetchPublicPlayerLabels } from './player-label-resolution';

// Deliberately loose (`any` on `.from()`'s return) rather than a precise
// nested builder type: checking the real Supabase client's deeply generic
// `.from()` overloads against a precise structural interface here triggers
// "Type instantiation is excessively deep and possibly infinite" (TS2589).
// Mirrors the same tradeoff `RpcCapableClient` in player-label-resolution.ts
// already makes for `.rpc()`.
type SupabaseLike = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

type RosterPlayerIdRow = {
  group_id: string;
  id: string;
};

const EMPTY_GROUP_LABEL = 'Empty group';

/**
 * Deterministic, privacy-safe group label: each member's public label
 * (username when linked, stable neutral guest label otherwise), sorted and
 * joined the same way roster-derived import group names always have been.
 * Never accepts a private personal name as input.
 */
export function buildPublicGroupLabel(publicLabels: string[]): string {
  if (publicLabels.length === 0) {
    return EMPTY_GROUP_LABEL;
  }

  return [...publicLabels]
    .sort((left, right) => left.localeCompare(right))
    .join(' / ');
}

/**
 * Batch-resolve `group.id -> privacy-safe display label`, built only from
 * each member's public label. This is the only sanctioned way to present a
 * group's name outside an explicitly authorized rename write: it never reads
 * `groups.name` or a private player column, so it stays safe no matter what
 * the stored name contains or when it was set — including groups named
 * before this resolver existed, whose `groups.name` may still hold a raw
 * personal-name concatenation.
 *
 * Requires the caller's roster reads to already be authorized (RLS for an
 * ordinary member, or a service-role client for cross-group flows that have
 * just established membership); this function does not itself change what a
 * caller is allowed to see.
 */
export async function resolvePublicGroupLabels(
  supabase: SupabaseLike,
  groupIds: string[],
): Promise<Map<string, string>> {
  const uniqueGroupIds = [...new Set(groupIds.filter(Boolean))];

  if (uniqueGroupIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('players')
    .select('id, group_id')
    .in('group_id', uniqueGroupIds);

  if (error) {
    throw error;
  }

  const rosterRows = (data ?? []) as RosterPlayerIdRow[];
  const playerLabelById = await fetchPublicPlayerLabels(
    supabase,
    rosterRows.map((row) => row.id),
  );

  const playerIdsByGroupId = new Map<string, string[]>();
  for (const row of rosterRows) {
    const ids = playerIdsByGroupId.get(row.group_id) ?? [];
    ids.push(row.id);
    playerIdsByGroupId.set(row.group_id, ids);
  }

  const labelByGroupId = new Map<string, string>();
  for (const groupId of uniqueGroupIds) {
    const playerIds = playerIdsByGroupId.get(groupId) ?? [];
    const labels = playerIds.map(
      (playerId) => playerLabelById.get(playerId)?.publicName ?? 'Player',
    );
    labelByGroupId.set(groupId, buildPublicGroupLabel(labels));
  }

  return labelByGroupId;
}

/** Single-group convenience wrapper around {@link resolvePublicGroupLabels}. */
export async function resolvePublicGroupLabel(
  supabase: SupabaseLike,
  groupId: string,
): Promise<string> {
  const labelByGroupId = await resolvePublicGroupLabels(supabase, [groupId]);
  return labelByGroupId.get(groupId) ?? EMPTY_GROUP_LABEL;
}
