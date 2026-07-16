import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/card-scoring-rule-cache-repo', () => ({
  getCardScoringRuleCache: vi.fn(),
  upsertCardScoringRuleCache: vi.fn(),
}));

vi.mock('./parse-ocr-card-rule', () => ({
  parseOcrCardRule: vi.fn(() => {
    throw new TypeError("Cannot read properties of undefined (reading 'endsWith')");
  }),
}));

import { getCardScoringRuleCache, upsertCardScoringRuleCache } from '@/lib/db/card-scoring-rule-cache-repo';
import { resolveCardScoringRule } from './resolve-card-scoring-rule';

describe('resolveCardScoringRule parser failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCardScoringRuleCache).mockResolvedValue(null);
    vi.mocked(upsertCardScoringRuleCache).mockResolvedValue(undefined);
  });

  it('falls back to review when OCR rule parsing throws unexpectedly', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      resolveCardScoringRule({
        card: {
          cardName: 'Rarefied Neutro',
          cardNumber: '999',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/rarefied-neutro.png',
          id: 'card-rarefied-neutro',
          imageUrl: 'https://example.com/rarefied-neutro.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:999',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/rarefied-neutro-thumb.png',
        },
        ocrTextLines: ['1 VP for every 2 science tags you have.'],
      }),
    ).resolves.toEqual({
      reason: 'Unable to parse Rarefied Neutro for OCR rule scoring.',
      status: 'review',
    });

    expect(upsertCardScoringRuleCache).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith(
      'Card scoring OCR parse failed',
      expect.objectContaining({
        cardId: 'card-rarefied-neutro',
        cardName: 'Rarefied Neutro',
        error: expect.objectContaining({
          message: "Cannot read properties of undefined (reading 'endsWith')",
        }),
      }),
    );

    consoleWarn.mockRestore();
  });
});
