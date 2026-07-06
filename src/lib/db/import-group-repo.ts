import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';

type GlobalPlayerRow = {
  created_at?: string | null;
  display_name: string;
  group_id: string;
  id: string;
  linked_user_id: string | null;
};

export type ImportParticipantIdentity = {
  displayName: string;
  linkedUserId: string | null;
  normalizedName: string;
  token: string;
};

function buildPlayerIdentityToken(player: {
  display_name: string;
  linked_user_id?: string | null;
}) {
  if (player.linked_user_id) {
    return `user:${player.linked_user_id}`;
  }

  return `name:${normalizePlayerAlias(player.display_name)}`;
}

export function buildGroupRosterSignature(tokens: string[]) {
  return [...tokens].sort().join('|');
}

function findDuplicateToken(tokens: string[]) {
  const seenTokens = new Set<string>();

  for (const token of tokens) {
    if (seenTokens.has(token)) {
      return token;
    }

    seenTokens.add(token);
  }

  return null;
}

export function resolveImportParticipantIdentities(
  participantNames: string[],
  playerRows: Array<Pick<GlobalPlayerRow, 'display_name' | 'group_id' | 'id' | 'linked_user_id'>>,
): ImportParticipantIdentity[] {
  const identities = participantNames.map((displayName) => {
    const normalizedName = normalizePlayerAlias(displayName);
    const matchingRows = playerRows.filter(
      (row) => normalizePlayerAlias(row.display_name) === normalizedName,
    );
    const linkedUserIds = [...new Set(
      matchingRows
        .map((row) => row.linked_user_id)
        .filter((value): value is string => Boolean(value)),
    )];

    if (linkedUserIds.length > 1) {
      throw new Error(
        `Participant "${displayName}" matches multiple existing users. Use a more specific exact name.`,
      );
    }

    const linkedUserId = linkedUserIds[0] ?? null;

    return {
      displayName,
      linkedUserId,
      normalizedName,
      token: linkedUserId ? `user:${linkedUserId}` : `name:${normalizedName}`,
    };
  });

  const duplicateToken = findDuplicateToken(
    identities.map((identity) => identity.token),
  );

  if (duplicateToken) {
    throw new Error(
      `Imported participants collapse to the same exact token (${duplicateToken}). Update the names before saving.`,
    );
  }

  return identities;
}

export function findExactGroupRosterMatch(
  importedParticipants: ImportParticipantIdentity[],
  playerRows: GlobalPlayerRow[],
) {
  const importedSignature = buildGroupRosterSignature(
    importedParticipants.map((participant) => participant.token),
  );
  const groupedRows = new Map<string, GlobalPlayerRow[]>();

  for (const row of playerRows) {
    const groupRows = groupedRows.get(row.group_id) ?? [];
    groupRows.push(row);
    groupedRows.set(row.group_id, groupRows);
  }

  const matchingGroupIds = [...groupedRows.entries()]
    .filter(([, rows]) => {
      const signature = buildGroupRosterSignature(
        rows.map((row) => buildPlayerIdentityToken(row)),
      );
      return signature === importedSignature;
    })
    .map(([groupId]) => groupId);

  if (matchingGroupIds.length > 1) {
    throw new Error(
      `Multiple groups already share the same exact roster signature (${importedSignature}). Clean up the duplicates before importing.`,
    );
  }

  return matchingGroupIds[0] ?? null;
}

function buildImportGroupName(participantNames: string[]) {
  const sortedNames = [...participantNames].sort((left, right) =>
    left.localeCompare(right),
  );

  if (sortedNames.length <= 3) {
    return sortedNames.join(' / ');
  }

  return `${sortedNames[0]} / ${sortedNames[1]} / +${sortedNames.length - 2} more`;
}

function selectImportPlayerIds(
  importedParticipants: ImportParticipantIdentity[],
  groupPlayers: Array<Pick<GlobalPlayerRow, 'display_name' | 'group_id' | 'id' | 'linked_user_id'>>,
) {
  const unusedPlayers = [...groupPlayers];

  return importedParticipants.map((participant) => {
    const matchIndex = unusedPlayers.findIndex(
      (player) => buildPlayerIdentityToken(player) === participant.token,
    );

    if (matchIndex < 0) {
      throw new Error(
        `Could not match "${participant.displayName}" to the selected group roster.`,
      );
    }

    const [matchedPlayer] = unusedPlayers.splice(matchIndex, 1);
    return matchedPlayer.id;
  });
}

