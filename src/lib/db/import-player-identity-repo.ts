import { createSupabaseAdminClient } from '@/lib/supabase/admin';
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
  player_id: string;
  public_name: string;
  resolution_state:
    | 'existing_unlinked_guest'
    | 'newly_created_unlinked_guest';
};

type SourceBoundResolutionOutcome =
  | 'ambiguous'
  | 'invalid_source_match'
  | 'resolved'
  | 'unavailable'
  | 'unresolved';

type RawSourceBoundResolutionRow = {
  outcome: SourceBoundResolutionOutcome;
  player_id: string | null;
  public_label: string | null;
};

function sourceBoundResolutionError(outcome: SourceBoundResolutionOutcome) {
  switch (outcome) {
    case 'ambiguous':
      return new Error(
        'Multiple eligible players match this imported seat. Select one explicitly.',
      );
    case 'invalid_source_match':
      return new Error(
        'The selected identity does not exactly match the imported source seat.',
      );
    case 'unresolved':
      return new Error(
        'Confirm an eligible player or creation for every imported seat.',
      );
    default:
      return new Error('The imported player identity is unavailable.');
  }
}

export async function listImportPlayerIdentityCandidates(
  groupId: string,
): Promise<ImportPlayerIdentityCandidate[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'list_import_player_identity_candidates',
    { p_group_id: groupId },
  );
  if (error) throw error;

  return ((data ?? []) as RawIdentityCandidateRow[]).map((player) => ({
    id: player.player_id,
    isAccessible: true,
    isLinked: player.is_linked,
    publicName: player.public_name,
  }));
}

/**
 * Non-import guest creation remains on its established guarded RPC. It must
 * not record an import alias because no imported source exists on this path.
 */
export async function createOrReuseGuestPlayerByPersonalName(input: {
  firstName: string;
  groupId: string;
  lastName: string;
}): Promise<{
  id: string;
  publicName: string;
  resolutionState: 'existing_unlinked_guest' | 'newly_created_unlinked_guest';
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('resolve_import_guest_identity', {
    p_create_new: true,
    p_group_id: input.groupId,
    p_guest_first_name: input.firstName,
    p_guest_last_name: input.lastName,
    p_guest_username: null,
    p_identity_mode: 'personal_name',
    p_record_import_alias: false,
    p_selected_player_id: null,
  });

  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error(
        'Guest creation outside imports requires migration 20260720100000_add_guest_identity_alias_source_control.',
      );
    }
    throw error;
  }

  const result = ((data ?? []) as RawResolvedGuestRow[])[0];
  if (!result) throw new Error('The guest identity could not be created.');

  return {
    id: result.player_id,
    publicName: result.public_name,
    resolutionState: result.resolution_state,
  };
}

export async function stageImportPlayerIdentityEvidence(input: {
  groupId: string;
  parserIdentity: string;
  requestingUserId: string;
  sourceFormat: string;
  sourcePlayerTexts: string[];
}): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    'stage_import_player_identity_evidence',
    {
      p_group_id: input.groupId,
      p_parser_identity: input.parserIdentity,
      p_requesting_user_id: input.requestingUserId,
      p_source_format: input.sourceFormat,
      p_source_player_texts: input.sourcePlayerTexts,
    },
  );
  if (error || typeof data !== 'string') {
    throw new Error('The imported player evidence could not be staged.');
  }
  return data;
}

export async function attachImportIdentityStaging(input: {
  gameId: string;
  gameLogImportId: string;
  requestingUserId: string;
  stagingId: string;
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('attach_import_identity_staging', {
    p_game_id: input.gameId,
    p_game_log_import_id: input.gameLogImportId,
    p_requesting_user_id: input.requestingUserId,
    p_staging_id: input.stagingId,
  });
  return !error && data === true;
}

export async function discardImportIdentityStaging(input: {
  requestingUserId: string;
  stagingId: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.rpc('discard_import_identity_staging', {
    p_requesting_user_id: input.requestingUserId,
    p_staging_id: input.stagingId,
  });
}

export async function resolveImportPlayerIdentities(input: {
  authoritativeSourcePlayerTexts: string[];
  groupId: string;
  identities: ImportPlayerIdentityDraftInput[];
  parserIdentity?: ImportedPlayerResolution['parserIdentity'];
  requestingUserId: string;
  sourceFormat?: ImportedPlayerResolution['sourceFormat'];
  stagingId: string;
}): Promise<ImportedPlayerResolution[]> {
  if (input.authoritativeSourcePlayerTexts.length !== input.identities.length) {
    throw new Error('Resolve one identity for every server-parsed player seat.');
  }

  const supabase = createSupabaseAdminClient();
  const roster = await listImportPlayerIdentityCandidates(input.groupId);
  const rosterById = new Map(roster.map((player) => [player.id, player]));
  const selectedPlayerIds = new Set<string>();
  const resolutions: ImportedPlayerResolution[] = [];

  for (const [index, rawIdentity] of input.identities.entries()) {
    const identity = importPlayerIdentityInputSchema.parse(rawIdentity);
    const authoritativeSourcePlayerText =
      input.authoritativeSourcePlayerTexts[index];
    const { data, error } = await supabase.rpc(
      'resolve_staged_import_player_identity',
      {
        p_create_new:
          identity.mode === 'existing_player' ? false : identity.createNew,
        p_guest_first_name:
          identity.mode === 'personal_name' ? identity.firstName : null,
        p_guest_last_name:
          identity.mode === 'personal_name' ? identity.lastName : null,
        p_guest_username:
          identity.mode === 'username' ? identity.username : null,
        p_identity_mode: identity.mode,
        p_requesting_user_id: input.requestingUserId,
        p_selected_player_id: identity.selectedPlayerId,
        p_source_player_ordinal: index + 1,
        p_staging_id: input.stagingId,
      },
    );

    if (error) {
      throw new Error('The imported player identity is unavailable.');
    }
    const result = ((data ?? []) as RawSourceBoundResolutionRow[])[0];
    if (!result || result.outcome !== 'resolved' || !result.player_id) {
      throw sourceBoundResolutionError(result?.outcome ?? 'unavailable');
    }
    if (selectedPlayerIds.has(result.player_id)) {
      throw new Error(
        'Each imported player must resolve to a different player ID.',
      );
    }

    selectedPlayerIds.add(result.player_id);
    const selected = rosterById.get(result.player_id);
    resolutions.push({
      decision: selected ? (selected.isLinked ? 'linked' : 'reused') : 'created',
      identityMode: identity.mode,
      parserIdentity: input.parserIdentity ?? 'manual-web-import-v1',
      selectedPlayerId: result.player_id,
      sourceFormat: input.sourceFormat ?? 'manual_web_import',
      sourcePlayerText: authoritativeSourcePlayerText,
      state: selected?.isLinked
        ? 'linked_registered_player'
        : selected
          ? 'existing_unlinked_guest'
          : 'newly_created_unlinked_guest',
      valueSource: identity.valueSource,
    });
  }

  return resolutions;
}
