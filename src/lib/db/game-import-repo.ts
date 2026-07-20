import { getServerEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildImportEvidencePath } from '@/lib/imports/build-import-evidence-path';
import { refreshGameMetricSnapshots } from './metric-refresh-repo';
import type { ImportedPlayerResolution } from '@/lib/player-identity/guest-identity';
import type { ParsedGameLogEvent } from '@/lib/imports/build-terraforming-mars-log-events';
import type { ExpansionDetectionState } from '@/lib/imports/parse-terraforming-mars-expansion-mechanics';

export type GameLogImportSummary = {
  createdAt: string;
  detectedSource: string;
  id: string;
  lineCount: number;
  parseStatus: string;
  rawLogText: string;
  screenshotOriginalName: string | null;
};

export type SaveGameLogTagSummaryInput = {
  gamePlayerId?: string | null;
  matchedCardCount: number;
  normalizedPlayerName: string;
  playedCardCount: number;
  playerName: string;
  tagCode: string;
  tagCount: number;
  totalTagCount: number;
  unresolvedCardCount: number;
};

export type SaveGameLogImportParseMetadata = {
  confidenceSummary?: Record<string, unknown>;
  detectedSource: string;
  parseStatus: string;
  parserVersion: string;
  screenshot?: {
    confidenceSummary: Record<string, unknown>;
    detectedLayout: string | null;
    extractedFields: Record<string, unknown>;
    ocrEngineVersion: string;
    parseStatus: string;
  };
  unparsedLineCount?: number;
  validationErrors?: string[];
};


export type SaveGameExpansionFactsInput = {
  coloniesState: ExpansionDetectionState;
  colonyBuiltCount: number;
  colonyTradeCount: number;
  detectionProvenance: Record<string, unknown>;
  finalVenusScale: number | null;
  parserVersion: string;
  sourceCoverage: Record<string, unknown>;
  venusEventCount: number;
  venusNextState: ExpansionDetectionState;
};

type RawGameLogImportSummaryRow = {
  created_at: string;
  detected_source: string;
  id: string;
  line_count: number;
  parse_status: string;
  raw_log_text: string;
  screenshot_original_name: string | null;
};

type RawSavedGameLogTagSummaryRow = {
  id: string;
  tag_code: string;
};

type RawGameLogImportStatusRow = {
  game_id: string;
  games: { status: string } | Array<{ status: string }>;
};

function countImportLines(rawLogText: string) {
  const normalized = rawLogText.trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\r?\n/).length;
}

export type SaveGameLogImportSourceEvidence = {
  originalByteLength: number;
  originalSha256: string;
  parserRunIdentity: string;
};

function isMissingColumnError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42703' || code === 'PGRST204';
}

