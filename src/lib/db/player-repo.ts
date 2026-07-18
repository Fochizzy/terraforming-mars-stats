import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import {
  buildPublicPlayerNameMap,
  getPublicPlayerNames,
  PRIVACY_SAFE_PLAYER_FALLBACK,
} from './public-player-name-repo';

export type PlayerRow = {
  id: string;
  display_name: string;
  linked_user_id?: string | null;
};

export async function listPlayers(groupId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, linked_user_id')
    .eq('group_id', groupId)
    .order('created_at');

  if (error) {
    throw error;
  }

  const publicNames = await getPublicPlayerNames(
    data.map((player) => player.id),
  );
  const publicNameByPlayerId = buildPublicPlayerNameMap(publicNames);

  return data
    .map((player) => ({
      id: player.id,
      display_name:
        publicNameByPlayerId.get(player.id) ?? PRIVACY_SAFE_PLAYER_FALLBACK,
      linked_user_id: player.linked_user_id,
    }))
    .sort((left, right) =>
      left.display_name.localeCompare(right.display_name),
    );
}

export async function createPlayerIfMissing(input: {
  displayName: string;
  groupId: string;
  linkedUserId?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  const normalizedDisplayName = normalizePlayerAlias(input.displayName);
  const { data: existingPlayer, error: existingPlayerError } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id')
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
      group_id: input.groupId,
      linked_user_id: input.linkedUserId ?? null,
    })
    .select('id, display_name, linked_user_id')
    .single();

  if (!error) {
    return data;
  }

  const { data: retryPlayer, error: retryPlayerError } = await supabase
    .from('players')
    .select('id, display_name, linked_user_id')
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
