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
  screenshot_original_name: string | null;
};

type RawScreenshotImportRow = {
  original_name: string | null;
};

type RawSavedGameLogEventRow = {
  event_order: number;
  id: string;
};

function formatStructuredError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (!error || typeof error !== 'object') {
    return String(error);
  }

  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : null;
  const code =
    'code' in error && typeof error.code === 'string' ? error.code : null;
  const details =
    'details' in error && typeof error.details === 'string'
      ? error.details
      : null;
  const hint =
    'hint' in error && typeof error.hint === 'string' ? error.hint : null;

  const parts = [message ?? 'Unknown error'];

  if (code) {
    parts.push(`code: ${code}`);
  }

  if (details) {
    parts.push(`details: ${details}`);
  }

  if (hint) {
    parts.push(`hint: ${hint}`);
  }

  return parts.join(' | ');
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

async function cleanupFailedScreenshotImport(input: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  gameLogImportId?: string;
  screenshotObjectPath: string;
}) {
  const cleanupTasks: Array<PromiseLike<unknown>> = [
    input.supabase.storage
      .from(getServerEnv().SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE)
      .remove([input.screenshotObjectPath]),
  ];

  if (input.gameLogImportId) {
    cleanupTasks.push(
      input.supabase.from('game_log_imports').delete().eq('id', input.gameLogImportId),
    );
  }

  const cleanupResults = await Promise.allSettled(cleanupTasks);
  const cleanupFailures = cleanupResults.flatMap((result) => {
    if (result.status === 'rejected') {
      return [result.reason];
    }

    if (
      result.value &&
      typeof result.value === 'object' &&
      'error' in result.value &&
      result.value.error
    ) {
      return [result.value.error];
    }

    return [];
  });

  return cleanupFailures.map((failure) =>
    formatStructuredError(failure),
  );
}

function buildCleanupAwareError(input: {
  cleanupFailures: string[];
  originalError: unknown;
}) {
  const originalMessage =
    formatStructuredError(input.originalError);

  if (input.cleanupFailures.length === 0) {
    return input.originalError instanceof Error
      ? input.originalError
      : new Error(originalMessage);
  }

  const cleanupMessage = input.cleanupFailures.join('; ');
  const error = new Error(
    `${originalMessage} Cleanup failed: ${cleanupMessage}`,
  );

  if (input.originalError instanceof Error) {
    error.cause = input.originalError;
  }

  return error;
}

async function saveLegacyScreenshotMetadata(input: {
  gameLogImportId: string;
  screenshotFile: File;
  screenshotObjectPath: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const { error } = await input.supabase
    .from('game_log_imports')
    .update({
      screenshot_mime_type: input.screenshotFile.type || null,
      screenshot_object_path: input.screenshotObjectPath,
      screenshot_original_name: input.screenshotFile.name,
      screenshot_size_bytes: input.screenshotFile.size,
    })
    .eq('id', input.gameLogImportId)
    .select('id')
    .single();

  if (error) {
    throw error;
  }
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
    if (screenshotObjectPath) {
      const cleanupFailures = await cleanupFailedScreenshotImport({
        screenshotObjectPath,
        supabase,
      });
      throw buildCleanupAwareError({
        cleanupFailures,
        originalError: error,
      });
    }
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
        game_log_import_id: data.id,
        mime_type: input.screenshotFile.type || null,
        ocr_engine_version: 'pending',
        original_name: input.screenshotFile.name,
        parse_status: 'saved_as_draft',
        storage_object_path: screenshotObjectPath,
      })
      .select('id')
      .single();

    if (screenshotError) {
      if (isMissingSplitScreenshotTableError(screenshotError)) {
        try {
          await saveLegacyScreenshotMetadata({
            gameLogImportId: data.id,
            screenshotFile: input.screenshotFile,
            screenshotObjectPath,
            supabase,
          });
          return {
            id: data.id,
            screenshotObjectPath,
          };
        } catch (legacyScreenshotError) {
          const cleanupFailures = await cleanupFailedScreenshotImport({
            supabase,
            gameLogImportId: data.id,
            screenshotObjectPath,
          });
          throw buildCleanupAwareError({
            cleanupFailures,
            originalError: legacyScreenshotError,
          });
        }
      }

      const cleanupFailures = await cleanupFailedScreenshotImport({
        supabase,
        gameLogImportId: data.id,
        screenshotObjectPath,
      });
      throw buildCleanupAwareError({
        cleanupFailures,
        originalError: screenshotError,
      });
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
  const supabase = await createSupabaseServerClient();
  if (input.events.length === 0) {
    const { data, error } = await supabase
      .from('game_log_events')
      .select('id, event_order')
      .eq('game_log_import_id', input.gameLogImportId);

    if (error) {
      throw error;
    }

    return ((data ?? []) as RawSavedGameLogEventRow[])
      .sort((left, right) => left.event_order - right.event_order)
      .map((row) => ({
        eventOrder: row.event_order,
        id: row.id,
      }));
  }

  const { data, error } = await supabase
    .from('game_log_events')
    .upsert(
      input.events.map((event) => ({
        board_space: event.boardSpace ?? null,
        card_id: event.cardId ?? null,
        confidence_level: event.confidenceLevel,
        event_order: event.eventOrder,
        event_type: event.eventType,
        game_log_import_id: input.gameLogImportId,
        generation_number: event.generationNumber ?? null,
        line_classification: event.lineClassification ?? null,
        payload: event.payload ?? {},
        raw_line: event.rawLine,
        resource_amount: event.resourceAmount ?? null,
        resource_type: event.resourceType ?? null,
        tile_type: event.tileType ?? null,
      })),
      {
        onConflict: 'game_log_import_id,event_order',
      },
    )
    .select('id, event_order')
    .order('event_order', { ascending: true });

  if (error) {
    throw error;
  }

  const retainedEventOrders = input.events.map((event) => event.eventOrder).join(',');
  const { error: staleDeleteError } = await supabase
    .from('game_log_events')
    .delete()
    .eq('game_log_import_id', input.gameLogImportId)
    .not('event_order', 'in', `(${retainedEventOrders})`);

  if (staleDeleteError) {
    throw staleDeleteError;
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

  const { data: screenshotData, error: screenshotError } = await supabase
    .from('game_result_screenshot_imports')
    .select('original_name')
    .eq('game_log_import_id', row.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (screenshotError) {
    if (isMissingSplitScreenshotTableError(screenshotError)) {
      return {
        createdAt: row.created_at,
        detectedSource: row.detected_source,
        id: row.id,
        lineCount: row.line_count,
        parseStatus: row.parse_status,
        rawLogText: row.raw_log_text,
        screenshotOriginalName: row.screenshot_original_name ?? null,
      };
    }

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
    screenshotOriginalName:
      screenshotRow?.original_name ?? row.screenshot_original_name ?? null,
  };
}
