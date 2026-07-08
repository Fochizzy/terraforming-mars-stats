import { getServerEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildImportEvidencePath } from '@/lib/imports/build-import-evidence-path';
import { refreshGameMetricSnapshots } from './metric-refresh-repo';

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

export async function saveGameLogImport(input: {
  gameId: string;
  rawLogText: string;
  screenshotFile: File | null;
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
      screenshot_mime_type: input.screenshotFile?.type || null,
      screenshot_object_path: screenshotObjectPath,
      screenshot_original_name: input.screenshotFile?.name || null,
      screenshot_size_bytes: input.screenshotFile?.size ?? null,
      unparsed_line_count: lineCount,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
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
