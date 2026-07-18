import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import {
  parseGameCapture,
  type ObjectiveMapIndex,
} from '@/lib/imports/capture/parse-game-capture';
import { computeSourceDigest } from '@/lib/imports/capture/source-hash';
import {
  CAPTURE_PARSER_VERSION,
  type BoardPlacement,
  type CanonicalEvent,
  type GameCaptureResult,
  type PreAttributionStatus,
} from '@/lib/imports/capture/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const CAPTURE_WORKFLOW_VERSION = 'web-import-capture-v2';

type RawGamePlayerRow = {
  id: string;
  player_id: string | null;
  players: { display_name: string } | Array<{ display_name: string }> | null;
};

type RawImmutableSourceRow = {
  original_source_text: string;
};

type RawGameLogImportRow = {
  id: string;
  raw_log_text: string | null;
};

type ResolvedAttribution = {
  attributionStatus: PreAttributionStatus | 'explicit_stable';
  gamePlayerId: string | null;
  playerId: string | null;
};

type ParticipantIndex = {
  gamePlayerIdByPlayerId: Map<string, string>;
  playerIdByNormalizedName: Map<string, string>;
};

const EMPTY_PARTICIPANTS: ParticipantIndex = {
  gamePlayerIdByPlayerId: new Map(),
  playerIdByNormalizedName: new Map(),
};

function getPlayerDisplayName(row: RawGamePlayerRow) {
  if (!row.players) {
    return null;
  }
  return Array.isArray(row.players)
    ? row.players[0]?.display_name
    : row.players.display_name;
}

async function loadParticipantIndex(gameId: string): Promise<ParticipantIndex> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_players')
    .select('id, player_id, players!inner(display_name)')
    .eq('game_id', gameId);

  if (error) {
    throw error;
  }

  const playerIdByNormalizedName = new Map<string, string>();
  const gamePlayerIdByPlayerId = new Map<string, string>();

  for (const row of (data ?? []) as RawGamePlayerRow[]) {
    if (row.player_id) {
      gamePlayerIdByPlayerId.set(row.player_id, row.id);
      const displayName = getPlayerDisplayName(row);
      if (displayName) {
        playerIdByNormalizedName.set(normalizePlayerAlias(displayName), row.player_id);
      }
    }
  }

  return { gamePlayerIdByPlayerId, playerIdByNormalizedName };
}

function resolveAttribution(
  event: Pick<CanonicalEvent, 'attributionStatus' | 'sourcePlayerName'>,
  participants: ParticipantIndex,
): ResolvedAttribution {
  if (event.attributionStatus !== 'explicit_unresolved') {
    return {
      attributionStatus: event.attributionStatus,
      gamePlayerId: null,
      playerId: null,
    };
  }

  const playerId = event.sourcePlayerName
    ? participants.playerIdByNormalizedName.get(normalizePlayerAlias(event.sourcePlayerName))
    : undefined;

  if (!playerId) {
    return {
      attributionStatus: 'explicit_unresolved',
      gamePlayerId: null,
      playerId: null,
    };
  }

  return {
    attributionStatus: 'explicit_stable',
    gamePlayerId: participants.gamePlayerIdByPlayerId.get(playerId) ?? null,
    playerId,
  };
}

function buildEventPayload(event: CanonicalEvent, participants: ParticipantIndex) {
  const resolved = resolveAttribution(event, participants);
  return {
    amount: event.amount,
    attribution_status: resolved.attributionStatus,
    canonical_entity_id: event.canonicalEntityId,
    confidence: event.confidence,
    coverage_state: event.coverageState,
    detail: event.detail,
    event_category: event.eventCategory,
    event_sequence: event.eventSequence,
    event_type: event.eventType,
    event_uid: event.eventUid,
    game_player_id: resolved.gamePlayerId,
    generation_number: event.generationNumber,
    normalized_text: event.normalizedText,
    parameter_type: event.parameterType,
    player_id: resolved.playerId,
    provenance: event.provenance,
    source_line_number: event.sourceLineNumber,
    source_text: event.sourceText,
    value_after: event.valueAfter,
    value_before: event.valueBefore,
  };
}

