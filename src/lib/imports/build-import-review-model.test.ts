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
        tagSummaries: [
          {
            matchedCardCount: 2,
            matchedCards: [
              {
                cardId: 'card-1',
                cardName: 'Earth Catapult',
                lineNumber: 3,
                rawLine: 'Izzy played Earth Catapult',
                sourceTags: ['building', 'earth'],
              },
            ],
            playedCardCount: 3,
            playerName: 'Izzy H.',
            tagCounts: {
              animal: 0,
              building: 1,
              city: 0,
              earth: 1,
              event: 0,
              jovian: 0,
              microbe: 0,
              moon: 0,
              plant: 0,
              power: 0,
              science: 0,
              space: 0,
              venus: 0,
              wild: 0,
            },
            totalTags: 2,
            unresolvedCardCount: 1,
            unresolvedCards: [
              {
                cardName: 'Mystery Import Card',
                lineNumber: 4,
                rawLine: 'Izzy played Mystery Import Card',
                reason: 'not_found',
              },
            ],
          },
        ],
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
      tagSummaries: [
        {
          matchedCardCount: 2,
          playerName: 'Izzy H.',
          tagCounts: expect.objectContaining({ building: 1, earth: 1 }),
          totalTags: 2,
          unresolvedCardCount: 1,
        },
      ],
      detectedParticipantNames: ['Izzy'],
      drawInfoLineCount: 1,
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
