import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FinalizedGamePayload } from '@/features/games/finalize-game';
import { logGameDraftSchema, type LogGameDraftInput } from '@/lib/validation/log-game';
import { getServerEnv } from '@/lib/env';
import { personLabel } from '@/lib/people/person-label';
import { resolvePlayerLabelsInRows } from './player-label-resolution';

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

type PlayerNameRow = {
  display_name: string;
  id: string;
};

type LegacyImportEvidenceRow = {
  screenshot_object_path: string | null;
};

type ScreenshotImportEvidenceRow = {
  storage_object_path: string | null;
};

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

async function resolveExpansionIds(codes: string[]) {
  if (codes.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('expansions')
    .select('id')
    .in('code', codes);

  if (error) {
    throw error;
  }

  return data.map((expansion) => expansion.id);
}

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
  expansionCodes: string[],
  promoSetSlugs: string[],
) {
  const supabase = await createSupabaseServerClient();
  const [expansionIds, promoSetIds] = await Promise.all([
    resolveExpansionIds(expansionCodes),
    resolvePromoSetIds(promoSetSlugs),
  ]);

  const { error: deleteExpansionError } = await supabase
    .from('game_expansions')
    .delete()
    .eq('game_id', gameId);

  if (deleteExpansionError) {
    throw deleteExpansionError;
  }

  const { error: deletePromoError } = await supabase
    .from('game_promo_sets')
    .delete()
    .eq('game_id', gameId);

  if (deletePromoError) {
    throw deletePromoError;
  }

  if (expansionIds.length > 0) {
    const { error: insertExpansionError } = await supabase
      .from('game_expansions')
      .insert(
        expansionIds.map((expansionId) => ({
          game_id: gameId,
          expansion_id: expansionId,
        })),
      );

    if (insertExpansionError) {
      throw insertExpansionError;
    }
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

    await syncGameSetupRelations(
      data.id,
      parsed.expansionCodes,
      parsed.promoSetSlugs,
    );

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

  await syncGameSetupRelations(data.id, parsed.expansionCodes, parsed.promoSetSlugs);

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

  const playersQuery = supabase
    .from('players')
    .select('id, display_name');
  const { data: players, error: playersError } =
    groupIds.length === 1
      ? await playersQuery.eq('group_id', groupIds[0])
      : await playersQuery.in('group_id', groupIds);

  if (playersError) {
    throw playersError;
  }

  const latestRevisionByGameId = new Map<string, GameRevisionRow>();

  for (const revision of ((revisions ?? []) as GameRevisionRow[])) {
    if (!latestRevisionByGameId.has(revision.game_id)) {
      latestRevisionByGameId.set(revision.game_id, revision);
    }
  }

  const labeledPlayers = await resolvePlayerLabelsInRows(
    supabase,
    (players ?? []) as PlayerNameRow[],
    [['id', 'display_name']],
  );
  const playerNameById = new Map(
    labeledPlayers.map((player) => [player.id, player.display_name]),
  );

  return savedGames.map((game) => {
    const revision = latestRevisionByGameId.get(game.id);
    const selectedPlayerIds = revision
      ? extractSelectedPlayerIds(revision.snapshot)
      : [];

    return {
      gameId: game.id,
      groupId: game.group_id,
      playerCount: game.player_count,
      playerNames: selectedPlayerIds.map(
        (playerId) =>
          playerNameById.get(playerId) ?? personLabel({ displayName: playerId }),
      ),
      playedOn: game.played_on,
      status: game.status,
      updatedAt: game.updated_at,
    };
  });
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

  return { gameId };
}
