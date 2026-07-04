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

type RawGameLogImportSummaryRow = {
  created_at: string;
  detected_source: string;
  id: string;
  line_count: number;
  parse_status: string;
  raw_log_text: string;
  screenshot_original_name: string | null;
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