export function selectCurrentGroupPlayerIds(
  participantNames: string[],
  groupPlayers: Array<Pick<GlobalPlayerRow, 'display_name' | 'id'>>,
) {
  const unusedPlayers = [...groupPlayers];

  return participantNames.map((participantName) => {
    const normalizedParticipantName = normalizePlayerAlias(participantName);
    const matchingPlayers = unusedPlayers.filter(
      (player) =>
        normalizePlayerAlias(player.display_name) === normalizedParticipantName,
    );

    if (matchingPlayers.length !== 1) {
      throw new Error(
        `Participant "${participantName}" does not exactly match one player in the current group.`,
      );
    }

    const matchedPlayerId = matchingPlayers[0]?.id;
    const matchIndex = unusedPlayers.findIndex(
      (player) => player.id === matchedPlayerId,
    );
    const [matchedPlayer] = unusedPlayers.splice(matchIndex, 1);

    return matchedPlayer.id;
  });
}

export async function resolveOrCreateImportGroup(input: {
  importingUserId: string;
  participantNames: string[];
}) {
  const admin = createSupabaseAdminClient();
  const { data: playerRows, error: playerRowsError } = await admin
    .from('players')
    .select('id, group_id, display_name, linked_user_id, created_at')
    .order('created_at', { ascending: true });

  if (playerRowsError) {
    throw playerRowsError;
  }

  const globalPlayers = (playerRows ?? []) as GlobalPlayerRow[];
  const participantIdentities = resolveImportParticipantIdentities(
    input.participantNames,
    globalPlayers,
  );
  const matchingGroupId = findExactGroupRosterMatch(
    participantIdentities,
    globalPlayers,
  );

  if (matchingGroupId) {
    const groupPlayers = globalPlayers.filter(
      (player) => player.group_id === matchingGroupId,
    );
    const selectedPlayerIds = selectImportPlayerIds(
      participantIdentities,
      groupPlayers,
    );
    const { data: group, error: groupError } = await admin
      .from('groups')
      .select('id, name')
      .eq('id', matchingGroupId)
      .single();

    if (groupError) {
      throw groupError;
    }

    const existingMemberRows = [
      input.importingUserId,
      ...participantIdentities
        .map((participant) => participant.linkedUserId)
        .filter((value): value is string => Boolean(value)),
    ].map((userId) => ({
      group_id: matchingGroupId,
      role: 'editor' as const,
      user_id: userId,
    }));

    const { error: membershipError } = await admin
      .from('group_members')
      .upsert(existingMemberRows, {
        ignoreDuplicates: false,
        onConflict: 'group_id,user_id',
      });

    if (membershipError) {
      throw membershipError;
    }

    return {
      createdNewGroup: false,
      createdProfileNames: [] as string[],
      groupId: group.id,
      groupName: group.name,
      selectedPlayerIds,
    };
  }

  const { data: group, error: groupError } = await admin
    .from('groups')
    .insert({
      name: buildImportGroupName(input.participantNames),
    })
    .select('id, name')
    .single();

  if (groupError) {
    throw groupError;
  }

  const memberRows = [
    input.importingUserId,
    ...participantIdentities
      .map((participant) => participant.linkedUserId)
      .filter((value): value is string => Boolean(value)),
  ].map((userId) => ({
    group_id: group.id,
    role: 'editor' as const,
    user_id: userId,
  }));

  const { error: memberInsertError } = await admin
    .from('group_members')
    .upsert(memberRows, {
      ignoreDuplicates: false,
      onConflict: 'group_id,user_id',
    });

  if (memberInsertError) {
    throw memberInsertError;
  }

  const { error: settingsError } = await admin.from('group_settings').upsert({
    group_id: group.id,
    global_analytics_enabled: false,
    default_map_id: null,
  });

  if (settingsError) {
    throw settingsError;
  }

  const { data: insertedPlayers, error: insertedPlayersError } = await admin
    .from('players')
    .insert(
      participantIdentities.map((participant) => ({
        display_name: participant.displayName,
        group_id: group.id,
        linked_user_id: participant.linkedUserId,
      })),
    )
    .select('id, group_id, display_name, linked_user_id');

  if (insertedPlayersError) {
    throw insertedPlayersError;
  }

  return {
    createdNewGroup: true,
    createdProfileNames: participantIdentities
      .filter((participant) => !participant.linkedUserId)
      .map((participant) => participant.displayName),
    groupId: group.id,
    groupName: group.name,
    selectedPlayerIds: selectImportPlayerIds(
      participantIdentities,
      (insertedPlayers ?? []) as GlobalPlayerRow[],
    ),
  };
}