function buildPlacementPayload(placement: BoardPlacement, participants: ParticipantIndex) {
  const resolved = resolveAttribution(placement, participants);
  return {
    attribution_status: resolved.attributionStatus,
    board_position: placement.boardPosition,
    board_row: placement.boardRow,
    canonical_board_space_id: placement.canonicalBoardSpaceId,
    confidence: placement.confidence,
    event_sequence: placement.eventSequence,
    event_uid: placement.eventUid,
    game_player_id: resolved.gamePlayerId,
    generation_number: placement.generationNumber,
    map_code: placement.mapCode,
    ownership_state: placement.ownershipState,
    placement_action: placement.placementAction,
    placement_uid: placement.placementUid,
    player_id: resolved.playerId,
    provenance: placement.provenance,
    raw_actor_text: placement.rawActorText,
    raw_evidence: placement.rawEvidence,
    source_card_or_action: placement.sourceCardOrAction,
    upstream_numeric_space_id: placement.upstreamNumericSpaceId,
    tile_type: placement.tileType,
  };
}

function buildCapturePayload(input: {
  digest: { byteLength: number; sha256: string };
  originalSourceText: string;
  parsed: GameCaptureResult;
  participants: ParticipantIndex;
  provenance: string;
  sourceRoute: string;
}) {
  const events = input.parsed.events.map((event) =>
    buildEventPayload(event, input.participants),
  );
  const unresolvedPlayers = events.filter(
    (event) => event.attribution_status === 'explicit_unresolved',
  ).length;

  return {
    colonies_state: input.parsed.colonies.state,
    coverage: {
      ...input.parsed.coverage,
      unresolvedPlayers,
    },
    coverage_state: input.parsed.coverage.overallState,
    events,
    final_venus_scale: input.parsed.venus.finalVenusScale,
    map_detection: {
      candidate_map_codes: input.parsed.mapDetection.candidateMapCodes,
      confidence: input.parsed.mapDetection.confidence,
      conflict_state: input.parsed.mapDetection.conflictState,
      detected_map_code: input.parsed.mapDetection.detectedMapCode,
      detection_state: input.parsed.mapDetection.detectionState,
      exported_map_value: input.parsed.mapDetection.exportedMapValue,
      objective_evidence: input.parsed.mapDetection.objectiveEvidence,
      ocean_evidence: input.parsed.mapDetection.oceanEvidence,
      provenance: input.parsed.mapDetection.provenance,
      randomized_objectives: input.parsed.mapDetection.randomizedObjectives,
      unsupported_map: input.parsed.mapDetection.unsupportedMap,
    },
    parser_version: input.parsed.parserVersion,
    placements: input.parsed.placements.map((placement) =>
      buildPlacementPayload(placement, input.participants),
    ),
    provenance: input.provenance,
    source: {
      byte_length: input.digest.byteLength,
      format: input.parsed.sourceFormat,
      route: input.sourceRoute,
      sha256: input.digest.sha256,
      text: input.originalSourceText,
    },
    unsupported: input.parsed.unsupported.map((entry) => ({
      normalized_pattern: entry.normalizedPattern,
      raw_evidence: entry.rawEvidence,
      reason: entry.reason,
      source_line_number: entry.sourceLineNumber,
    })),
    venus_state: input.parsed.venus.state,
    workflow_version: CAPTURE_WORKFLOW_VERSION,
  };
}

