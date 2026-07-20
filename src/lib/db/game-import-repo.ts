import { getServerEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildImportEvidencePath } from '@/lib/imports/build-import-evidence-path';
import {
  PLAYER_TAG_CODES,
  type ImportPlayerTagSummary,
  type PlayerTagCode,
} from '@/lib/imports/derive-player-tag-summaries';
import { normalizePlayerAlias } from '@/lib/imports/normalize-player-alias';
import { captureGameMechanicsFromRawLog } from './game-mechanic-capture-repo';

const LEGACY_PLAYER_TAG_CODES = [
  'building',
  'space',
  'power',
  'science',
  'jovian',
  'earth',
  'plant',
  'microbe',
  'animal',
  'city',
  'event',
] as const satisfies readonly PlayerTagCode[];

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
  boardPosition?: number | null;
  boardRow?: number | null;
  boardSpace?: string | null;
  cardId?: string | null;
  confidenceLevel: string;
  /** Required for tile events; see `replace_game_log_events`. */
  eventIdentity?: string | null;
  eventOrder: number;
  eventType: string;
  generationNumber?: number | null;
  lineClassification?: string | null;
  ownershipState?: string | null;
  payload?: Record<string, unknown>;
  placementAction?: string | null;
  placementBoard?: string | null;
  placementFormat?: string | null;
  rawLine: string;
  resourceAmount?: number | null;
  resourceType?: string | null;
  sourceLineNumber?: number | null;
  sourceSpaceId?: string | null;
  tileType?: string | null;
};

export type SaveGameLogScreenshotParseInput = {
  confidenceSummary?: Record<string, unknown>;
  detectedLayout?: string | null;
  extractedFields?: Record<string, unknown>;
  ocrEngineVersion?: string;
  parseStatus?: string;
};

export type SaveGameLogScreenshotEvidenceKind =
  | 'board_state'
  | 'endgame_score';

export type SaveGameLogScreenshotInput = {
  displayOrder?: number;
  file: File;
  kind: SaveGameLogScreenshotEvidenceKind;
  parse?: SaveGameLogScreenshotParseInput;
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
  parse_status?: string | null;
};

type RawSavedGameLogEventRow = {
  event_order: number;
  id: string;
};

type RawSavedGameLogTagSummaryRow = {
  id: string;
  tag_code: string;
};

type NormalizedSaveGameLogScreenshotInput = SaveGameLogScreenshotInput & {
  displayOrder: number;
};

