import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  importPlayerIdentityInputSchema,
  type ImportedPlayerResolution,
  type ImportPlayerIdentityCandidate,
  type ImportPlayerIdentityDraftInput,
} from '@/lib/player-identity/guest-identity';

type RawIdentityCandidateRow = {
  is_linked: boolean;
  player_id: string;
  public_name: string;
};

type RawResolvedGuestRow = {
  normalized_imported_value: string;
  player_id: string;
  public_name: string;
  resolution_state:
    | 'existing_unlinked_guest'
    | 'newly_created_unlinked_guest';
};

export async function listImportPlayerIdentityCandidates(
  groupId: string,
): Promise<ImportPlayerIdentityCandidate[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc(
    'list_import_player_identity_candidates',
    { p_group_id: groupId },
  );

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawIdentityCandidateRow[]).map((player) => ({
      id: player.player_id,
      isAccessible: true,
      isLinked: player.is_linked,
      publicName: player.public_name,
    }));
}

export async function resolveImportPlayerIdentities(input: {
  groupId: string;
  identities: ImportPlayerIdentityDraftInput[];
  parserIdentity?: ImportedPlayerResolution['parserIdentity'];
  sourceFormat?: ImportedPlayerResolution['sourceFormat'];
}): Promise<ImportedPlayerResolution[]> {
  const supabase = await createSupabaseServerClient();
  const roster = await listImportPlayerIdentityCandidates(input.groupId);
  const rosterById = new Map(roster.map((player) => [player.id, player]));
  const selectedPlayerIds = new Set<string>();
  const resolutions: ImportedPlayerResolution[] = [];

  for (const rawIdentity of input.identities) {
    const identity = importPlayerIdentityInputSchema.parse(rawIdentity);

    if (identity.mode === 'existing_player') {
      const selected = rosterById.get(identity.selectedPlayerId);

      if (!selected?.isAccessible) {
        throw new Error('The selected player is inaccessible or unavailable.');
      }

      if (selectedPlayerIds.has(selected.id)) {
        throw new Error('Each imported player must resolve to a different player ID.');
      }

      selectedPlayerIds.add(selected.id);
      resolutions.push({
        decision: selected.isLinked ? 'linked' : 'reused',
        identityMode: 'existing_player',
        normalizedImportedValue: null,
        parserIdentity: input.parserIdentity ?? 'manual-web-import-v1',
        selectedPlayerId: selected.id,
        sourceFormat: input.sourceFormat ?? 'manual_web_import',
        sourcePlayerText: identity.sourcePlayerText,
        state: selected.isLinked
          ? 'linked_registered_player'
          : 'existing_unlinked_guest',
        valueSource: identity.valueSource,
      });
      continue;
    }

    const { data, error } = await supabase.rpc('resolve_import_guest_identity', {
      p_create_new: identity.createNew,
      p_group_id: input.groupId,
      p_guest_first_name:
        identity.mode === 'personal_name' ? identity.firstName : null,
      p_guest_last_name:
        identity.mode === 'personal_name' ? identity.lastName : null,
      p_guest_username:
        identity.mode === 'username' ? identity.username : null,
      p_identity_mode: identity.mode,
      p_selected_player_id: identity.selectedPlayerId,
    });

    if (error) {
      throw error;
    }

    const result = ((data ?? []) as RawResolvedGuestRow[])[0];

    if (!result) {
      throw new Error('The guest identity could not be resolved.');
    }

    if (selectedPlayerIds.has(result.player_id)) {
      throw new Error('Each imported player must resolve to a different player ID.');
    }

    selectedPlayerIds.add(result.player_id);
    resolutions.push({
      decision:
        result.resolution_state === 'existing_unlinked_guest'
          ? 'reused'
          : 'created',
      identityMode: identity.mode,
      normalizedImportedValue: result.normalized_imported_value,
      parserIdentity: input.parserIdentity ?? 'manual-web-import-v1',
      selectedPlayerId: result.player_id,
      sourceFormat: input.sourceFormat ?? 'manual_web_import',
      sourcePlayerText: identity.sourcePlayerText,
      state: result.resolution_state,
      valueSource: identity.valueSource,
    });
  }

  return resolutions;
}
