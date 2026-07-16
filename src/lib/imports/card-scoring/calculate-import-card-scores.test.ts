import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCardScoringRuleCache,
  upsertCardScoringRuleCache,
} from '@/lib/db/card-scoring-rule-cache-repo';
import { calculateImportCardScores } from './calculate-import-card-scores';

vi.mock('@/lib/db/card-scoring-rule-cache-repo', () => ({
  getCardScoringRuleCache: vi.fn(),
  upsertCardScoringRuleCache: vi.fn(),
}));

describe('calculateImportCardScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCardScoringRuleCache).mockResolvedValue(null);
    vi.mocked(upsertCardScoringRuleCache).mockResolvedValue(undefined);
  });

  it('scores supported resource and science-tag cards and leaves ambiguous cards pending review', async () => {
    const result = await calculateImportCardScores({
      cardReferences: [
        {
          cardName: 'Pets',
          cardNumber: '001',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/pets.png',
          id: 'card-pets',
          imageUrl: 'https://example.com/pets.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:001',
          sourceTags: [],
          thumbnailUrl: 'https://example.com/pets-thumb.png',
        },
        {
          cardName: 'Research Network',
          cardNumber: '002',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/research-network.png',
          id: 'card-research-network',
          imageUrl: 'https://example.com/research-network.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:002',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/research-network-thumb.png',
        },
        {
          cardName: 'Orbital Lab',
          cardNumber: '003',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/orbital-lab.png',
          id: 'card-orbital-lab',
          imageUrl: 'https://example.com/orbital-lab.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:003',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/orbital-lab-thumb.png',
        },
        {
          cardName: 'Mystery Science Score',
          cardNumber: '004',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/mystery-science-score.png',
          id: 'card-mystery',
          imageUrl: 'https://example.com/mystery-science-score.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:004',
          sourceTags: ['Science'],
          thumbnailUrl: 'https://example.com/mystery-science-score-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Pets',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Pets',
        },
        {
          actor: 'Friday Mars',
          card: 'Pets',
          eventType: 'resource_changed',
          lineNumber: 2,
          operation: 'added',
          rawLine: 'Friday Mars added 3 animals to Pets',
          resourceAmount: 3,
          resourceType: 'animal',
        },
        {
          actor: 'Friday Mars',
          card: 'Research Network',
          eventType: 'card_played',
          lineNumber: 3,
          rawLine: 'Friday Mars played Research Network',
        },
        {
          actor: 'Friday Mars',
          card: 'Orbital Lab',
          eventType: 'card_played',
          lineNumber: 4,
          rawLine: 'Friday Mars played Orbital Lab',
        },
        {
          actor: 'Friday Mars',
          card: 'Mystery Science Score',
          eventType: 'card_played',
          lineNumber: 5,
          rawLine: 'Friday Mars played Mystery Science Score',
        },
      ],
      ocrTextLinesByCardId: {
        'card-mystery': [
          '1 VP for every science tag you have.',
          '1 VP for every 2 science tags you have.',
        ],
        'card-orbital-lab': ['Action: draw 1 card.'],
        'card-research-network': ['1 VP for every science tag you have.'],
      },
    });

    expect(result).toEqual([
      {
        autoScoredCards: [
          expect.objectContaining({
            cardName: 'Pets',
            category: 'animals',
            points: 3,
          }),
          expect.objectContaining({
            cardName: 'Research Network',
            category: 'other',
            points: 3,
          }),
        ],
        pendingCards: [
          {
            cardId: 'card-mystery',
            cardName: 'Mystery Science Score',
            reason:
              'Multiple endgame scoring formulas were detected for Mystery Science Score.',
          },
        ],
        playerName: 'Friday Mars',
        totals: {
          animals: 3,
          complete: false,
          jovian: 0,
          microbes: 0,
          other: 3,
          total: 6,
        },
      },
    ]);
  });
});