function formatStructuredError(error: unknown) {
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

function getScreenshotPlayerRows(
  screenshotParse?: SaveGameLogScreenshotParseInput,
) {
  const playerRows = screenshotParse?.extractedFields?.playerRows;

  return Array.isArray(playerRows) ? playerRows : [];
}

function deriveScreenshotParseStatus(
  screenshotParse?: SaveGameLogScreenshotParseInput,
) {
  if (screenshotParse?.parseStatus && screenshotParse.parseStatus !== 'saved_as_draft') {
    return screenshotParse.parseStatus;
  }

  return getScreenshotPlayerRows(screenshotParse).length > 0
    ? 'parsed'
    : 'score_extraction_skipped';
}

function deriveImportParseStatus(input: {
  logParseSummary?: {
    contextLineCount: number;
    drawInfoLineCount: number;
    ignoredLineCount: number;
    parsedEventCount: number;
  };
  screenshots: NormalizedSaveGameLogScreenshotInput[];
}) {
  const hasParsedLog = Boolean(input.logParseSummary?.parsedEventCount);
  const endgameScreenshot = input.screenshots.find(
    (screenshot) => screenshot.kind === 'endgame_score',
  );

  if (endgameScreenshot) {
    const screenshotStatus = deriveScreenshotParseStatus(endgameScreenshot.parse);

    if (hasParsedLog) {
      return screenshotStatus === 'parsed'
        ? 'log_parsed_score_extracted'
        : 'log_parsed_score_extraction_skipped';
    }

    return screenshotStatus === 'parsed'
      ? 'score_extracted'
      : 'score_extraction_skipped';
  }

  return hasParsedLog ? 'log_parsed' : 'saved_as_draft';
}

function normalizeSaveGameLogScreenshots(input: {
  screenshotFile?: File | null;
  screenshotParse?: SaveGameLogScreenshotParseInput;
  screenshots?: SaveGameLogScreenshotInput[];
}): NormalizedSaveGameLogScreenshotInput[] {
  const rawScreenshots =
    input.screenshots && input.screenshots.length > 0
      ? input.screenshots
      : input.screenshotFile
        ? [
            {
              file: input.screenshotFile,
              kind: 'endgame_score' as const,
              parse: input.screenshotParse,
            },
          ]
        : [];
  const nextDisplayOrderByKind = new Map<SaveGameLogScreenshotEvidenceKind, number>();

  return rawScreenshots.map((screenshot) => {
    const nextDisplayOrder =
      nextDisplayOrderByKind.get(screenshot.kind) ?? 0;
    const displayOrder =
      typeof screenshot.displayOrder === 'number'
        ? screenshot.displayOrder
        : nextDisplayOrder;

    nextDisplayOrderByKind.set(
      screenshot.kind,
      Math.max(nextDisplayOrder, displayOrder + 1),
    );

    return {
      ...screenshot,
      displayOrder,
    };
  });
}

async function uploadScreenshotFile(input: {
  gameId: string;
  screenshotFile: File;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const { SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE } = getServerEnv();
  const screenshotObjectPath = buildImportEvidencePath({
    fileName: input.screenshotFile.name,
    gameId: input.gameId,
  });

  const { error: uploadError } = await input.supabase.storage
    .from(SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE)
    .upload(screenshotObjectPath, input.screenshotFile, {
      contentType: input.screenshotFile.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  return screenshotObjectPath;
}

async function cleanupFailedScreenshotImport(input: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  gameLogImportId?: string;
  screenshotObjectPaths: string[];
}) {
  const cleanupTasks: Array<PromiseLike<unknown>> = [];

  if (input.screenshotObjectPaths.length > 0) {
    cleanupTasks.push(
      input.supabase.storage
        .from(getServerEnv().SUPABASE_STORAGE_BUCKET_IMPORT_EVIDENCE)
        .remove(input.screenshotObjectPaths),
    );
  }

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

function readSupabaseErrorString(error: unknown, key: string) {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const value = (error as Record<string, unknown>)[key];

  return typeof value === 'string' ? value : null;
}

function isTagSummaryCodeConstraintError(error: unknown) {
  const code = readSupabaseErrorString(error, 'code');
  const haystack = [
    readSupabaseErrorString(error, 'message'),
    readSupabaseErrorString(error, 'details'),
    readSupabaseErrorString(error, 'hint'),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ');

  return (
    code === '23514' &&
    haystack.includes('game_log_tag_summaries_tag_code_check')
  );
}

function buildGameLogTagSummaryRows(input: {
  gameLogImportId: string;
  tagCodes: readonly PlayerTagCode[];
  tagSummaries: ImportPlayerTagSummary[];
}) {
  return input.tagSummaries.flatMap((summary) =>
    input.tagCodes.map((tagCode) => ({
      game_log_import_id: input.gameLogImportId,
      matched_card_count: summary.matchedCardCount,
      normalized_player_name: normalizePlayerAlias(summary.playerName),
      player_name: summary.playerName,
      played_card_count: summary.playedCardCount,
      tag_code: tagCode,
      tag_count: summary.tagCounts[tagCode] ?? 0,
      total_tag_count: summary.totalTags,
      unresolved_card_count: summary.unresolvedCardCount,
    })),
  );
}

async function insertGameLogTagSummaryRows(input: {
  rows: ReturnType<typeof buildGameLogTagSummaryRows>;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  if (input.rows.length === 0) {
    return [];
  }

  const { data, error } = await input.supabase
    .from('game_log_tag_summaries')
    .insert(input.rows)
    .select('id, tag_code');

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawSavedGameLogTagSummaryRow[]).map((row) => ({
    id: row.id,
    tagCode: row.tag_code,
  }));
}

// Capture v2 must never block a supported import. The immutable source record
// receives the original, untrimmed bytes so the retained evidence is
// byte-for-byte; a capture failure is logged and left for a forward re-run.
async function captureGameMechanicsSafely(input: {
  gameId: string;
  gameLogImportId: string;
  rawLogText: string;
  resolveParticipantIds?: boolean;
}) {
  try {
    await captureGameMechanicsFromRawLog(input);
  } catch (error) {
    console.warn(
      'Game capture (v2) did not complete; import preserved and capture can be re-run.',
      formatStructuredError(error),
    );
  }
}

export async function saveGameLogImport(input: {
  gameId: string;
  logParseSummary?: {
    contextLineCount: number;
    drawInfoLineCount: number;
    ignoredLineCount: number;
    parsedEventCount: number;
  };
  rawLogText: string;
  screenshotParse?: SaveGameLogScreenshotParseInput;
  screenshotFile?: File | null;
  screenshots?: SaveGameLogScreenshotInput[];
  userId: string;
}) {
  const screenshots = normalizeSaveGameLogScreenshots(input);
  const normalizedRawLogText = input.rawLogText.trim();
  const lineCount = countImportLines(normalizedRawLogText);
  const unparsedLineCount = input.logParseSummary
    ? input.logParseSummary.contextLineCount +
      input.logParseSummary.drawInfoLineCount +
      input.logParseSummary.ignoredLineCount
    : lineCount;
  const importParseStatus = deriveImportParseStatus({
    logParseSummary: input.logParseSummary,
    screenshots,
  });
  const primaryEndgameScreenshot =
    screenshots.find((screenshot) => screenshot.kind === 'endgame_score') ?? null;
  const supabase = await createSupabaseServerClient();
  const uploadedScreenshots: Array<
    NormalizedSaveGameLogScreenshotInput & { screenshotObjectPath: string }
  > = [];

  for (const screenshot of screenshots) {
    const screenshotObjectPath = await uploadScreenshotFile({
      gameId: input.gameId,
      screenshotFile: screenshot.file,
      supabase,
    });

    uploadedScreenshots.push({
      ...screenshot,
      screenshotObjectPath,
    });
  }

  const { data, error } = await supabase
    .from('game_log_imports')
    .insert({
      confidence_summary: input.logParseSummary ?? {},
      created_by_user_id: input.userId,
      detected_source: 'manual_web_import',
      game_id: input.gameId,
      line_count: lineCount,
      parse_status: importParseStatus,
      parser_version: input.logParseSummary
        ? 'manual-web-import-v2'
        : 'manual-web-import-v1',
      raw_log_text: normalizedRawLogText,
      unparsed_line_count: unparsedLineCount,
    })
    .select('id')
    .single();

  if (error) {
    if (uploadedScreenshots.length > 0) {
      const cleanupFailures = await cleanupFailedScreenshotImport({
        screenshotObjectPaths: uploadedScreenshots.map(
          (screenshot) => screenshot.screenshotObjectPath,
        ),
        supabase,
      });
      throw buildCleanupAwareError({
        cleanupFailures,
        originalError: error,
      });
    }
    throw error;
  }

  if (uploadedScreenshots.length > 0) {
    for (const screenshot of uploadedScreenshots) {
      const { error: screenshotError } = await supabase
        .from('game_result_screenshot_imports')
        .insert({
          confidence_summary: screenshot.parse?.confidenceSummary ?? {},
          created_by_user_id: input.userId,
          detected_layout: screenshot.parse?.detectedLayout ?? null,
          display_order: screenshot.displayOrder,
          evidence_kind: screenshot.kind,
          extracted_fields: screenshot.parse?.extractedFields ?? {},
          file_size_bytes: screenshot.file.size,
          game_id: input.gameId,
          game_log_import_id: data.id,
          mime_type: screenshot.file.type || null,
          ocr_engine_version: screenshot.parse?.ocrEngineVersion ?? 'pending',
          original_name: screenshot.file.name,
          parse_status:
            deriveScreenshotParseStatus(screenshot.parse) ?? 'saved_as_draft',
          storage_object_path: screenshot.screenshotObjectPath,
        })
        .select('id')
        .single();

      if (screenshotError) {
        if (
          isMissingSplitScreenshotTableError(screenshotError) &&
          primaryEndgameScreenshot &&
          uploadedScreenshots.length === 1 &&
          primaryEndgameScreenshot.kind === 'endgame_score'
        ) {
          try {
            await saveLegacyScreenshotMetadata({
              gameLogImportId: data.id,
              screenshotFile: primaryEndgameScreenshot.file,
              screenshotObjectPath: screenshot.screenshotObjectPath,
              supabase,
            });
            await captureGameMechanicsSafely({
              gameId: input.gameId,
              gameLogImportId: data.id,
              rawLogText: input.rawLogText,
              resolveParticipantIds: false,
            });
            return {
              id: data.id,
              screenshotObjectPath: screenshot.screenshotObjectPath,
            };
          } catch (legacyScreenshotError) {
            const cleanupFailures = await cleanupFailedScreenshotImport({
              supabase,
              gameLogImportId: data.id,
              screenshotObjectPaths: uploadedScreenshots.map(
                (uploadedScreenshot) => uploadedScreenshot.screenshotObjectPath,
              ),
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
          screenshotObjectPaths: uploadedScreenshots.map(
            (uploadedScreenshot) => uploadedScreenshot.screenshotObjectPath,
          ),
        });
        throw buildCleanupAwareError({
          cleanupFailures,
          originalError: screenshotError,
        });
      }
    }
  }

  await captureGameMechanicsSafely({
    gameId: input.gameId,
    gameLogImportId: data.id,
    rawLogText: input.rawLogText,
    resolveParticipantIds: false,
  });

  return {
    id: data.id,
    screenshotObjectPath:
      uploadedScreenshots.find(
        (screenshot) => screenshot.kind === 'endgame_score',
      )?.screenshotObjectPath ??
      uploadedScreenshots[0]?.screenshotObjectPath ??
      null,
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

  const { data, error } = await supabase.rpc('replace_game_log_events', {
    p_events: input.events.map((event) => ({
      board_position: event.boardPosition ?? null,
      board_row: event.boardRow ?? null,
      board_space: event.boardSpace ?? null,
      card_id: event.cardId ?? null,
      confidence_level: event.confidenceLevel,
      event_identity: event.eventIdentity ?? null,
      event_order: event.eventOrder,
      event_type: event.eventType,
      generation_number: event.generationNumber ?? null,
      line_classification: event.lineClassification ?? null,
      ownership_state: event.ownershipState ?? null,
      payload: event.payload ?? {},
      placement_action: event.placementAction ?? null,
      placement_board: event.placementBoard ?? null,
      placement_format: event.placementFormat ?? null,
      raw_line: event.rawLine,
      resource_amount: event.resourceAmount ?? null,
      resource_type: event.resourceType ?? null,
      source_line_number: event.sourceLineNumber ?? null,
      source_space_id: event.sourceSpaceId ?? null,
      tile_type: event.tileType ?? null,
    })),
    p_game_log_import_id: input.gameLogImportId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawSavedGameLogEventRow[]).map((row) => ({
    eventOrder: row.event_order,
    id: row.id,
  }));
}

export async function saveGameLogTagSummaries(input: {
  gameLogImportId: string;
  tagSummaries: ImportPlayerTagSummary[];
}) {
  const supabase = await createSupabaseServerClient();
  const { error: deleteError } = await supabase
    .from('game_log_tag_summaries')
    .delete()
    .eq('game_log_import_id', input.gameLogImportId);

  if (deleteError) {
    throw deleteError;
  }

  const rows = buildGameLogTagSummaryRows({
    gameLogImportId: input.gameLogImportId,
    tagCodes: PLAYER_TAG_CODES,
    tagSummaries: input.tagSummaries,
  });

  try {
    return await insertGameLogTagSummaryRows({ rows, supabase });
  } catch (error) {
    if (!isTagSummaryCodeConstraintError(error)) {
      throw error;
    }

    console.warn(
      'Game log tag summary schema rejected newer tag codes; retrying with legacy tag set.',
      {
        code: readSupabaseErrorString(error, 'code'),
        details: readSupabaseErrorString(error, 'details'),
        message: readSupabaseErrorString(error, 'message'),
      },
    );
  }

  return insertGameLogTagSummaryRows({
    rows: buildGameLogTagSummaryRows({
      gameLogImportId: input.gameLogImportId,
      tagCodes: LEGACY_PLAYER_TAG_CODES,
      tagSummaries: input.tagSummaries,
    }),
    supabase,
  });
}

export async function findDuplicateGameLogImport(input: {
  groupId: string;
  rawLogText: string;
}): Promise<boolean> {
  const normalizedRawLogText = input.rawLogText.trim();

  // Screenshot-only imports have no log text; an empty match would wrongly
  // collide with every other screenshot-only draft, so skip the guard there.
  if (!normalizedRawLogText) {
    return false;
  }

  // Match through an RPC so the full log travels in the POST body. Filtering
  // `.eq('raw_log_text', ...)` puts the entire multi-KB log in the request URL,
  // which the Supabase edge rejects with a bare 400 "Bad Request" once a large
  // export pushes the URL past its length limit.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('find_duplicate_game_log_import', {
    p_group_id: input.groupId,
    p_raw_log_text: normalizedRawLogText,
  });

  if (error) {
    throw error;
  }

  return data === true;
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
    .select('original_name, parse_status')
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
  const screenshotParseStatus =
    row.parse_status === 'saved_as_draft' &&
    screenshotRow?.parse_status &&
    screenshotRow.parse_status !== 'saved_as_draft'
      ? screenshotRow.parse_status
      : row.parse_status;

  return {
    createdAt: row.created_at,
    detectedSource: row.detected_source,
    id: row.id,
    lineCount: row.line_count,
    parseStatus: screenshotParseStatus,
    rawLogText: row.raw_log_text,
    screenshotOriginalName:
      screenshotRow?.original_name ?? row.screenshot_original_name ?? null,
  };
}
