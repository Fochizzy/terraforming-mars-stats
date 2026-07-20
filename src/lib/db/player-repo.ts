import { createSupabaseServerClient } from '@/lib/supabase/server';
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

// This repository is deliberately read-only. The former createPlayerIfMissing
// and upsertPlayer writers copied caller-supplied text — for guests, a first
// and last name — straight into the client-readable players.display_name
// column. Under the guest-identity privacy contract a personal name must
// never become a broadly readable display value, so every guest-creation
// path (imports, /group/players, Manual Entry's new-player references) now
// goes through the guarded resolve_import_guest_identity RPC, which stores
// the personal name only in private.player_private_identities and writes a
// neutral "Guest XXXXXXXX" display label.
