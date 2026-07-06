import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCardScoringRuleCache,
  upsertCardScoringRuleCache,
} from '@/lib/db/card-scoring-rule-cache-repo';
import { buildBoardEvidenceContext } from '@/lib/imports/build-board-evidence-context';
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

  it('keeps unresolved board-aware cards pending and includes requested space ids for a second pass', async () => {
    const result = await calculateImportCardScores({
      boardEvidenceContext: buildBoardEvidenceContext({
        boardSnapshot: {
          mapId: 'tharsis',
          spaces: {
            '21': {
              confidence: 'high',
              notes: [],
              ownerPlayerName: 'Friday Mars',
              sourceCardName: 'Commercial Harbor',
              sourceType: 'log_inferred',
              tileKind: 'city',
            },
          },
        },
      }),
      cardReferences: [
        {
          cardName: 'Commercial Harbor',
          cardNumber: '005',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/commercial-harbor.png',
          id: 'card-commercial-harbor',
          imageUrl: 'https://example.com/commercial-harbor.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:005',
          sourceTags: [],
          thumbnailUrl: 'https://example.com/commercial-harbor-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Commercial Harbor',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Commercial Harbor',
        },
      ],
    });

    expect(result).toEqual([
      {
        autoScoredCards: [],
        pendingCards: [
          {
            cardId: 'card-commercial-harbor',
            cardName: 'Commercial Harbor',
            reason:
              'Commercial Harbor still needs board confirmation for spaces 20, 22, 29, 30.',
            requestedSpaceIds: ['20', '22', '29', '30'],
            reviewKind: 'board_evidence',
          },
        ],
        playerName: 'Friday Mars',
        totals: {
          animals: 0,
          complete: false,
          jovian: 0,
          microbes: 0,
          other: 0,
          total: 0,
        },
      },
    ]);
  });

  it('still scores OCR tile-count cards that depend on self tile totals', async () => {
    const result = await calculateImportCardScores({
      cardReferences: [
        {
          cardName: 'Urban Survey',
          cardNumber: '006',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/urban-survey.png',
          id: 'card-urban-survey',
          imageUrl: 'https://example.com/urban-survey.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:006',
          sourceTags: [],
          thumbnailUrl: 'https://example.com/urban-survey-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Urban Survey',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Urban Survey',
        },
        {
          actor: 'Friday Mars',
          eventType: 'tile_placed',
          lineNumber: 2,
          rawLine: 'Friday Mars placed city tile at 10',
          space: '10',
          tile: 'city',
        },
        {
          actor: 'Friday Mars',
          eventType: 'tile_placed',
          lineNumber: 3,
          rawLine: 'Friday Mars placed city tile at 11',
          space: '11',
          tile: 'city',
        },
      ],
      ocrTextLinesByCardId: {
        'card-urban-survey': ['1 VP for every city tile.'],
      },
    });

    expect(result).toEqual([
      {
        autoScoredCards: [
          expect.objectContaining({
            cardName: 'Urban Survey',
            category: 'other',
            evidenceSummary: '2 city tiles => 2 VP',
            points: 2,
          }),
        ],
        pendingCards: [],
        playerName: 'Friday Mars',
        totals: {
          animals: 0,
          complete: true,
          jovian: 0,
          microbes: 0,
          other: 2,
          total: 2,
        },
      },
    ]);
  });

  it('still scores OCR non-science tag-count cards from their played tags', async () => {
    const result = await calculateImportCardScores({
      cardReferences: [
        {
          cardName: 'Steel Works',
          cardNumber: '007',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/steel-works.png',
          id: 'card-steel-works',
          imageUrl: 'https://example.com/steel-works.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:007',
          sourceTags: ['Building'],
          thumbnailUrl: 'https://example.com/steel-works-thumb.png',
        },
        {
          cardName: 'Builder Hall',
          cardNumber: '008',
          cardType: 'Project',
          expansionCode: 'base',
          fullImageUrl: 'https://example.com/builder-hall.png',
          id: 'card-builder-hall',
          imageUrl: 'https://example.com/builder-hall.png',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
          sourceCardId: 'project:base:008',
          sourceTags: ['Building'],
          thumbnailUrl: 'https://example.com/builder-hall-thumb.png',
        },
      ],
      events: [
        {
          actor: 'Friday Mars',
          card: 'Steel Works',
          eventType: 'card_played',
          lineNumber: 1,
          rawLine: 'Friday Mars played Steel Works',
        },
        {
          actor: 'Friday Mars',
          card: 'Builder Hall',
          eventType: 'card_played',
          lineNumber: 2,
          rawLine: 'Friday Mars played Builder Hall',
        },
      ],
      ocrTextLinesByCardId: {
        'card-builder-hall': ['1 VP for every 2 building tags you have.'],
        'card-steel-works': ['Action: gain 2 steel.'],
      },
    });

    expect(result).toEqual([
      {
        autoScoredCards: [
          expect.objectContaining({
            cardName: 'Builder Hall',
            category: 'other',
            evidenceSummary: '2 building tags => 1 VP',
            points: 1,
          }),
        ],
        pendingCards: [],
        playerName: 'Friday Mars',
        totals: {
          animals: 0,
          complete: true,
          jovian: 0,
          microbes: 0,
          other: 1,
          total: 1,
        },
      },
    ]);
  });
});
