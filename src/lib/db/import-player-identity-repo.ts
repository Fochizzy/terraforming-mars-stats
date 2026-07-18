import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  importPlayerIdentityInputSchema,
  type ImportedPlayerResolution,
  type ImportPlayerIdentityCandidate,
  type ImportPlayerIdentityDraftInput,
} from '@/lib/player-identity/guest-identity';
import { listPlayers } from './player-repo';

type RawPrivateIdentityRow = {
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_username: string | null;
  identity_mode: 'personal_name' | 'username';
  normalized_guest_username: string | null;
  normalized_personal_name: string | null;
  player_id: string;
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
  const [players, privateIdentityResult] = await Promise.all([
    listPlayers(groupId),
    supabase
      .from('player_private_identities')
      .select(
        [
          'guest_first_name',
          'guest_last_name',
          'guest_username',
          'identity_mode',
          'normalized_guest_username',
          'normalized_personal_name',
          'player_id',
        ].join(', '),
      )
      .eq('group_id', groupId),
  ]);

  if (privateIdentityResult.error) {
    throw privateIdentityResult.error;
  }

  const identityByPlayerId = new Map(
    ((privateIdentityResult.data ?? []) as unknown as RawPrivateIdentityRow[]).map(
      (identity) => [identity.player_id, identity],
    ),
  );

  return players.map((player) => {
    const identity = player.linked_user_id
      ? undefined
      : identityByPlayerId.get(player.id);

    return {
      firstName: identity?.guest_first_name ?? null,
      guestUsername: identity?.guest_username ?? null,
      id: player.id,
      identityMode:
        identity?.identity_mode ??
        (player.linked_user_id ? null : 'legacy'),
      isAccessible: true,
      isLinked: Boolean(player.linked_user_id),
      lastName: identity?.guest_last_name ?? null,
      normalizedPersonalName: identity?.normalized_personal_name ?? null,
      normalizedUsername: identity?.normalized_guest_username ?? null,
      publicName: player.display_name,
    };
  });
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
