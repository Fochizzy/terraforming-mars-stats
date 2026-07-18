import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import {
  GAME_MECHANIC_PARSER_VERSION,
  parseImportedGameMechanics,
  type ParsedColonyEvent,
  type ParsedVenusEvent,
} from '@/lib/imports/parse-game-mechanics';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type RawGamePlayerRow = {
  player_id: string;
  players: { display_name: string } | Array<{ display_name: string }>;
};

type RawGameLogImportRow = {
  id: string;
  raw_log_text: string;
};

type AttributionStatus =
  | 'explicit_stable'
  | 'explicit_unresolved'
  | 'unattributed';

function getPlayerDisplayName(row: RawGamePlayerRow) {
  return Array.isArray(row.players)
    ? row.players[0]?.display_name
    : row.players.display_name;
}

async function listGamePlayerIdsByName(gameId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_players')
    .select('player_id, players!inner(display_name)')
    .eq('game_id', gameId);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as RawGamePlayerRow[])
      .map((row) => [getPlayerDisplayName(row), row.player_id] as const)
      .filter((row): row is [string, string] => Boolean(row[0]))
      .map(([displayName, playerId]) => [normalizePlayerAlias(displayName), playerId]),
  );
}

function resolveAttribution(
  sourcePlayerName: string | null,
  playerIdByNormalizedName: Map<string, string>,
) {
  if (!sourcePlayerName) {
    return {
      attributionStatus: 'unattributed' as const,
      playerId: null,
    };
  }

  const playerId = playerIdByNormalizedName.get(
    normalizePlayerAlias(sourcePlayerName),
  );

  return {
    attributionStatus: (playerId
      ? 'explicit_stable'
      : 'explicit_unresolved') as AttributionStatus,
    playerId: playerId ?? null,
  };
}

function buildVenusEventPayload(
  event: ParsedVenusEvent,
  playerIdByNormalizedName: Map<string, string>,
) {
  const attribution = resolveAttribution(
    event.sourcePlayerName,
    playerIdByNormalizedName,
  );

  return {
    attribution_status: attribution.attributionStatus,
    before_value: event.beforeValue,
    confidence: event.confidence,
    coverage: event.coverage,
    event_key: event.eventKey,
    event_order: event.eventOrder,
    event_type: 'tracker_change',
    generation_number: event.generationNumber,
    player_id: attribution.playerId,
    raw_evidence: event.rawEvidence,
    source_entity: event.sourceEntity,
    source_player_name: event.sourcePlayerName,
    tracker_steps: event.trackerSteps,
    after_value: event.afterValue,
  };
}

function buildColonyEventPayload(
  event: ParsedColonyEvent,
  playerIdByNormalizedName: Map<string, string>,
) {
  const attribution = resolveAttribution(
    event.sourcePlayerName,
    playerIdByNormalizedName,
  );

  return {
    attribution_status: attribution.attributionStatus,
    colony_id: event.colonyId,
    colony_track_after: event.colonyTrackAfter,
    colony_track_before: event.colonyTrackBefore,
    confidence: event.confidence,
    coverage: event.coverage,
    event_details: event.eventDetails,
    event_key: event.eventKey,
    event_order: event.eventOrder,
    event_type: event.eventType,
    generation_number: event.generationNumber,
    payment_or_fleet_info: event.paymentOrFleetInfo,
    player_id: attribution.playerId,
    raw_evidence: event.rawEvidence,
    source_player_name: event.sourcePlayerName,
  };
}

export async function captureGameMechanicsFromRawLog(input: {
  gameId: string;
  gameLogImportId: string;
  rawLogText: string;
  resolveParticipantIds?: boolean;
}) {
  const parsed = parseImportedGameMechanics(input.rawLogText);
  const playerIdByNormalizedName =
    input.resolveParticipantIds === false
      ? new Map<string, string>()
      : await listGamePlayerIdsByName(input.gameId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('replace_game_mechanic_capture', {
    p_colonies_state: parsed.colonies.state,
    p_colony_events: parsed.colonies.events.map((event) =>
      buildColonyEventPayload(event, playerIdByNormalizedName),
    ),
    p_final_venus_scale: parsed.venus.finalVenusScale,
    p_game_id: input.gameId,
    p_game_log_import_id: input.gameLogImportId,
    p_parser_version: parsed.parserVersion,
    p_provenance: 'parser_derived',
    p_source_coverage: parsed.sourceCoverage,
    p_venus_events: parsed.venus.events.map((event) =>
      buildVenusEventPayload(event, playerIdByNormalizedName),
    ),
    p_venus_next_state: parsed.venus.state,
  });

  if (error) {
    throw error;
  }

  return {
    parsed,
    result: data,
  };
}

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
  if (latestImport) {
    return captureGameMechanicsFromRawLog({
      gameId,
      gameLogImportId: latestImport.id,
      rawLogText: latestImport.raw_log_text,
    });
  }

  const coverage = {
    colonies: {
      evidenceLineCount: 0,
      parsedEventCount: 0,
      sourceFormat: 'unknown',
      status: 'partial',
      warnings: ['no_retained_import_log'],
    },
    venus: {
      evidenceLineCount: 0,
      parsedEventCount: 0,
      sourceFormat: 'unknown',
      status: 'partial',
      warnings: ['no_retained_import_log'],
    },
  };
  const { data: result, error: replaceError } = await supabase.rpc(
    'replace_game_mechanic_capture',
    {
      p_colonies_state: 'incomplete_evidence',
      p_colony_events: [],
      p_final_venus_scale: null,
      p_game_id: gameId,
      p_game_log_import_id: null,
      p_parser_version: GAME_MECHANIC_PARSER_VERSION,
      p_provenance: 'no_retained_import_log',
      p_source_coverage: coverage,
      p_venus_events: [],
      p_venus_next_state: 'incomplete_evidence',
    },
  );

  if (replaceError) {
    throw replaceError;
  }

  return { parsed: null, result };
}
