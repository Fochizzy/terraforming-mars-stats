import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getCardScoringRuleCache,
  upsertCardScoringRuleCache,
} from './card-scoring-rule-cache-repo';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe('card scoring rule cache repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts OCR-derived rules by card id', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        card_id: 'card-1',
        confidence: 0.92,
        created_at: '2026-07-06T15:30:00.000Z',
        human_summary: '1 VP per science tag',
        ocr_engine_version: 'tesseract.js-v7',
        rule_payload: {
          mode: 'tag_count',
          pointsPerTag: 1,
          scope: 'self',
          tag: 'science',
        },
        source_type: 'ocr',
        updated_at: '2026-07-06T15:31:00.000Z',
      },
      error: null,
    });
    const select = vi.fn().mockReturnThis();

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        eq,
        maybeSingle,
        select,
        upsert,
      })),
    } as never);

    await upsertCardScoringRuleCache({
      cardId: 'card-1',
      confidence: 0.92,
      humanSummary: '1 VP per science tag',
      ocrEngineVersion: 'tesseract.js-v7',
      rulePayload: {
        mode: 'tag_count',
        pointsPerTag: 1,
        scope: 'self',
        tag: 'science',
      },
      sourceType: 'ocr',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        card_id: 'card-1',
        confidence: 0.92,
        human_summary: '1 VP per science tag',
        ocr_engine_version: 'tesseract.js-v7',
        source_type: 'ocr',
      }),
      {
        onConflict: 'card_id',
      },
    );

    await expect(getCardScoringRuleCache('card-1')).resolves.toMatchObject({
      cardId: 'card-1',
      confidence: 0.92,
      humanSummary: '1 VP per science tag',
      sourceType: 'ocr',
    });
    expect(select).toHaveBeenCalledWith(
      'card_id, source_type, confidence, human_summary, rule_payload, ocr_engine_version, created_at, updated_at',
    );
    expect(eq).toHaveBeenCalledWith('card_id', 'card-1');
  });
});
