import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { FinalizedGamePayload } from '@/features/games/finalize-game';
import { logGameDraftSchema, type LogGameDraftInput } from '@/lib/validation/log-game';
import {
  resolveEditedMergerOfferRuleSnapshot,
  resolveNewMergerOfferRuleSnapshot,
  unknownMergerOfferRuleSnapshot,
} from '@/lib/merger/merger-rule-snapshot';
import { refreshGameMetricSnapshots } from './metric-refresh-repo';

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

  const requestedMergerRule = {
    guaranteedMergerOffer: parsed.guaranteedMergerOffer,
    source: parsed.mergerOfferRuleSource,
  };

  if (parsed.gameId) {
    const { data: existingGame, error: existingGameError } = await supabase
      .from('games')
      .select('guaranteed_merger_offer, guaranteed_merger_offer_source')
      .eq('id', parsed.gameId)
      .single();

    if (existingGameError) {
      throw existingGameError;
    }

    const mergerRule = resolveEditedMergerOfferRuleSnapshot({
      existing:
        existingGame.guaranteed_merger_offer_source === null
          ? unknownMergerOfferRuleSnapshot()
          : {
              guaranteedMergerOffer: existingGame.guaranteed_merger_offer,
              source: existingGame.guaranteed_merger_offer_source,
            },
      requested: requestedMergerRule,
    });

    const { data, error } = await supabase
      .from('games')
      .update({
        played_on: parsed.playedOn,
        map_id: parsed.mapId,
        player_count: parsed.playerCount,
        generation_count: parsed.generationCount,
        guaranteed_merger_offer: mergerRule.guaranteedMergerOffer,
        guaranteed_merger_offer_source: mergerRule.source,
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

  const { data: groupSettings, error: groupSettingsError } = await supabase
    .from('group_settings')
    .select('default_guaranteed_merger_offer')
    .eq('group_id', parsed.groupId)
    .maybeSingle();

  if (groupSettingsError) {
    throw groupSettingsError;
  }

  const mergerRule = resolveNewMergerOfferRuleSnapshot({
    groupDefaultGuaranteedMergerOffer:
      groupSettings?.default_guaranteed_merger_offer ?? true,
    requested: requestedMergerRule,
  });

  const { data, error } = await supabase
    .from('games')
    .insert({
      group_id: parsed.groupId,
      played_on: parsed.playedOn,
      map_id: parsed.mapId,
      player_count: parsed.playerCount,
      generation_count: parsed.generationCount,
      guaranteed_merger_offer: mergerRule.guaranteedMergerOffer,
      guaranteed_merger_offer_source: mergerRule.source,
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

  await saveGameRevision(gameId, payload.userId, parsed, 'Draft autosave');

  return { gameId };
}

export async function getDraftGameForm(payload: {
  gameId: string;
  groupId: string;
}): Promise<LogGameDraftInput | null> {
  const supabase = await createSupabaseServerClient();
  const { data: draftGame, error: draftGameError } = await supabase
    .from('games')
    .select('id, guaranteed_merger_offer, guaranteed_merger_offer_source')
    .eq('id', payload.gameId)
    .eq('group_id', payload.groupId)
    .eq('status', 'draft')
    .maybeSingle();

  if (draftGameError) {
    throw draftGameError;
  }

  if (!draftGame) {
    return null;
  }

  const { data: latestRevision, error: latestRevisionError } = await supabase
    .from('game_revisions')
    .select('snapshot')
    .eq('game_id', payload.gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRevisionError) {
    throw latestRevisionError;
  }

  if (!latestRevision?.snapshot) {
    return null;
  }

  return logGameDraftSchema.parse({
    ...(latestRevision.snapshot as Record<string, unknown>),
    guaranteedMergerOffer: draftGame.guaranteed_merger_offer,
    mergerOfferRuleSource:
      draftGame.guaranteed_merger_offer_source ?? 'unknown',
  });
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

  await saveGameRevision(
    gameId,
    payload.userId,
    payload.finalizedPayload.revision.snapshot,
    payload.finalizedPayload.revision.note,
  );

  await refreshGameMetricSnapshots(gameId);

  return { gameId };
}
