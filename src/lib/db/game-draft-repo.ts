import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FinalizedGamePayload } from '@/features/games/finalize-game';
import { logGameDraftSchema, type LogGameDraftInput } from '@/lib/validation/log-game';
import { getServerEnv } from '@/lib/env';
import { personLabel } from '@/lib/people/person-label';
import {
  ATTRIBUTABLE_PLACEMENT_ACTIONS,
  buildTileActorIndex,
  resolveTileEventAttributions,
  type StoredPlayerIdentityResolution,
} from '@/lib/imports/resolve-tile-event-attribution';
import { fetchPublicPlayerLabels } from './player-label-resolution';
import { refreshGameMechanicCaptureForFinalizedGame } from './game-mechanic-capture-repo';

type SavedGameStatus = 'draft' | 'finalized';

// How far back getSavedGameForm will look for a revision that still parses as a
// draft form.
const RECENT_REVISION_SCAN_LIMIT = 20;

type SavedGameRow = {
  group_id: string;
  id: string;
  player_count: number;
  played_on: string;
  status: SavedGameStatus;
  updated_at: string;
};

type GameRevisionRow = {
  created_at: string;
  game_id: string;
  snapshot: unknown;
};

type GamePlayerRosterRow = {
  game_id: string;
  player_id: string;
};

type LegacyImportEvidenceRow = {
  screenshot_object_path: string | null;
};

