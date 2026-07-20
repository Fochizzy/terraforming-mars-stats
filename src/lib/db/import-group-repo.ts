import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { buildPublicGroupLabel } from './group-label-resolution';
import { fetchPublicPlayerLabels } from './player-label-resolution';

/**
 * Placeholder only: satisfies the `groups.name` NOT NULL constraint for the
 * instant between inserting a new group and updating it with the resolved
 * public roster label once the roster's players exist. Never read back or
 * returned to a caller.
 */
const PENDING_GROUP_NAME = 'New group';

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
  selectedPlayerIds: Array<string | null> = [],
): ImportParticipantIdentity[] {
  const identities = participantNames.map((displayName, index) => {
    // A reviewer-confirmed selection names the person exactly; the label shown
    // in review no longer can. Identity is private now, so review displays a
    // public label ("lurker", "Guest 8F2A1B3C") that matches no roster row —
    // resolving by name would miss the chosen player and create a duplicate.
    const selectedRow = selectedPlayerIds[index]
      ? playerRows.find((row) => row.id === selectedPlayerIds[index]) ?? null
      : null;

    if (selectedRow) {
      const selectedNormalizedName = normalizePlayerAlias(
        selectedRow.display_name,
      );

      return {
        displayName: selectedRow.display_name,
        linkedUserId: selectedRow.linked_user_id ?? null,
        normalizedName: selectedNormalizedName,
        token: selectedRow.linked_user_id
          ? `user:${selectedRow.linked_user_id}`
          : `name:${selectedNormalizedName}`,
      };
    }

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
  rosterPlayers: Array<{
    id: string;
    linked_user_id: string | null;
    publicLabel: string;
  }>;
}): ImportGroupReconciliationPlan {
  if (
    input.confirmedPlayerIds.length === 0 ||
    input.originalRosterPlayerIds.length === 0
  ) {
    return NOOP_RECONCILIATION_PLAN;
  }

  const labelById = new Map(
    input.rosterPlayers.map((player) => [player.id, player.publicLabel]),
  );
  const originalLabels: string[] = [];

  for (const playerId of input.originalRosterPlayerIds) {
    const label = labelById.get(playerId);

    if (label === undefined) {
      return NOOP_RECONCILIATION_PLAN;
    }

    originalLabels.push(label);
  }

  // Only reconcile while the group still bears the label auto-generated from
  // the pre-review import roster; a manually created or renamed group — or
  // one whose stored name predates this public-label scheme — keeps its
  // roster and name untouched.
  if (input.groupName !== buildPublicGroupLabel(originalLabels)) {
    return NOOP_RECONCILIATION_PLAN;
  }

  const confirmedLabels: string[] = [];

  for (const playerId of input.confirmedPlayerIds) {
    const label = labelById.get(playerId);

    if (label === undefined) {
      return NOOP_RECONCILIATION_PLAN;
    }

    confirmedLabels.push(label);
  }

  const confirmedPlayerIdSet = new Set(input.confirmedPlayerIds);
  const playerIdsToRemove = input.rosterPlayers
    .filter(
      (player) =>
        !confirmedPlayerIdSet.has(player.id) && !player.linked_user_id,
    )
    .map((player) => player.id);
  const updatedGroupName = buildPublicGroupLabel(confirmedLabels);

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
        .select('id, linked_user_id')
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

  const rosterRows = (rosterResult.data ?? []) as Array<
    Pick<GlobalPlayerRow, 'id' | 'linked_user_id'>
  >;
  // The comparison and any rename below must reason about public labels only
  // — never the private `display_name` column — so this never reads it.
  const rosterLabelById = await fetchPublicPlayerLabels(
    admin,
    rosterRows.map((row) => row.id),
  );

  const plan = planImportGroupReconciliation({
    confirmedPlayerIds: (
      (gamePlayersResult.data ?? []) as Array<{ player_id: string }>
    ).map((row) => row.player_id),
    groupName: (groupResult.data as { id: string; name: string }).name,
    originalRosterPlayerIds: extractSnapshotSelectedPlayerIds(
      firstRevisionResult.data?.snapshot,
    ),
    rosterPlayers: rosterRows.map((row) => ({
      id: row.id,
      linked_user_id: row.linked_user_id,
      publicLabel: rosterLabelById.get(row.id)?.publicName ?? 'Player',
    })),
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

// The importer creates or routes this game, so they must be able to write the
// draft under RLS even when none of the imported names is linked to their
// account. They are added as an `editor` member only when absent, so an
// existing owner/editor role is never downgraded. This grants group access to
// the person doing the import — it is not a roster player, so it keeps the
// membership-from-participation rule in `buildImportGroupMemberRows` intact.
// Uses the service-role client because the importer is not yet an editor and so
// could not add themselves under the `group_members` policy.
async function addImportingUserAsEditor(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  groupId: string,
  importingUserId: string,
) {
  const { error } = await admin.from('group_members').upsert(
    { group_id: groupId, role: 'editor', user_id: importingUserId },
    { ignoreDuplicates: true, onConflict: 'group_id,user_id' },
  );

  if (error) {
    throw error;
  }
}

export async function resolveOrCreateImportGroup(input: {
  importingUserId: string;
  participantNames: string[];
  /** Reviewer-confirmed player id per participant, positionally aligned. */
  participantPlayerIds?: Array<string | null>;
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
    input.participantPlayerIds ?? [],
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
      .maybeSingle();

    if (groupError) {
      throw groupError;
    }

    if (group) {
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

      await addImportingUserAsEditor(admin, group.id, input.importingUserId);

      // The matched group's stored `groups.name` may still hold a raw
      // private-name concatenation from before this resolver existed, so the
      // returned label is always resolved from the current roster rather
      // than trusting the stored value.
      const existingGroupLabelById = await fetchPublicPlayerLabels(
        admin,
        groupPlayers.map((player) => player.id),
      );

      return {
        createdNewGroup: false,
        createdProfileNames: [] as string[],
        groupId: group.id,
        groupName: buildPublicGroupLabel(
          groupPlayers.map(
            (player) =>
              existingGroupLabelById.get(player.id)?.publicName ?? 'Player',
          ),
        ),
        selectedPlayerIds,
      };
    }
  }

  const { data: group, error: groupError } = await admin
    .from('groups')
    // A NOT NULL placeholder — the roster doesn't exist yet to label from.
    // Replaced with the resolved public-roster label right after the players
    // below are inserted, so `groups.name` never persists a raw personal-name
    // concatenation the way the old auto-naming did.
    .insert({ name: PENDING_GROUP_NAME })
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

  await addImportingUserAsEditor(admin, group.id, input.importingUserId);

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

  const newRoster = (insertedPlayers ?? []) as GlobalPlayerRow[];
  const newGroupLabelById = await fetchPublicPlayerLabels(
    admin,
    newRoster.map((player) => player.id),
  );
  const groupName = buildPublicGroupLabel(
    newRoster.map(
      (player) => newGroupLabelById.get(player.id)?.publicName ?? 'Player',
    ),
  );
  const { error: renameGroupError } = await admin
    .from('groups')
    .update({ name: groupName })
    .eq('id', group.id);

  if (renameGroupError) {
    throw renameGroupError;
  }

  return {
    createdNewGroup: true,
    createdProfileNames: participantIdentities
      .filter((participant) => !participant.linkedUserId)
      .map((participant) => participant.displayName),
    groupId: group.id,
    groupName,
    selectedPlayerIds: selectImportPlayerIds(
      participantIdentities,
      newRoster,
    ),
  };
}