export async function saveGameLogImport(input: {
  gameId: string;
  parseMetadata?: SaveGameLogImportParseMetadata;
  playerResolutions?: ImportedPlayerResolution[];
  rawLogText: string;
  screenshotFile: File | null;
  /**
   * First-class original-source identity (exact submitted bytes). Persisted
   * into the gated original_source_* columns when they exist; environments
   * that predate migration 20260720110000 keep the same values inside
   * confidence_summary.source only.
   */
  sourceEvidence?: SaveGameLogImportSourceEvidence;
  userId: string;
}) {
  const { SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE } = getServerEnv();
  const supabase = await createSupabaseServerClient();
  let screenshotObjectPath: string | null = null;

  if (input.screenshotFile) {
    screenshotObjectPath = buildImportEvidencePath({
      fileName: input.screenshotFile.name,
      gameId: input.gameId,
    });

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE)
      .upload(screenshotObjectPath, input.screenshotFile, {
        contentType: input.screenshotFile.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }
  }

  const normalizedRawLogText = input.rawLogText.trim();
  const lineCount = countImportLines(normalizedRawLogText);
  const baseInsertRow = {
      confidence_summary: {
        ...(input.parseMetadata?.confidenceSummary ?? {}),
        player_identity_resolutions: (input.playerResolutions ?? []).map(
          // No private normalization output here: normalized matching keys
          // are private personal-name data and stay inside the server RPC.
          (resolution) => ({
            decision: resolution.decision,
            identity_mode: resolution.identityMode,
            parser_identity: resolution.parserIdentity,
            selected_player_id: resolution.selectedPlayerId,
            source_format: resolution.sourceFormat,
            source_player_text: resolution.sourcePlayerText,
            state: resolution.state,
            value_source: resolution.valueSource,
          }),
        ),
      },
      created_by_user_id: input.userId,
      detected_source:
        input.parseMetadata?.detectedSource ?? 'manual_web_import',
      game_id: input.gameId,
      line_count: lineCount,
      parse_status: input.parseMetadata?.parseStatus ?? 'saved_as_draft',
      parser_version:
        input.parseMetadata?.parserVersion ?? 'manual-web-import-v1',
      raw_log_text: normalizedRawLogText,
      screenshot_mime_type: input.screenshotFile?.type || null,
      screenshot_object_path: screenshotObjectPath,
      screenshot_original_name: input.screenshotFile?.name || null,
      screenshot_size_bytes: input.screenshotFile?.size ?? null,
      unparsed_line_count:
        input.parseMetadata?.unparsedLineCount ?? lineCount,
      validation_errors: input.parseMetadata?.validationErrors ?? [],
  };

  // The first-class original-source columns are gated on migration
  // 20260720110000. Insert optimistically with them; on a missing-column
  // answer retry without them — the identical values remain available in
  // confidence_summary.source, so no environment loses the evidence.
  let insertResult =
    input.sourceEvidence === undefined
      ? await supabase
          .from('game_log_imports')
          .insert(baseInsertRow)
          .select('id')
          .single()
      : await supabase
          .from('game_log_imports')
          .insert({
            ...baseInsertRow,
            original_source_byte_length: input.sourceEvidence.originalByteLength,
            original_source_sha256: input.sourceEvidence.originalSha256,
            parser_run_identity: input.sourceEvidence.parserRunIdentity,
          })
          .select('id')
          .single();

  if (
    insertResult.error &&
    input.sourceEvidence !== undefined &&
    isMissingColumnError(insertResult.error)
  ) {
    insertResult = await supabase
      .from('game_log_imports')
      .insert(baseInsertRow)
      .select('id')
      .single();
  }

  const { data, error } = insertResult;

  if (error) {
    throw error;
  }

  if (screenshotObjectPath && input.parseMetadata?.screenshot) {
    const screenshot = input.parseMetadata.screenshot;
    const { error: screenshotError } = await supabase
      .from('game_result_screenshot_imports')
      .insert({
        confidence_summary: screenshot.confidenceSummary,
        created_by_user_id: input.userId,
        detected_layout: screenshot.detectedLayout,
        extracted_fields: screenshot.extractedFields,
        game_id: input.gameId,
        game_log_import_id: data.id,
        mime_type: input.screenshotFile?.type || null,
        ocr_engine_version: screenshot.ocrEngineVersion,
        original_name: input.screenshotFile?.name || null,
        parse_status: screenshot.parseStatus,
        parsed_at: new Date().toISOString(),
        storage_object_path: screenshotObjectPath,
        file_size_bytes: input.screenshotFile?.size ?? null,
      });

    if (screenshotError) {
      throw screenshotError;
    }
  }

  return {
    id: data.id,
    screenshotObjectPath,
  };
}

