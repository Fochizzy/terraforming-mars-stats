import { describe, expect, it } from 'vitest';
import { buildBoardScreenshotConfirmationRequests } from './build-board-screenshot-confirmation-requests';

describe('buildBoardScreenshotConfirmationRequests', () => {
  it('deduplicates requested spaces from board-aware cards and awards', () => {
    expect(
      buildBoardScreenshotConfirmationRequests({
        awardItems: [
          {
            awardName: 'Landlord',
            fundedByPlayerName: 'Friday',
            itemType: 'award',
            mapId: 'tharsis',
            notes: [
              'Landlord still needs targeted ocean-adjacency confirmation before importing winners.',
            ],
            requestedSpaceIds: ['20', '22'],
            sourceType: 'log',
            status: 'review_needed',
          },
        ],
        cardScoring: [
          {
            autoScoredCards: [],
            pendingCards: [
              {
                cardId: 'card-capital',
                cardName: 'Capital',
                reason: 'Capital still needs board confirmation for spaces 22, 29.',
                requestedSpaceIds: ['22', '29'],
                reviewKind: 'board_evidence',
              },
            ],
            playerName: 'Izzy',
            totals: {
              animals: 0,
              complete: false,
              jovian: 0,
              microbes: 0,
              other: 0,
              total: 0,
            },
          },
        ],
      }),
    ).toEqual([{ spaceId: '20' }, { spaceId: '22' }, { spaceId: '29' }]);
  });
});
