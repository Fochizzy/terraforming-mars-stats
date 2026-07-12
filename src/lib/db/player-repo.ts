import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';

export type PlayerRow = {
  id: string;
  display_name: string;
  full_name?: string | null;
  linked_user_id?: string | null;
  username?: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export async function listPlayers(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id')
    .eq('group_id', groupId)
    .order('display_name');

  if (error) {
    throw error;
  }

  return data;
}

export async function createPlayerIfMissing(input: {
  displayName: string;
  fullName?: string | null;
  groupId: string;
  linkedUserId?: string | null;
  username?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const normalizedDisplayName = normalizePlayerAlias(input.displayName);
  const { data: existingPlayer, error: existingPlayerError } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id, username, full_name')
    .eq('group_id', input.groupId)
    .eq('normalized_display_name', normalizedDisplayName)
    .maybeSingle();

  if (existingPlayerError) {
    throw existingPlayerError;
  }

  if (existingPlayer) {
    return existingPlayer;
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
    .select('id, display_name, linked_user_id, username, full_name')
    .single();

  if (!error) {
    return data;
  }

  const { data: retryPlayer, error: retryPlayerError } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id, username, full_name')
    .eq('group_id', input.groupId)
    .eq('normalized_display_name', normalizedDisplayName)
    .maybeSingle();

  if (retryPlayerError) {
    throw retryPlayerError;
  }

  if (!retryPlayer) {
    throw error;
  }

  return retryPlayer;
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
    .select('id, display_name, linked_user_id')
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
    return targetPlayer;
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
    .select('id, display_name, linked_user_id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertPlayer(input: {
  id?: string;
  group_id: string;
  display_name: string;
  linked_user_id?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .upsert(input)
    .select('id, display_name')
    .single();

  if (error) {
    throw error;
  }

  return data;
}