type ScreenshotImportEvidenceRow = {
  storage_object_path: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shown in place of a roster entry that is an id we could not resolve to a
 * player. A raw id is never a name: rendering one leaks a uuid into the UI,
 * which is exactly what happened to games whose snapshot ids were orphaned by a
 * later roster merge.
 */
export const UNKNOWN_SAVED_GAME_PLAYER_LABEL = 'Unknown player';

function extractSelectedPlayerIds(snapshot: unknown) {
  if (
    snapshot &&
    typeof snapshot === 'object' &&
    'selectedPlayerIds' in snapshot &&
    Array.isArray(snapshot.selectedPlayerIds)
  ) {
    return snapshot.selectedPlayerIds.filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
  }

  return [];
}

/**
 * The roster to label a saved game by.
 *
 * A finalized game carries its authoritative roster in `game_players`. The
 * revision snapshot is a frozen artifact: its ids go stale the moment roster
 * rows are merged away underneath it — an import's guest placeholders being
 * replaced by the real players, say — and a stale id resolves to nothing.
 * So prefer the live roster, keeping the snapshot's ordering wherever the two
 * still agree so healthy games list exactly as before.
 *
 * A draft has no `game_players` rows yet, and its snapshot may legitimately
 * hold typed names for players who do not exist yet, so it keeps the snapshot.
 */
function resolveRosterEntries(
  snapshotEntries: string[],
  gamePlayerIds: string[],
) {
  if (gamePlayerIds.length === 0) {
    return snapshotEntries;
  }

  const liveRoster = new Set(gamePlayerIds);
  const ordered = snapshotEntries.filter((entry) => liveRoster.has(entry));
  const listed = new Set(ordered);

  return [...ordered, ...gamePlayerIds.filter((id) => !listed.has(id))];
}

/**
 * Label one roster entry. Entries are usually `players.id`, but a draft
 * snapshot can also hold a name typed before the player row existed, which is
 * still shown by first name only.
 */
function labelRosterEntry(entry: string, labelByPlayerId: Map<string, string>) {
  const resolved = labelByPlayerId.get(entry);
  if (resolved) {
    return resolved;
  }

  return UUID_PATTERN.test(entry)
    ? UNKNOWN_SAVED_GAME_PLAYER_LABEL
    : personLabel({ displayName: entry });
}

export type SavedGameFormResult = {
  form: LogGameDraftInput;
  status: SavedGameStatus;
};

export type SavedGameListItem = {
  gameId: string;
  groupId: string;
  status: SavedGameStatus;
  playedOn: string;
  updatedAt: string;
  playerCount: number;
  playerNames: string[];
};

async function resolvePromoSetIds(slugs: string[]) {
  if (slugs.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('promo_sets')
    .select('id')
    .in('slug', slugs);

  if (error) {
    throw error;
  }

  return data.map((promoSet) => promoSet.id);
}

async function syncGameSetupRelations(
  gameId: string,
  promoSetSlugs: string[],
) {
  const supabase = await createSupabaseServerClient();
  const promoSetIds = await resolvePromoSetIds(promoSetSlugs);

  const { error: deletePromoError } = await supabase
    .from('game_promo_sets')
    .delete()
    .eq('game_id', gameId);

  if (deletePromoError) {
    throw deletePromoError;
  }

  if (promoSetIds.length > 0) {
    const { error: insertPromoError } = await supabase
      .from('game_promo_sets')
      .insert(
        promoSetIds.map((promoSetId) => ({
          game_id: gameId,
          promo_set_id: promoSetId,
        })),
      );

    if (insertPromoError) {
      throw insertPromoError;
    }
  }
}

async function upsertGameShell(payload: {
  form: LogGameDraftInput;
  userId: string;
  status: 'draft' | 'finalized';
  catalogSnapshotId?: string | null;
}) {
  const parsed = logGameDraftSchema.parse(payload.form);
  const supabase = await createSupabaseServerClient();

  if (parsed.gameId) {
    const { data, error } = await supabase
      .from('games')
      .update({
        played_on: parsed.playedOn,
        map_id: parsed.mapId,
        player_count: parsed.playerCount,
        generation_count: parsed.generationCount,
        notes: parsed.notes,
        status: payload.status,
        updated_by_user_id: payload.userId,
        catalog_snapshot_id:
          payload.status === 'finalized' ? payload.catalogSnapshotId ?? null : null,
        finalized_at:
          payload.status === 'finalized' ? new Date().toISOString() : null,
        finalized_by_user_id:
          payload.status === 'finalized' ? payload.userId : null,
      })
      .eq('id', parsed.gameId)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    await syncGameSetupRelations(data.id, parsed.promoSetSlugs);

    return data.id;
  }

  const { data, error } = await supabase
    .from('games')
    .insert({
      group_id: parsed.groupId,
      played_on: parsed.playedOn,
      map_id: parsed.mapId,
      player_count: parsed.playerCount,
      generation_count: parsed.generationCount,
      notes: parsed.notes,
      created_by_user_id: payload.userId,
      updated_by_user_id: payload.userId,
      status: payload.status,
      catalog_snapshot_id:
        payload.status === 'finalized' ? payload.catalogSnapshotId ?? null : null,
      finalized_at:
        payload.status === 'finalized' ? new Date().toISOString() : null,
      finalized_by_user_id:
        payload.status === 'finalized' ? payload.userId : null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  await syncGameSetupRelations(data.id, parsed.promoSetSlugs);

  return data.id;
}

async function saveGameRevision(
  gameId: string,
  editorUserId: string,
  payload: Record<string, unknown>,
  revisionNote: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('game_revisions').insert({
    game_id: gameId,
    editor_user_id: editorUserId,
    revision_note: revisionNote,
    snapshot: payload,
  });

  if (error) {
    throw error;
  }
}

async function resolveStyleDefinitionIds(styleCodes: string[]) {
  if (styleCodes.length === 0) {
    return new Map<string, string>();
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('style_definitions')
    .select('id, code')
    .in('code', styleCodes);

  if (error) {
    throw error;
  }

  return new Map(data.map((style) => [style.code, style.id]));
}

export async function saveDraftGame(payload: {
  form: LogGameDraftInput;
  userId: string;
}) {
  const parsed = logGameDraftSchema.parse(payload.form);
  const gameId = await upsertGameShell({
    form: parsed,
    userId: payload.userId,
    status: 'draft',
  });

  await saveGameRevision(
    gameId,
    payload.userId,
    { ...parsed, gameId },
    'Draft autosave',
  );

  return { gameId };
}

export async function getDraftGameForm(payload: {
  gameId: string;
  groupId: string;
}): Promise<LogGameDraftInput | null> {
  const savedGame = await getSavedGameForm(payload);

  if (!savedGame || savedGame.status !== 'draft') {
    return null;
  }

  return savedGame.form;
}

export async function getSavedGameForm(payload: {
  gameId: string;
  groupId: string;
}): Promise<SavedGameFormResult | null> {
  const supabase = await createSupabaseServerClient();
  const { data: savedGame, error: savedGameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('id', payload.gameId)
    .eq('group_id', payload.groupId)
    .maybeSingle();

  if (savedGameError) {
    throw savedGameError;
  }

  if (!savedGame) {
    return null;
  }

  const { data: revisions, error: revisionsError } = await supabase
    .from('game_revisions')
    .select('snapshot')
    .eq('game_id', payload.gameId)
    .order('created_at', { ascending: false })
    .limit(RECENT_REVISION_SCAN_LIMIT);

  if (revisionsError) {
    throw revisionsError;
  }

  // Finalize revisions written before finalizeGameLog started recording the
  // whole draft form only carry the scored payload (players, awards, ...), so
  // they cannot be parsed back into a form. Fall back to the newest revision
  // that still round-trips instead of throwing and 500-ing the review page.
  for (const revision of revisions ?? []) {
    const parsedForm = logGameDraftSchema.safeParse(revision.snapshot);

    if (parsedForm.success) {
      return {
        form: parsedForm.data,
        status: savedGame.status as SavedGameStatus,
      };
    }
  }

  return null;
}

export async function listSavedGames(payload: {
  groupId?: string;
  groupIds?: string[];
  limit?: number;
}): Promise<SavedGameListItem[]> {
  const groupIds = [
    ...new Set(
      (payload.groupIds ?? (payload.groupId ? [payload.groupId] : []))
        .map((groupId) => groupId.trim())
        .filter(Boolean),
    ),
  ];

  if (groupIds.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const gamesQuery = supabase
    .from('games')
    .select('id, group_id, player_count, played_on, status, updated_at');
  const scopedGamesQuery =
    groupIds.length === 1
      ? gamesQuery.eq('group_id', groupIds[0])
      : gamesQuery.in('group_id', groupIds);
  const { data: games, error: gamesError } = await scopedGamesQuery
    .order('updated_at', { ascending: false })
    .limit(payload.limit ?? 12);

  if (gamesError) {
    throw gamesError;
  }

  const savedGames = (games ?? []) as SavedGameRow[];

  if (savedGames.length === 0) {
    return [];
  }

  const gameIds = savedGames.map((game) => game.id);
  const { data: revisions, error: revisionsError } = await supabase
    .from('game_revisions')
    .select('created_at, game_id, snapshot')
    .in('game_id', gameIds)
    .order('created_at', { ascending: false });

  if (revisionsError) {
    throw revisionsError;
  }

  const { data: gamePlayers, error: gamePlayersError } = await supabase
    .from('game_players')
    .select('game_id, player_id')
    .in('game_id', gameIds)
    .order('placement', { ascending: true, nullsFirst: false });

  if (gamePlayersError) {
    throw gamePlayersError;
  }

  const latestRevisionByGameId = new Map<string, GameRevisionRow>();

  for (const revision of ((revisions ?? []) as GameRevisionRow[])) {
    if (!latestRevisionByGameId.has(revision.game_id)) {
      latestRevisionByGameId.set(revision.game_id, revision);
    }
  }

  const gamePlayerIdsByGameId = new Map<string, string[]>();

  for (const gamePlayer of ((gamePlayers ?? []) as GamePlayerRosterRow[])) {
    if (!gamePlayer.player_id) {
      continue;
    }

    const roster = gamePlayerIdsByGameId.get(gamePlayer.game_id) ?? [];
    roster.push(gamePlayer.player_id);
    gamePlayerIdsByGameId.set(gamePlayer.game_id, roster);
  }

  const rosterEntriesByGameId = new Map(
    savedGames.map((game) => {
      const revision = latestRevisionByGameId.get(game.id);

      return [
        game.id,
        resolveRosterEntries(
          revision ? extractSelectedPlayerIds(revision.snapshot) : [],
          gamePlayerIdsByGameId.get(game.id) ?? [],
        ),
      ] as const;
    }),
  );

  // Label from the roster itself rather than the group's player list: a roster
  // can name a player the group scope would miss, and `get_public_player_names`
  // already refuses ids the caller may not read.
  const playerLabelById = await fetchPublicPlayerLabels(
    supabase,
    [...rosterEntriesByGameId.values()]
      .flat()
      .filter((entry) => UUID_PATTERN.test(entry)),
  );
  const playerNameById = new Map(
    [...playerLabelById].map(([playerId, label]) => [
      playerId,
      label.publicName,
    ]),
  );

  return savedGames.map((game) => ({
    gameId: game.id,
    groupId: game.group_id,
    playerCount: game.player_count,
    playerNames: (rosterEntriesByGameId.get(game.id) ?? []).map((entry) =>
      labelRosterEntry(entry, playerNameById),
    ),
    playedOn: game.played_on,
    status: game.status,
    updatedAt: game.updated_at,
  }));
}

function normalizeEvidencePaths(paths: Array<string | null | undefined>) {
  return [
    ...new Set(
      paths
        .map((path) => (typeof path === 'string' ? path.trim() : ''))
        .filter((path) => path.length > 0),
    ),
  ];
}

function isMissingSplitScreenshotTableError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code =
    'code' in error && typeof error.code === 'string' ? error.code : null;
  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : null;

  return (
    code === 'PGRST205' &&
    message?.includes('game_result_screenshot_imports') === true
  );
}

export async function deleteSavedGame(payload: {
  gameId: string;
  groupId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: savedGame, error: savedGameError } = await supabase
    .from('games')
    .select('id')
    .eq('id', payload.gameId)
    .eq('group_id', payload.groupId)
    .maybeSingle();

  if (savedGameError) {
    throw savedGameError;
  }

  if (!savedGame) {
    throw new Error('Saved game not found or you do not have permission to delete it.');
  }

  const [
    { data: legacyImportRows, error: legacyImportError },
    { data: screenshotImportRows, error: screenshotImportError },
  ] = await Promise.all([
    supabase
      .from('game_log_imports')
      .select('screenshot_object_path')
      .eq('game_id', payload.gameId),
    supabase
      .from('game_result_screenshot_imports')
      .select('storage_object_path')
      .eq('game_id', payload.gameId),
  ]);

  if (legacyImportError) {
    throw legacyImportError;
  }

  if (
    screenshotImportError &&
    !isMissingSplitScreenshotTableError(screenshotImportError)
  ) {
    throw screenshotImportError;
  }

  const evidencePaths = normalizeEvidencePaths([
    ...((legacyImportRows ?? []) as LegacyImportEvidenceRow[]).map(
      (row) => row.screenshot_object_path,
    ),
    ...(screenshotImportError
      ? []
      : ((screenshotImportRows ?? []) as ScreenshotImportEvidenceRow[]).map(
          (row) => row.storage_object_path,
        )),
  ]);

  if (evidencePaths.length > 0) {
    const { SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE } = getServerEnv();
    const { error: removeEvidenceError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE)
      .remove(evidencePaths);

    if (removeEvidenceError) {
      throw removeEvidenceError;
    }
  }

  const { data: deletedGame, error: deleteGameError } = await supabase
    .from('games')
    .delete()
    .eq('id', payload.gameId)
    .eq('group_id', payload.groupId)
    .select('id')
    .maybeSingle();

  if (deleteGameError) {
    throw deleteGameError;
  }

  if (!deletedGame) {
    throw new Error('Saved game not found or you do not have permission to delete it.');
  }

  return { gameId: deletedGame.id as string };
}

export async function reopenSavedGame(payload: {
  gameId: string;
  groupId: string;
  userId: string;
}) {
  const supabase = await createSupabaseServerClient();
  // Clear the finalized bookkeeping so the game looks exactly like a draft that
  // was never finalized. The scored game_players rows stay put: they are
  // rewritten when the game is finalized again, and analytics.player_game_results
  // only reads finalized games, so a reopened game leaves the stats immediately.
  const { data: reopenedGame, error: reopenError } = await supabase
    .from('games')
    .update({
      status: 'draft',
      updated_by_user_id: payload.userId,
      catalog_snapshot_id: null,
      finalized_at: null,
      finalized_by_user_id: null,
    })
    .eq('id', payload.gameId)
    .eq('group_id', payload.groupId)
    .eq('status', 'finalized')
    .select('id')
    .maybeSingle();

  if (reopenError) {
    throw reopenError;
  }

  if (!reopenedGame) {
    throw new Error(
      'Finalized game not found or you do not have permission to reopen it.',
    );
  }

  return { gameId: reopenedGame.id as string };
}

/**
 * Imported placement events are persisted while the game is still a draft,
 * when its `game_players` rows do not exist yet, so they are written with null
 * `player_id` / `game_player_id`. Finalization is the first moment the
 * same-game participant map exists, so it is where attribution is resolved.
 *
 * Only exact evidence is used: the import's own recorded identity resolutions
 * (`confidence_summary.player_identity_resolutions`), matched to the actor
 * text the parser preserved in the event payload. An actor that is unresolved,
 * ambiguous, or not a participant of this game stays unattributed —
 * attribution is never inferred from neighbouring events, approximate names,
 * ordering, or the game owner.
 *
 * The predicate is `game_player_id is null` on both the read and the write:
 * a plain retry writes nothing, and a re-finalize — which deletes and
 * re-inserts `game_players`, nulling `game_player_id` on attributed rows via
 * its `on delete set null` FK — re-resolves those rows against the fresh
 * participant map from the same stored evidence.
 */
async function attributeImportedPlacementEvents(
  gameId: string,
  gamePlayerIdByPlayerId: ReadonlyMap<string, string>,
) {
  const supabase = await createSupabaseServerClient();

  const { data: imports, error: importsError } = await supabase
    .from('game_log_imports')
    .select('id, confidence_summary')
    .eq('game_id', gameId);

  if (importsError) {
    throw importsError;
  }

  let attributed = 0;

  for (const importRow of imports ?? []) {
    const confidenceSummary = (importRow.confidence_summary ?? {}) as {
      player_identity_resolutions?: StoredPlayerIdentityResolution[];
    };
    const actorIndex = buildTileActorIndex(
      confidenceSummary.player_identity_resolutions ?? [],
    );

    if (actorIndex.size === 0) {
      continue;
    }

    const { data: events, error: eventsError } = await supabase
      .from('game_log_events')
      .select('id, payload')
      .eq('game_log_import_id', importRow.id)
      .in('placement_action', [...ATTRIBUTABLE_PLACEMENT_ACTIONS])
      .is('game_player_id', null);

    if (eventsError) {
      throw eventsError;
    }

    const attributions = resolveTileEventAttributions({
      actorIndex,
      events: (events ?? []).map((event) => ({
        actorText:
          (event.payload as { actor?: string | null } | null)?.actor ?? null,
        eventId: event.id as string,
      })),
      gamePlayerIdByPlayerId,
    });

    for (const attribution of attributions) {
      const { error: updateError } = await supabase
        .from('game_log_events')
        .update({
          game_player_id: attribution.gamePlayerId,
          player_id: attribution.playerId,
        })
        .eq('id', attribution.eventId)
        .is('game_player_id', null);

      if (updateError) {
        throw updateError;
      }

      attributed += 1;
    }
  }

  return { attributed };
}

export async function finalizeGameLog(payload: {
  form: LogGameDraftInput;
  finalizedPayload: FinalizedGamePayload;
  userId: string;
}) {
  const parsed = logGameDraftSchema.parse(payload.form);
  const supabase = await createSupabaseServerClient();
  const gameId = await upsertGameShell({
    form: parsed,
    userId: payload.userId,
    status: 'finalized',
    catalogSnapshotId: payload.finalizedPayload.gameUpdate.catalog_snapshot_id,
  });

  const { error: deletePlayersError } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', gameId);

  if (deletePlayersError) {
    throw deletePlayersError;
  }

  const { data: insertedPlayers, error: insertPlayersError } = await supabase
    .from('game_players')
    .insert(
      payload.finalizedPayload.players.map((player) => ({
        game_id: gameId,
        player_id: player.playerId,
        corporation_id: player.corporationId,
        placement: player.placement,
        is_winner: player.isWinner,
        total_points: player.totalPoints,
        final_megacredits: player.finalMegacredits,
        cities_points: player.citiesPoints,
        greenery_points: player.greeneryPoints,
        card_points_total: player.cardPointsTotal,
        card_points_microbes: player.cardPointsMicrobes,
        card_points_animals: player.cardPointsAnimals,
        card_points_jovian: player.cardPointsJovian,
        tr_points: player.trPoints,
        milestone_points: player.milestonePoints,
        award_points: player.awardPoints,
        other_card_points: player.otherCardPoints,
      })),
    )
    .select('id, player_id');

  if (insertPlayersError) {
    throw insertPlayersError;
  }

  const gamePlayerIdByPlayerId = new Map(
    insertedPlayers.map((player) => [player.player_id, player.id]),
  );

  const corporationRows = payload.finalizedPayload.corporations
    .map((row) => ({
      game_player_id: gamePlayerIdByPlayerId.get(row.playerId),
      corporation_id: row.corporationId,
    }))
    .filter((row) => row.game_player_id);

  if (corporationRows.length > 0) {
    const { error: corporationError } = await supabase
      .from('game_player_corporations')
      .insert(corporationRows);

    if (corporationError) {
      throw corporationError;
    }
  }

  const preludeRows = payload.finalizedPayload.preludes
    .map((row) => ({
      game_player_id: gamePlayerIdByPlayerId.get(row.playerId),
      prelude_id: row.preludeId,
    }))
    .filter((row) => row.game_player_id);

  if (preludeRows.length > 0) {
    const { error: preludeError } = await supabase
      .from('game_player_preludes')
      .insert(preludeRows);

    if (preludeError) {
      throw preludeError;
    }
  }

  const midgamePreludeRows = payload.finalizedPayload.midgamePreludes
    .map((row) => ({
      game_player_id: gamePlayerIdByPlayerId.get(row.playerId),
      prelude_id: row.preludeId,
    }))
    .filter((row) => row.game_player_id);

  if (midgamePreludeRows.length > 0) {
    const { error: midgamePreludeError } = await supabase
      .from('game_player_midgame_preludes')
      .insert(midgamePreludeRows);

    if (midgamePreludeError) {
      throw midgamePreludeError;
    }
  }

  const milestoneRows = payload.finalizedPayload.milestones
    .map((row) => ({
      game_id: gameId,
      milestone_id: row.milestoneId,
      winner_game_player_id: gamePlayerIdByPlayerId.get(row.winnerPlayerId),
    }))
    .filter((row) => row.winner_game_player_id);

  if (milestoneRows.length > 0) {
    const { error: milestoneError } = await supabase
      .from('game_milestones')
      .insert(milestoneRows);

    if (milestoneError) {
      throw milestoneError;
    }
  }

  const awardRows = payload.finalizedPayload.awards
    .map((row) => ({
      game_id: gameId,
      award_id: row.awardId,
      funded_by_game_player_id: gamePlayerIdByPlayerId.get(row.fundedByPlayerId),
      place: row.place,
      winner_game_player_id: gamePlayerIdByPlayerId.get(row.winnerPlayerId),
    }))
    .filter((row) => row.funded_by_game_player_id && row.winner_game_player_id);

  if (awardRows.length > 0) {
    const { error: awardError } = await supabase
      .from('game_awards')
      .insert(awardRows);

    if (awardError) {
      throw awardError;
    }
  }

  const styleIdByCode = await resolveStyleDefinitionIds([
    ...new Set([
      ...payload.finalizedPayload.declaredStyles.map((style) => style.styleCode),
      ...payload.finalizedPayload.inferredStyles.map((style) => style.styleCode),
    ]),
  ]);

  const declaredStyleRows = payload.finalizedPayload.declaredStyles
    .map((row) => ({
      game_player_id: gamePlayerIdByPlayerId.get(row.playerId),
      style_definition_id: styleIdByCode.get(row.styleCode),
      is_primary: row.isPrimary,
    }))
    .filter((row) => row.game_player_id && row.style_definition_id);

  if (declaredStyleRows.length > 0) {
    const { error: declaredStyleError } = await supabase
      .from('game_player_declared_styles')
      .insert(declaredStyleRows);

    if (declaredStyleError) {
      throw declaredStyleError;
    }
  }

  const inferredStyleRows = payload.finalizedPayload.inferredStyles
    .map((row) => ({
      game_player_id: gamePlayerIdByPlayerId.get(row.playerId),
      style_definition_id: styleIdByCode.get(row.styleCode),
      is_primary: row.isPrimary,
      confidence: row.confidence,
    }))
    .filter((row) => row.game_player_id && row.style_definition_id);

  if (inferredStyleRows.length > 0) {
    const { error: inferredStyleError } = await supabase
      .from('game_player_inferred_styles')
      .insert(inferredStyleRows);

    if (inferredStyleError) {
      throw inferredStyleError;
    }
  }

  const keyCardRows = payload.finalizedPayload.keyCards
    .map((row) => ({
      game_player_id: gamePlayerIdByPlayerId.get(row.playerId),
      card_id: row.cardId,
    }))
    .filter((row) => row.game_player_id);

  if (keyCardRows.length > 0) {
    const { error: keyCardError } = await supabase
      .from('game_player_key_cards')
      .insert(keyCardRows);

    if (keyCardError) {
      throw keyCardError;
    }
  }

  // The finalized payload alone is not a draft form -- it has no mapId,
  // playedOn, playerCount, generationCount or groupId -- so a revision holding
  // only that cannot be loaded back into the wizard. Merge the parsed form over
  // it so the snapshot stays a superset: the scored payload for auditing, and a
  // form that getSavedGameForm can reopen.
  await saveGameRevision(
    gameId,
    payload.userId,
    { ...payload.finalizedPayload.revision.snapshot, ...parsed, gameId },
    payload.finalizedPayload.revision.note,
  );

  // Attribute imported placement events from the participant rows inserted
  // above, before the capture refresh, so downstream readers see the resolved
  // per-player placements rather than the unattributed draft state.
  await attributeImportedPlacementEvents(gameId, gamePlayerIdByPlayerId);

  // Capture is a hidden, additive fact store; a failure here must never block
  // finalizing a game. It resolves stable participant ids and can be re-run.
  try {
    await refreshGameMechanicCaptureForFinalizedGame(gameId);
  } catch (error) {
    console.warn(
      'Finalized game capture (v2) did not complete; capture can be re-run.',
      error,
    );
  }

  return { gameId };
}
