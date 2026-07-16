import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCardScoringRuleCache,
  upsertCardScoringRuleCache,
} from '@/lib/db/card-scoring-rule-cache-repo';
import { resolveCardScoringRule } from './resolve-card-scoring-rule';

vi.mock('@/lib/db/card-scoring-rule-cache-repo', () => ({
  getCardScoringRuleCache: vi.fn(),
  upsertCardScoringRuleCache: vi.fn(),
}));

describe('resolveCardScoringRule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers curated rules before cache or OCR', async () => {
    vi.mocked(getCardScoringRuleCache).mockResolvedValue(null);

    await expect(
      resolveCardScoringRule({
        card: {
          cardName: 'Ganymede Colony',
          cardNumber: '001',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/ganymede-colony.png',
          id: 'card-1',
          imageUrl: 'https://example.com/ganymede-colony.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:001',
          sourceTags: ['Jovian'],
          thumbnailUrl: 'https://example.com/ganymede-colony-thumb.png',
        },
      }),
    ).resolves.toMatchObject({
      rule: {
        category: 'jovian',
        humanSummary: '1 VP per Jovian tag you have',
        mode: 'tag_count',
        tag: 'jovian',
      },
      status: 'resolved',
    });

    expect(getCardScoringRuleCache).not.toHaveBeenCalled();
    expect(upsertCardScoringRuleCache).not.toHaveBeenCalled();
  });

  it('reuses cached OCR rules when present', async () => {
    vi.mocked(getCardScoringRuleCache).mockResolvedValue({
      cardId: 'card-2',
      confidence: 0.91,
      createdAt: '2026-07-06T16:00:00.000Z',
      humanSummary: '1 VP per science tag you have',
      ocrEngineVersion: 'tesseract.js-v7',
      rulePayload: {
        category: 'other',
        mode: 'tag_count',
        pointsPerSet: 1,
        scope: 'self',
        setSize: 1,
        tag: 'science',
      },
      sourceType: 'ocr',
      updatedAt: '2026-07-06T16:00:00.000Z',
    });

    await expect(
      resolveCardScoringRule({
        card: {
          cardName: 'Research Network',
          cardNumber: '002',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/research-network.png',
          id: 'card-2',
          imageUrl: 'https://example.com/research-network.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:002',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/research-network-thumb.png',
        },
      }),
    ).resolves.toMatchObject({
      rule: {
        category: 'other',
        confidence: 0.91,
        mode: 'tag_count',
        sourceType: 'ocr',
        tag: 'science',
      },
      status: 'resolved',
    });

    expect(upsertCardScoringRuleCache).not.toHaveBeenCalled();
  });

  it('parses OCR fallback rules and caches the normalized payload', async () => {
    vi.mocked(getCardScoringRuleCache).mockResolvedValue(null);
    vi.mocked(upsertCardScoringRuleCache).mockResolvedValue(undefined);

    await expect(
      resolveCardScoringRule({
        card: {
          cardName: 'Research Network',
          cardNumber: '003',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/research-network.png',
          id: 'card-3',
          imageUrl: 'https://example.com/research-network.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:003',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/research-network-thumb.png',
        },
        ocrTextLines: ['1 VP for every 2 science tags you have.'],
      }),
    ).resolves.toMatchObject({
      rule: {
        category: 'other',
        humanSummary: '1 VP per 2 science tags you have',
        mode: 'tag_count',
        sourceType: 'ocr',
        tag: 'science',
      },
      status: 'resolved',
    });

    expect(upsertCardScoringRuleCache).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-3',
        humanSummary: '1 VP per 2 science tags you have',
        rulePayload: {
          category: 'other',
          mode: 'tag_count',
          pointsPerSet: 1,
          scope: 'self',
          setSize: 2,
          tag: 'science',
        },
        sourceType: 'ocr',
      }),
    );
  });

  it('falls back to review when OCR text is unavailable and no OCR reader is provided', async () => {
    vi.mocked(getCardScoringRuleCache).mockResolvedValue(null);

    await expect(
      resolveCardScoringRule({
        card: {
          cardName: 'Research Network',
          cardNumber: '004',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/research-network.png',
          id: 'card-4',
          imageUrl: 'https://example.com/research-network.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:004',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/research-network-thumb.png',
        },
      }),
    ).resolves.toEqual({
      reason: 'Unable to read Research Network for OCR rule parsing.',
      status: 'review',
    });

    expect(upsertCardScoringRuleCache).not.toHaveBeenCalled();
  });
});
