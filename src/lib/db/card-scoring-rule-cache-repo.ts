import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CardScoringRuleCacheEntry = {
  cardId: string;
  confidence: number;
  createdAt: string;
  humanSummary: string;
  ocrEngineVersion: string | null;
  rulePayload: Record<string, unknown>;
  sourceType: 'curated' | 'ocr';
  updatedAt: string;
};

type RawCardScoringRuleCacheRow = {
  card_id: string;
  confidence: number;
  created_at: string;
  human_summary: string;
  ocr_engine_version: string | null;
  rule_payload: Record<string, unknown>;
  source_type: 'curated' | 'ocr';
  updated_at: string;
};

function mapCardScoringRuleCacheRow(
  row: RawCardScoringRuleCacheRow,
): CardScoringRuleCacheEntry {
  return {
    cardId: row.card_id,
    confidence: row.confidence,
    createdAt: row.created_at,
    humanSummary: row.human_summary,
    ocrEngineVersion: row.ocr_engine_version,
    rulePayload: row.rule_payload,
    sourceType: row.source_type,
    updatedAt: row.updated_at,
  };
}

export async function getCardScoringRuleCache(cardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('card_scoring_rule_cache')
    .select(
      'card_id, source_type, confidence, human_summary, rule_payload, ocr_engine_version, created_at, updated_at',
    )
    .eq('card_id', cardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const row = data as RawCardScoringRuleCacheRow | null;

  return row ? mapCardScoringRuleCacheRow(row) : null;
}

export async function upsertCardScoringRuleCache(input: {
  cardId: string;
  confidence: number;
  humanSummary: string;
  ocrEngineVersion?: string | null;
  rulePayload: Record<string, unknown>;
  sourceType: 'curated' | 'ocr';
}) {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from('card_scoring_rule_cache').upsert(
    {
      card_id: input.cardId,
      confidence: input.confidence,
      human_summary: input.humanSummary,
      ocr_engine_version: input.ocrEngineVersion ?? null,
      rule_payload: input.rulePayload,
      source_type: input.sourceType,
      updated_at: now,
    },
    {
      onConflict: 'card_id',
    },
  );

  if (error) {
    throw error;
  }
}
