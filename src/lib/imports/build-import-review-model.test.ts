import { describe, expect, it } from 'vitest';
import { buildImportReviewModel } from './build-import-review-model';
import type { CuratedBoardImportItem } from './score-curated-board-import-items';

describe('buildImportReviewModel', () => {
  it('surfaces ignored filler, OCR scores, and unresolved players together', () => {
    const boardReviewItems: CuratedBoardImportItem[] = [
      {
        cardName: 'Commercial District',
        itemType: 'card',
        mapId: 'tharsis',
        notes: ['2 adjacent cities were provable from the imported log placements.'],
        playerName: 'Izzy H.',
        points: 2,
        sourceType: 'log_and_board',
        status: 'proved',
      },
    ];

    expect(
      buildImportReviewModel({
        boardReviewItems,
        cardScoring: [
          {
            autoScoredCards: [
              {
                cardId: 'card-1',
                cardName: 'Pets',
                category: 'animals',
                evidenceSummary: '2 animal => 2 VP',
                humanSummary: '1 VP per animal on this card',
                points: 2,
                sourceType: 'curated',
              },
            ],
            pendingCards: [
              {
                cardId: 'card-2',
                cardName: 'Mystery Science Score',
                reason: 'OCR found VP text but the rule still needs review.',
              },
            ],
            playerName: 'Izzy H.',
            totals: {
              animals: 2,
              complete: false,
              jovian: 0,
              microbes: 0,
              other: 0,
              total: 2,
            },
          },
        ],
        groupResolution: {
          action: 'reuse',
          groupName: 'Friday / Second',
          participantCount: 2,
          summary:
            'This import will reuse Friday / Second because its roster exactly matches an existing group.',
        },
        logScoreCandidates: [
          {
            awardPoints: 2,
            milestonePoints: 5,
            playerName: 'Izzy H.',
            totalPoints: 61,
            trPoints: 18,
          },
        ],
        logParse: {
          cardPointBreakdowns: [],
          drawInfoLineCount: 1,
          events: [
            {
              actor: 'Izzy',
              card: 'Earth Catapult',
              eventType: 'card_played',
              lineNumber: 3,
              rawLine: 'Izzy played Earth Catapult',
            },
          ],
          ignoredLineCount: 2,
        },
        playerLinks: {
          matches: [
            {
              candidates: [],
              importedName: 'Izzy H.',
              requiresConfirmation: true,
              selectedPlayerId: null,
              status: 'unmatched',
            },
          ],
          unresolvedCount: 1,
        },
        screenshotParse: {
          playerRows: [{ playerName: 'Izzy H.', totalPoints: 62, trPoints: 18 }],
        },
      }),
    ).toMatchObject({
      boardReviewItems: [
        {
          cardName: 'Commercial District',
          itemType: 'card',
          playerName: 'Izzy H.',
          points: 2,
          status: 'proved',
        },
      ],
      cardScoring: [
        {
          autoScoredCards: [{ cardName: 'Pets', points: 2 }],
          pendingCards: [{ cardName: 'Mystery Science Score' }],
          playerName: 'Izzy H.',
          totals: { animals: 2, complete: false, total: 2 },
        },
      ],
      detectedParticipantNames: ['Izzy'],
      drawInfoLineCount: 1,
      groupResolution: {
        action: 'reuse',
        groupName: 'Friday / Second',
        participantCount: 2,
      },
      ignoredLineCount: 2,
      logScoreCandidates: [{ playerName: 'Izzy H.', totalPoints: 61 }],
      parsedEventCount: 1,
      playerLinks: [{ importedName: 'Izzy H.', status: 'unmatched' }],
      requiresPlayerConfirmation: true,
      scoreCrossChecks: [
        {
          conflictingFields: ['totalPoints'],
          matchingFields: ['trPoints'],
          playerName: 'Izzy H.',
          status: 'conflict',
        },
      ],
      scoreCandidates: [{ playerName: 'Izzy H.', totalPoints: 62 }],
    });
  });
});
