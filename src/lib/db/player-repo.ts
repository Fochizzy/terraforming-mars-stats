import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { matchImportPlayerNames } from './import-player-resolution-repo';
import { fetchPublicPlayerLabels } from './player-label-resolution';

export type PlayerRow = {
  id: string;
  /**
   * The privacy-safe public label: the linked account's username, or the
   * stable neutral guest label. Never a raw roster/personal name. For rows
   * returned by `createPlayerIfMissing` this echoes the requested name the
   * caller just supplied; use `listPlayers` when rendering a roster.
   */
  display_name: string;
  linked_user_id?: string | null;
};

type PlayerIdRow = {
  id: string;
  linked_user_id: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

/** Postgres/PostgREST insufficient_privilege. */
function isInsufficientPrivilegeError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '42501'
  );
}

export async function listPlayers(groupId: string): Promise<PlayerRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, linked_user_id')
    .eq('group_id', groupId)
    .order('created_at');

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as PlayerIdRow[];
  const labelByPlayerId = await fetchPublicPlayerLabels(
    supabase,
    rows.map((player) => player.id),
  );

  // Explicit field picks, not a spread: nothing beyond the id, the linkage,
  // and the resolved public label can ever ride along into a roster payload.
  return rows
    .map((player) => ({
      display_name: labelByPlayerId.get(player.id)?.publicName ?? 'Player',
      id: player.id,
      linked_user_id: player.linked_user_id,
    }))
    .sort((left, right) => left.display_name.localeCompare(right.display_name));
}

/**
 * Find the roster row a typed display name refers to, in a way that works both
 * while `players.normalized_display_name` is still directly readable and after
 * it is restricted like `full_name` / `username` already are.
 *
 * The direct normalized-equality probe is authoritative while it is permitted.
 * Once it returns `insufficient_privilege`, matching falls back to the
 * security-definer name matcher, accepting only an exact match that belongs to
 * this group's roster — a cross-group exact match is not this roster's player
 * and must not suppress creation here.
 */
async function findRosterPlayerByDisplayName(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  groupId: string,
  displayName: string,
): Promise<PlayerIdRow | null> {
  const { data, error } = await supabase
    .from('players')
    .select('id, linked_user_id')
    .eq('group_id', groupId)
    .eq('normalized_display_name', normalizePlayerAlias(displayName))
    .maybeSingle();

  if (!error) {
    return (data as PlayerIdRow | null) ?? null;
  }

  if (!isInsufficientPrivilegeError(error)) {
    throw error;
  }

  const matches = await matchImportPlayerNames(groupId, [displayName]);
  const exactMatch = matches.find((match) => match.matchReason === 'exact');

  if (!exactMatch) {
    return null;
  }

  const { data: groupPlayer, error: groupPlayerError } = await supabase
    .from('players')
    .select('id, linked_user_id')
    .eq('group_id', groupId)
    .eq('id', exactMatch.playerId)
    .maybeSingle();

  if (groupPlayerError) {
    throw groupPlayerError;
  }

  return (groupPlayer as PlayerIdRow | null) ?? null;
}

export async function createPlayerIfMissing(input: {
  displayName: string;
  fullName?: string | null;
  groupId: string;
  linkedUserId?: string | null;
  username?: string | null;
}): Promise<PlayerRow> {
  const supabase = await createSupabaseServerClient();
  const existingPlayer = await findRosterPlayerByDisplayName(
    supabase,
    input.groupId,
    input.displayName,
  );

  if (existingPlayer) {
    return { ...existingPlayer, display_name: input.displayName };
  }

  const { data, error } = await supabase
    .from('players')
    .insert({
      display_name: input.displayName,
      full_name: normalizeOptionalText(input.fullName),
      group_id: input.groupId,
      linked_user_id: input.linkedUserId ?? null,
      username: normalizeOptionalText(input.username),
    })
    .select('id, linked_user_id')
    .single();

  if (!error) {
    return { ...(data as PlayerIdRow), display_name: input.displayName };
  }

  const retryPlayer = await findRosterPlayerByDisplayName(
    supabase,
    input.groupId,
    input.displayName,
  );

  if (!retryPlayer) {
    throw error;
  }

  return { ...retryPlayer, display_name: input.displayName };
}

/**
 * Set a roster player's username + full name. Used when an import is confirmed
 * so the identity typed in review lands on the routed group's player. Account-
 * linked players keep their canonical values in `user_profiles`, so their link
 * is left untouched here — only these supplementary player columns are written.
 */
export async function updatePlayerIdentity(input: {
  fullName?: string | null;
  groupId: string;
  playerId: string;
  username?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('players')
    .update({
      full_name: normalizeOptionalText(input.fullName),
      username: normalizeOptionalText(input.username),
    })
    .eq('group_id', input.groupId)
    .eq('id', input.playerId);

  if (error) {
    throw error;
  }
}

export async function linkPlayerToUser(input: {
  groupId: string;
  playerId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: targetPlayer, error: targetPlayerError } = await supabase
    .from('players')
    .select('id, linked_user_id')
    .eq('group_id', input.groupId)
    .eq('id', input.playerId)
    .maybeSingle();

  if (targetPlayerError) {
    throw targetPlayerError;
  }

  if (!targetPlayer) {
    throw new Error('That player is not part of the active group.');
  }

  if (
    targetPlayer.linked_user_id &&
    targetPlayer.linked_user_id !== input.userId
  ) {
    throw new Error('That player is already linked to another account.');
  }

  if (targetPlayer.linked_user_id === input.userId) {
    return targetPlayer as PlayerIdRow;
  }

  const { error: clearExistingLinkError } = await supabase
    .from('players')
    .update({ linked_user_id: null })
    .eq('group_id', input.groupId)
    .eq('linked_user_id', input.userId);

  if (clearExistingLinkError) {
    throw clearExistingLinkError;
  }

  const { data, error } = await supabase
    .from('players')
    .update({ linked_user_id: input.userId })
    .eq('group_id', input.groupId)
    .eq('id', input.playerId)
    .select('id, linked_user_id')
    .single();

  if (error) {
    throw error;
  }

  return data as PlayerIdRow;
}