async function loadObjectiveMapIndex(): Promise<ObjectiveMapIndex | undefined> {
  try {
    const { listMapMilestones, listMapAwards } = await import('@/lib/db/reference-repo');
    const [milestones, awards] = await Promise.all([
      listMapMilestones(),
      listMapAwards(),
    ]);

    const milestoneToMapCodes = new Map<string, string[]>();
    for (const milestone of milestones) {
      const key = normalizePlayerAlias(milestone.milestoneName);
      milestoneToMapCodes.set(key, [
        ...(milestoneToMapCodes.get(key) ?? []),
        milestone.mapId,
      ]);
    }
    const awardToMapCodes = new Map<string, string[]>();
    for (const award of awards) {
      const key = normalizePlayerAlias(award.awardName);
      awardToMapCodes.set(key, [...(awardToMapCodes.get(key) ?? []), award.mapId]);
    }

    return { awardToMapCodes, milestoneToMapCodes };
  } catch {
    // Map detection degrades to exported-value/absent evidence when the
    // objective catalogue cannot be loaded. Never blocks capture.
    return undefined;
  }
}

async function loadCardIdByName(): Promise<Map<string, string> | undefined> {
  try {
    const { listCards } = await import('@/lib/db/reference-repo');
    const cards = await listCards();
    return new Map(cards.map((card) => [normalizePlayerAlias(card.cardName), card.id]));
  } catch {
    return undefined;
  }
}

/**
 * Capture v2. Parses the exact source, resolves stable player ids only against
 * exact game participants, and writes the immutable source, versioned parser
 * run, canonical envelope, board placements, map detection, coverage, and
 * game-level Venus/Colonies state atomically. The same source parsed twice
 * yields identical deterministic ids, so retries never accumulate rows.
 *
 * `rawLogText` must be the original, untrimmed export bytes.
 */
export async function captureGameMechanicsFromRawLog(input: {
  gameId: string;
  gameLogImportId: string;
  rawLogText: string;
  resolveParticipantIds?: boolean;
  sourceRoute?: string;
}) {
  const digest = await computeSourceDigest(input.rawLogText);
  const resolveParticipants = input.resolveParticipantIds !== false;

  const [participants, cardIdByName, objectiveMapIndex] = await Promise.all([
    resolveParticipants ? loadParticipantIndex(input.gameId) : Promise.resolve(EMPTY_PARTICIPANTS),
    resolveParticipants ? loadCardIdByName() : Promise.resolve(undefined),
    resolveParticipants ? loadObjectiveMapIndex() : Promise.resolve(undefined),
  ]);

  const parsed = parseGameCapture({
    cardIdByName,
    objectiveMapIndex,
    rawText: input.rawLogText,
    sourceSha256: digest.sha256,
  });

  const payload = buildCapturePayload({
    digest,
    originalSourceText: input.rawLogText,
    parsed,
    participants,
    provenance: 'parser_derived',
    sourceRoute: input.sourceRoute ?? 'manual_web_import',
  });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('replace_game_capture_v2', {
    p_capture: payload,
    p_game_id: input.gameId,
    p_game_log_import_id: input.gameLogImportId,
  });

  if (error) {
    throw error;
  }

  return { parsed, result: data };
}

async function loadImmutableSourceText(gameLogImportId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_capture_import_sources')
    .select('original_source_text')
    .eq('game_log_import_id', gameLogImportId)
    .maybeSingle();

  if (error) {
    // A missing immutable-source table/row is non-fatal; fall back to the
    // retained (trimmed) log so finalize capture still runs.
    return null;
  }

  return (data as RawImmutableSourceRow | null)?.original_source_text ?? null;
}

/**
 * Re-run capture for a finalized game so an explicit source name can resolve to
 * a stable participant id. Prefers the immutable original source bytes; falls
 * back to the retained log only when no immutable source was stored.
 */
export async function refreshGameMechanicCaptureForFinalizedGame(gameId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_log_imports')
    .select('id, raw_log_text')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const latestImport = data as RawGameLogImportRow | null;

  if (!latestImport) {
    return { parsed: null, result: null };
  }

  const immutableSourceText = await loadImmutableSourceText(latestImport.id);
  const rawLogText = immutableSourceText ?? latestImport.raw_log_text ?? '';

  return captureGameMechanicsFromRawLog({
    gameId,
    gameLogImportId: latestImport.id,
    rawLogText,
    resolveParticipantIds: true,
  });
}

export { CAPTURE_PARSER_VERSION };
