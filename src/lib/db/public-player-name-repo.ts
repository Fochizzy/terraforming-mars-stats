import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  PUBLIC_PLAYER_FALLBACK,
  resolvePublicPlayerName,
} from '@/lib/player-identity/public-player-name';

export const PRIVACY_SAFE_PLAYER_FALLBACK = PUBLIC_PLAYER_FALLBACK;

type RawPublicPlayerNameRow = {
  is_linked: boolean;
  player_id: string;
  public_name: string;
};

export type PublicPlayerName = {
  isLinked: boolean;
  playerId: string;
  publicName: string;
};

export async function getPublicPlayerNames(
  playerIds: string[],
): Promise<PublicPlayerName[]> {
  const uniquePlayerIds = [...new Set(playerIds.filter(Boolean))];

  if (uniquePlayerIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_public_player_names', {
    p_player_ids: uniquePlayerIds,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawPublicPlayerNameRow[]).map((row) => ({
    isLinked: row.is_linked,
    playerId: row.player_id,
    publicName: row.is_linked
      ? resolvePublicPlayerName({
          kind: 'linked_claimed_player',
          registeredUsername: row.public_name,
        })
      : resolvePublicPlayerName({
          guestDisplayLabel: row.public_name,
          kind: 'unlinked_guest',
        }),
  }));
}

export function buildPublicPlayerNameMap(rows: PublicPlayerName[]) {
  return new Map(rows.map((row) => [row.playerId, row.publicName]));
}
