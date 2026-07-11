import { describe, expect, it } from 'vitest';
import { buildBoardEvidenceContext } from './build-board-evidence-context';
import { buildBoardScreenshotConfirmationRequests } from './build-board-screenshot-confirmation-requests';
import { scoreBoardAwareAwardItems } from './score-board-aware-award-items';

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

  it('collects requested spaces from live board-aware award scorer output', () => {
    const awardItems = scoreBoardAwareAwardItems({
      boardEvidenceContext: buildBoardEvidenceContext({
        boardSnapshot: {
          mapId: 'tharsis',
          spaces: {
            '21': {
              confidence: 'high',
              notes: [],
              ownerPlayerName: 'Friday',
              sourceCardName: null,
              sourceType: 'log_explicit',
              tileKind: 'city',
            },
          },
        },
      }),
      events: [
        {
          actor: 'Friday',
          award: 'Landlord',
          eventType: 'award_funded',
          lineNumber: 1,
          rawLine: 'Friday funded Landlord award',
        },
        {
          actor: 'Friday',
          eventType: 'tile_placed',
          lineNumber: 2,
          rawLine: 'Friday placed city tile at 21',
          space: '21',
          tile: 'city',
        },
      ],
      mapId: 'tharsis',
      participantNames: ['Friday'],
    });

    expect(
      buildBoardScreenshotConfirmationRequests({
        awardItems,
        cardScoring: [],
      }),
    ).toEqual([
      { spaceId: '14' },
      { spaceId: '22' },
      { spaceId: '29' },
      { spaceId: '30' },
    ]);
  });
});