async function getFinalizedGameIdForImport(gameLogImportId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_log_imports')
    .select('game_id, games!inner(status)')
    .eq('id', gameLogImportId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as RawGameLogImportStatusRow | null;
  const gameStatus = Array.isArray(row?.games)
    ? row.games[0]?.status
    : row?.games.status;

  return gameStatus === 'finalized' ? row?.game_id ?? null : null;
}

function buildTagSummaryRow(input: {
  summary: SaveGameLogTagSummaryInput;
}) {
  return {
    game_player_id: input.summary.gamePlayerId ?? null,
    matched_card_count: input.summary.matchedCardCount,
    normalized_player_name: input.summary.normalizedPlayerName,
    played_card_count: input.summary.playedCardCount,
    player_name: input.summary.playerName,
    tag_code: input.summary.tagCode,
    tag_count: input.summary.tagCount,
    tag_evidence_coverage:
      input.summary.playedCardCount === 0
        ? 0
        : input.summary.matchedCardCount / input.summary.playedCardCount,
    total_tag_count: input.summary.totalTagCount,
    unresolved_card_count: input.summary.unresolvedCardCount,
  };
}

export async function validateGameLogImport(gameLogImportId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('validate_game_log_import', {
    p_game_log_import_id: gameLogImportId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function saveParsedGameLogEvents(input: {
  events: ParsedGameLogEvent[];
  gameLogImportId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('replace_game_log_events', {
    p_events: input.events,
    p_game_log_import_id: input.gameLogImportId,
  });

  if (error) {
    throw error;
  }

  await validateGameLogImport(input.gameLogImportId);
  return data;
}

export async function saveGameExpansionFacts(input: {
  facts: SaveGameExpansionFactsInput;
  gameId: string;
  gameLogImportId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('game_expansion_facts').upsert(
    {
      backfill_version: null,
      backfilled_at: null,
      colonies_state: input.facts.coloniesState,
      colony_built_count: input.facts.colonyBuiltCount,
      colony_trade_count: input.facts.colonyTradeCount,
      detection_provenance: input.facts.detectionProvenance,
      final_venus_scale: input.facts.finalVenusScale,
      game_id: input.gameId,
      parser_version: input.facts.parserVersion,
      source_coverage: input.facts.sourceCoverage,
      source_game_log_import_id: input.gameLogImportId,
      updated_at: new Date().toISOString(),
      venus_event_count: input.facts.venusEventCount,
      venus_next_state: input.facts.venusNextState,
    },
    { onConflict: 'game_id' },
  );

  if (error) {
    throw error;
  }
}

export async function saveGameLogTagSummaries(input: {
  gameLogImportId: string;
  summaries: SaveGameLogTagSummaryInput[];
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('replace_game_log_tag_summaries', {
    p_game_log_import_id: input.gameLogImportId,
    p_summaries: input.summaries.map((summary) =>
      buildTagSummaryRow({
        summary,
      }),
    ),
  });

  if (error) {
    throw error;
  }

  const { error: validationError } = await supabase.rpc(
    'validate_game_log_import',
    {
      p_game_log_import_id: input.gameLogImportId,
    },
  );

  if (validationError) {
    throw validationError;
  }

  const savedRows = (data ?? []) as RawSavedGameLogTagSummaryRow[];
  const finalizedGameId = await getFinalizedGameIdForImport(input.gameLogImportId);

  if (finalizedGameId) {
    await refreshGameMetricSnapshots(finalizedGameId);
  }

  return savedRows.map((row) => ({
    id: row.id,
    tagCode: row.tag_code,
  }));
}

export async function getLatestGameLogImportSummary(input: {
  gameId: string;
}): Promise<GameLogImportSummary | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_log_imports')
    .select(
      [
        'id',
        'created_at',
        'detected_source',
        'line_count',
        'parse_status',
        'raw_log_text',
        'screenshot_original_name',
      ].join(', '),
    )
    .eq('game_id', input.gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as RawGameLogImportSummaryRow | null;

  if (!row) {
    return null;
  }

  return {
    createdAt: row.created_at,
    detectedSource: row.detected_source,
    id: row.id,
    lineCount: row.line_count,
    parseStatus: row.parse_status,
    rawLogText: row.raw_log_text,
    screenshotOriginalName: row.screenshot_original_name,
  };
}
