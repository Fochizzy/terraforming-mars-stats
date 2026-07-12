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

  const uniqueTokens = new Set(identities.map((identity) => identity.token));

  if (uniqueTokens.size !== identities.length) {
    throw new Error(
      'Imported participants resolve to duplicate existing users. Update the names before saving.',
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
      'Multiple groups already use this exact player set. Clean up the duplicates before importing.',
    );
  }

  return matchingGroupIds[0] ?? null;
}

export function buildImportGroupName(participantNames: string[]) {
  return [...participantNames]
    .sort((left, right) => left.localeCompare(right))
    .join(' / ');
}

export function buildImportGroupMemberRows(input: {
  groupId: string;
  participantIdentities: Array<Pick<ImportParticipantIdentity, 'linkedUserId'>>;
}) {
  // Membership derives from participation: a user becomes a group member only
  // when they have a linked player in the roster. The importing user is added
  // here iff they are one of those linked participants — importing a game you
  // didn't play in must not add you to that group.
  const uniqueUserIds = [
    ...new Set(
      input.participantIdentities
        .map((participant) => participant.linkedUserId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  return uniqueUserIds.map((userId) => ({
    group_id: input.groupId,
    role: 'editor' as const,
    user_id: userId,
  }));
}

export type ImportGroupReconciliationPlan = {
  playerIdsToRemove: string[];
  updatedGroupName: string | null;
};

const NOOP_RECONCILIATION_PLAN: ImportGroupReconciliationPlan = {
  playerIdsToRemove: [],
  updatedGroupName: null,
};

export function planImportGroupReconciliation(input: {
  confirmedPlayerIds: string[];
  groupName: string;
  originalRosterPlayerIds: string[];
  rosterPlayers: Array<
    Pick<GlobalPlayerRow, 'display_name' | 'id' | 'linked_user_id'>
  >;
}): ImportGroupReconciliationPlan {
  if (
    input.confirmedPlayerIds.length === 0 ||
    input.originalRosterPlayerIds.length === 0
  ) {
    return NOOP_RECONCILIATION_PLAN;
  }

  const nameById = new Map(
    input.rosterPlayers.map((player) => [player.id, player.display_name]),
  );
  const originalNames: string[] = [];

  for (const playerId of input.originalRosterPlayerIds) {
    const name = nameById.get(playerId);

    if (name === undefined) {
      return NOOP_RECONCILIATION_PLAN;
    }

    originalNames.push(name);
  }

  // Only reconcile while the group still bears the name auto-generated from
  // the pre-review import roster; a manually created or renamed group keeps
  // its roster and name untouched.
  if (input.groupName !== buildImportGroupName(originalNames)) {
    return NOOP_RECONCILIATION_PLAN;
  }

  const confirmedNames: string[] = [];

  for (const playerId of input.confirmedPlayerIds) {
    const name = nameById.get(playerId);

    if (name === undefined) {
      return NOOP_RECONCILIATION_PLAN;
    }

    confirmedNames.push(name);
  }

  const confirmedPlayerIdSet = new Set(input.confirmedPlayerIds);
  const playerIdsToRemove = input.rosterPlayers
    .filter(
      (player) =>
        !confirmedPlayerIdSet.has(player.id) && !player.linked_user_id,
    )
    .map((player) => player.id);
  const updatedGroupName = buildImportGroupName(confirmedNames);

  return {
    playerIdsToRemove,
    updatedGroupName:
      updatedGroupName === input.groupName ? null : updatedGroupName,
  };
}

function extractSnapshotSelectedPlayerIds(snapshot: unknown) {
  if (
    snapshot &&
    typeof snapshot === 'object' &&
    'selectedPlayerIds' in snapshot &&
    Array.isArray(snapshot.selectedPlayerIds)
  ) {
    return snapshot.selectedPlayerIds.filter(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );
  }

  return [];
}

export async function reconcileImportGroupAfterFinalize(input: {
  gameId: string;
  groupId: string;
}): Promise<ImportGroupReconciliationPlan> {
  const admin = createSupabaseAdminClient();
  const { data: importRows, error: importRowsError } = await admin
    .from('game_log_imports')
    .select('id')
    .eq('game_id', input.gameId)
    .limit(1);

  if (importRowsError) {
    throw importRowsError;
  }

  if ((importRows ?? []).length === 0) {
    return NOOP_RECONCILIATION_PLAN;
  }

  const { data: groupGames, error: groupGamesError } = await admin
    .from('games')
    .select('id, status')
    .eq('group_id', input.groupId);

  if (groupGamesError) {
    throw groupGamesError;
  }

  const games = (groupGames ?? []) as Array<{ id: string; status: string }>;
  const finalizedGame = games.find((game) => game.id === input.gameId);

  // Only a group whose entire history is this one finalized import can be
  // reconciled safely; groups with other games keep their roster untouched.
  if (
    !finalizedGame ||
    finalizedGame.status !== 'finalized' ||
    games.length !== 1
  ) {
    return NOOP_RECONCILIATION_PLAN;
  }

  const [groupResult, rosterResult, gamePlayersResult, firstRevisionResult] =
    await Promise.all([
      admin.from('groups').select('id, name').eq('id', input.groupId).single(),
      admin
        .from('players')
        .select('id, display_name, linked_user_id')
        .eq('group_id', input.groupId),
      admin
        .from('game_players')
        .select('player_id')
        .eq('game_id', input.gameId),
      admin
        .from('game_revisions')
        .select('snapshot')
        .eq('game_id', input.gameId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  if (groupResult.error) {
    throw groupResult.error;
  }

  if (rosterResult.error) {
    throw rosterResult.error;
  }

  if (gamePlayersResult.error) {
    throw gamePlayersResult.error;
  }

  if (firstRevisionResult.error) {
    throw firstRevisionResult.error;
  }

  const plan = planImportGroupReconciliation({
    confirmedPlayerIds: (
      (gamePlayersResult.data ?? []) as Array<{ player_id: string }>
    ).map((row) => row.player_id),
    groupName: (groupResult.data as { id: string; name: string }).name,
    originalRosterPlayerIds: extractSnapshotSelectedPlayerIds(
      firstRevisionResult.data?.snapshot,
    ),
    rosterPlayers: (rosterResult.data ?? []) as Array<
      Pick<GlobalPlayerRow, 'display_name' | 'id' | 'linked_user_id'>
    >,
  });

  if (plan.playerIdsToRemove.length > 0) {
    const { error: removePlayersError } = await admin
      .from('players')
      .delete()
      .in('id', plan.playerIdsToRemove)
      .eq('group_id', input.groupId);

    if (removePlayersError) {
      throw removePlayersError;
    }
  }

  if (plan.updatedGroupName) {
    const { error: renameGroupError } = await admin
      .from('groups')
      .update({ name: plan.updatedGroupName })
      .eq('id', input.groupId);

    if (renameGroupError) {
      throw renameGroupError;
    }
  }

  return plan;
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

    const existingMemberRows = buildImportGroupMemberRows({
      groupId: matchingGroupId,
      participantIdentities,
    });

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

  const memberRows = buildImportGroupMemberRows({
    groupId: group.id,
    participantIdentities,
  });

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
