import { getServerEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildImportEvidencePath } from '@/lib/imports/build-import-evidence-path';

export type GameLogImportSummary = {
  createdAt: string;
  detectedSource: string;
  id: string;
  lineCount: number;
  parseStatus: string;
  rawLogText: string;
  screenshotOriginalName: string | null;
};

export type SaveGameLogEventInput = {
  boardSpace?: string | null;
  cardId?: string | null;
  confidenceLevel: string;
  eventOrder: number;
  eventType: string;
  gamePlayerId?: string | null;
  generationNumber?: number | null;
  lineClassification?: string | null;
  payload?: Record<string, unknown>;
  rawLine: string;
  resourceAmount?: number | null;
  resourceType?: string | null;
  tileType?: string | null;
};

type RawGameLogImportSummaryRow = {
  created_at: string;
  detected_source: string;
  id: string;
  line_count: number;
  parse_status: string;
  raw_log_text: string;
};

type RawScreenshotImportRow = {
  original_name: string | null;
};

type RawSavedGameLogEventRow = {
  event_order: number;
  id: string;
};

function countImportLines(rawLogText: string) {
  const normalized = rawLogText.trim();

  if (!normalized) {
    return 0;
  }

  return normalized.split(/\r?\n/).length;
}

async function uploadScreenshotFile(input: {
  gameId: string;
  screenshotFile: File;
}) {
  const { SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE } = getServerEnv();
  const supabase = await createSupabaseServerClient();
  const screenshotObjectPath = buildImportEvidencePath({
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

  return {
    screenshotObjectPath,
    supabase,
  };
}

export async function saveGameLogImport(input: {
  gameId: string;
  rawLogText: string;
  screenshotFile: File | null;
  userId: string;
}) {
  const normalizedRawLogText = input.rawLogText.trim();
  const lineCount = countImportLines(normalizedRawLogText);
  let screenshotObjectPath: string | null = null;
  let supabase = await createSupabaseServerClient();

  if (input.screenshotFile) {
    const uploaded = await uploadScreenshotFile({
      gameId: input.gameId,
      screenshotFile: input.screenshotFile,
    });
    screenshotObjectPath = uploaded.screenshotObjectPath;
    supabase = uploaded.supabase;
  }

  const { data, error } = await supabase
    .from('game_log_imports')
    .insert({
      confidence_summary: {},
      created_by_user_id: input.userId,
      detected_source: 'manual_web_import',
      game_id: input.gameId,
      line_count: lineCount,
      parse_status: 'saved_as_draft',
      parser_version: 'manual-web-import-v1',
      raw_log_text: normalizedRawLogText,
      unparsed_line_count: lineCount,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  if (input.screenshotFile && screenshotObjectPath) {
    const { error: screenshotError } = await supabase
      .from('game_result_screenshot_imports')
      .insert({
        confidence_summary: {},
        created_by_user_id: input.userId,
        detected_layout: null,
        extracted_fields: {},
        file_size_bytes: input.screenshotFile.size,
        game_id: input.gameId,
        mime_type: input.screenshotFile.type || null,
        ocr_engine_version: 'pending',
        original_name: input.screenshotFile.name,
        parse_status: 'saved_as_draft',
        storage_object_path: screenshotObjectPath,
      })
      .select('id')
      .single();

    if (screenshotError) {
      throw screenshotError;
    }
  }

  return {
    id: data.id,
    screenshotObjectPath,
  };
}

export async function saveGameLogEvents(input: {
  events: SaveGameLogEventInput[];
  gameLogImportId: string;
}) {
  if (input.events.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('game_log_events')
    .insert(
      input.events.map((event) => ({
        board_space: event.boardSpace ?? null,
        card_id: event.cardId ?? null,
        confidence_level: event.confidenceLevel,
        event_order: event.eventOrder,
        event_type: event.eventType,
        game_log_import_id: input.gameLogImportId,
        game_player_id: event.gamePlayerId ?? null,
        generation_number: event.generationNumber ?? null,
        line_classification: event.lineClassification ?? null,
        payload: event.payload ?? {},
        raw_line: event.rawLine,
        resource_amount: event.resourceAmount ?? null,
        resource_type: event.resourceType ?? null,
        tile_type: event.tileType ?? null,
      })),
    )
    .select('id, event_order')
    .order('event_order', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawSavedGameLogEventRow[]).map((row) => ({
    eventOrder: row.event_order,
    id: row.id,
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

  const { data: screenshotData, error: screenshotError } = await supabase
    .from('game_result_screenshot_imports')
    .select('original_name')
    .eq('game_id', input.gameId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (screenshotError) {
    throw screenshotError;
  }

  const screenshotRow = screenshotData as RawScreenshotImportRow | null;

  return {
    createdAt: row.created_at,
    detectedSource: row.detected_source,
    id: row.id,
    lineCount: row.line_count,
    parseStatus: row.parse_status,
    rawLogText: row.raw_log_text,
    screenshotOriginalName: screenshotRow?.original_name ?? null,
  };
}
