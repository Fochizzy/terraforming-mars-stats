import { createSupabaseServerClient } from '@/lib/supabase/server';
import { correctOcrText } from '@/lib/ocr/correct-ocr-line';
import {
  buildDomainIndex,
  type DomainEntityType,
  type DomainEntry,
} from '@/lib/ocr/domain-matcher';

type RawDictionaryRow = {
  aliases: string[] | null;
  canonical_name: string;
  entity_id: string;
  entity_type: DomainEntityType;
};

export type SaveCorrectedOcrInput = {
  engineName: string;
  engineVersion?: string | null;
  gameLogImportId: string;
  meanConfidence?: number | null;
  metadata?: Record<string, unknown>;
  preprocessingVariant?: string;
  rawOcrText: string;
  regionType?: string;
};

export async function loadOcrDomainEntries(
  gameLogImportId: string,
): Promise<DomainEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_ocr_domain_dictionary', {
    p_game_log_import_id: gameLogImportId,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawDictionaryRow[]).map((row) => ({
    aliases: row.aliases ?? [],
    id: row.entity_id,
    name: row.canonical_name,
    type: row.entity_type,
  }));
}

export async function correctAndSaveOcrText(input: SaveCorrectedOcrInput) {
  const supabase = await createSupabaseServerClient();
  const entries = await loadOcrDomainEntries(input.gameLogImportId);
  const correction = correctOcrText({
    index: buildDomainIndex(entries),
    text: input.rawOcrText,
  });

  const { data: attempt, error: attemptError } = await supabase
    .from('game_log_ocr_attempts')
    .insert({
      engine_name: input.engineName,
      engine_version: input.engineVersion ?? null,
      game_log_import_id: input.gameLogImportId,
      mean_confidence: input.meanConfidence ?? null,
      metadata: {
        ...(input.metadata ?? {}),
        corrected_ocr_text: correction.correctedText,
        needs_review_count: correction.needsReview.length,
        unresolved_count: correction.unresolved.length,
      },
      preprocessing_variant: input.preprocessingVariant ?? 'original',
      raw_ocr_text: input.rawOcrText,
      region_type: input.regionType ?? 'full_image',
    })
    .select('id')
    .single();

  if (attemptError) {
    throw attemptError;
  }

  const rows = correction.lines.flatMap((line) => {
    if (!line.match) {
      return [];
    }

    return [
      {
        canonical_entity_id: line.match.entry?.id ?? null,
        canonical_text: line.match.entry?.name ?? null,
        correction_method: line.match.method,
        decision: line.match.decision,
        entity_type:
          line.match.entry?.type ??
          line.match.suggestions[0]?.entry.type ??
          'card',
        event_order: line.lineIndex,
        game_log_import_id: input.gameLogImportId,
        match_score: line.match.score,
        normalized_ocr_text: line.match.normalizedText,
        ocr_attempt_id: attempt.id,
        original_ocr_text: line.match.originalText,
        score_margin: line.match.margin,
        suggestions: line.match.suggestions.map((suggestion) => ({
          entityId: suggestion.entry.id,
          entityType: suggestion.entry.type,
          name: suggestion.entry.name,
          score: suggestion.score,
        })),
      },
    ];
  });

  if (rows.length > 0) {
    const { error: correctionsError } = await supabase
      .from('game_log_ocr_corrections')
      .insert(rows);

    if (correctionsError) {
      throw correctionsError;
    }
  }

  return {
    attemptId: attempt.id,
    correctedText: correction.correctedText,
    needsReview: correction.needsReview,
    unresolved: correction.unresolved,
  };
}

export async function confirmOcrCorrection(input: {
  canonicalEntityId: string;
  canonicalText: string;
  correctionId: string;
  saveAlias?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    'confirm_game_log_ocr_correction',
    {
      p_canonical_entity_id: input.canonicalEntityId,
      p_canonical_text: input.canonicalText,
      p_correction_id: input.correctionId,
      p_save_alias: input.saveAlias ?? true,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}
