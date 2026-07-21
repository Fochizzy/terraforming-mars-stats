import { describe, expect, it } from 'vitest';
import { buildImportReviewModel } from './build-import-review-model';
import type { ImportPlayerCardScoringSummary } from './card-scoring/card-scoring-types';
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

  describe('cardScoringCrossChecks', () => {
    function izzyCardScoring(
      overrides?: Partial<ImportPlayerCardScoringSummary>,
    ) {
      return {
        autoScoredCards: [],
        pendingCards: [],
        playerName: 'Izzy',
        totals: {
          animals: 9,
          complete: true,
          jovian: 3,
          microbes: 2,
          other: 17,
          total: 31,
        },
        ...overrides,
      };
    }

    function baseInput(
      overrides?: Partial<Parameters<typeof buildImportReviewModel>[0]>,
    ) {
      return {
        cardScoring: [izzyCardScoring()],
        logParse: {
          cardPointBreakdowns: [],
          drawInfoLineCount: 0,
          events: [],
          ignoredLineCount: 0,
        },
        playerLinks: { matches: [], unresolvedCount: 0 },
        screenshotParse: {
          playerRows: [{ cardPointsTotal: 31, playerName: 'Izzy' }],
        },
        ...overrides,
      };
    }

    it('case 1: reports a match against the screenshot summary when no explicit log score row exists (owner-reported scenario)', () => {
      const model = buildImportReviewModel({
        ...baseInput(),
        cardScoring: [
          izzyCardScoring(),
          {
            autoScoredCards: [],
            pendingCards: [],
            playerName: 'James',
            totals: {
              animals: 0,
              complete: true,
              jovian: 0,
              microbes: 0,
              other: 4,
              total: 4,
            },
          },
        ],
        screenshotParse: {
          playerRows: [
            { cardPointsTotal: 31, playerName: 'Izzy' },
            { cardPointsTotal: 4, playerName: 'James' },
          ],
        },
      });

      // The old "no usable cross-check evidence" impression must not stand alone.
      expect(model.scoreCrossChecks).toEqual([
        {
          conflictingFields: [],
          matchingFields: [],
          playerName: 'Izzy',
          status: 'screenshot_only',
        },
        {
          conflictingFields: [],
          matchingFields: [],
          playerName: 'James',
          status: 'screenshot_only',
        },
      ]);
      expect(model.cardScoringCrossChecks).toEqual([
        {
          conflictingFields: [],
          hasExplicitLogScoreRow: false,
          matchingFields: [
            { calculatedValue: 31, field: 'cardPointsTotal', referenceValue: 31 },
          ],
          pendingCardCount: 0,
          playerName: 'Izzy',
          status: 'matched',
        },
        {
          conflictingFields: [],
          hasExplicitLogScoreRow: false,
          matchingFields: [
            { calculatedValue: 4, field: 'cardPointsTotal', referenceValue: 4 },
          ],
          pendingCardCount: 0,
          playerName: 'James',
          status: 'matched',
        },
      ]);
      // The Calculated Card Scoring panel data must remain intact.
      expect(model.cardScoring).toHaveLength(2);
    });

    it('case 2: flags a conflict when a complete calculated total disagrees with the screenshot summary', () => {
      const model = buildImportReviewModel(
        baseInput({
          screenshotParse: {
            playerRows: [{ cardPointsTotal: 25, playerName: 'Izzy' }],
          },
        }),
      );

      expect(model.cardScoringCrossChecks).toEqual([
        {
          conflictingFields: [
            { calculatedValue: 31, field: 'cardPointsTotal', referenceValue: 25 },
          ],
          hasExplicitLogScoreRow: false,
          matchingFields: [],
          pendingCardCount: 0,
          playerName: 'Izzy',
          status: 'conflict',
        },
      ]);
    });

    it('case 3: does not report a false conflict when the calculation is incomplete, even if the partial total differs from the screenshot', () => {
      const model = buildImportReviewModel(
        baseInput({
          cardScoring: [
            izzyCardScoring({
              pendingCards: [
                {
                  cardId: 'card-x',
                  cardName: 'Ganymede Colony',
                  reason: 'OCR could not confirm the tile count for this card.',
                },
              ],
              totals: {
                animals: 9,
                complete: false,
                jovian: 3,
                microbes: 2,
                other: 5,
                total: 19,
              },
            }),
          ],
        }),
      );

      expect(model.cardScoringCrossChecks).toEqual([
        {
          conflictingFields: [],
          hasExplicitLogScoreRow: false,
          matchingFields: [],
          pendingCardCount: 1,
          playerName: 'Izzy',
          status: 'incomplete',
        },
      ]);
    });

    it('case 4: adds calculated evidence additively when an explicit log score row is also present, without disturbing the existing log-vs-screenshot comparison', () => {
      const model = buildImportReviewModel(
        baseInput({
          logScoreCandidates: [
            { cardPointsTotal: 31, playerName: 'Izzy', totalPoints: 90 },
          ],
          screenshotParse: {
            playerRows: [
              { cardPointsTotal: 31, playerName: 'Izzy', totalPoints: 90 },
            ],
          },
        }),
      );

      expect(model.scoreCrossChecks).toEqual([
        {
          conflictingFields: [],
          matchingFields: ['cardPointsTotal', 'totalPoints'],
          playerName: 'Izzy',
          status: 'matched',
        },
      ]);
      expect(model.cardScoringCrossChecks).toEqual([
        {
          conflictingFields: [],
          hasExplicitLogScoreRow: true,
          matchingFields: [
            { calculatedValue: 31, field: 'cardPointsTotal', referenceValue: 31 },
          ],
          pendingCardCount: 0,
          playerName: 'Izzy',
          status: 'matched',
        },
      ]);
    });

    it('case 5: associates calculated scoring with the correct player using normalized-name matching, without cross-player leakage', () => {
      const model = buildImportReviewModel(
        baseInput({
          cardScoring: [
            izzyCardScoring({ playerName: 'izzy   ' }),
            {
              autoScoredCards: [],
              pendingCards: [],
              playerName: 'Izzy H.',
              totals: {
                animals: 0,
                complete: true,
                jovian: 0,
                microbes: 0,
                other: 9,
                total: 9,
              },
            },
          ],
          screenshotParse: {
            playerRows: [
              { cardPointsTotal: 31, playerName: 'Izzy' },
              { cardPointsTotal: 40, playerName: 'Izzy H.' },
            ],
          },
        }),
      );

      const byPlayer = new Map(
        (model.cardScoringCrossChecks ?? []).map((check) => [
          check.playerName,
          check,
        ]),
      );

      expect(byPlayer.get('izzy   ')).toMatchObject({
        matchingFields: [
          { calculatedValue: 31, field: 'cardPointsTotal', referenceValue: 31 },
        ],
        status: 'matched',
      });
      expect(byPlayer.get('Izzy H.')).toMatchObject({
        conflictingFields: [
          { calculatedValue: 9, field: 'cardPointsTotal', referenceValue: 40 },
        ],
        status: 'conflict',
      });
    });

    it('case 6: does not invent a match or a conflict when the screenshot summary has no card-points field', () => {
      const model = buildImportReviewModel(
        baseInput({
          screenshotParse: {
            playerRows: [{ playerName: 'Izzy', totalPoints: 90, trPoints: 20 }],
          },
        }),
      );

      expect(model.cardScoringCrossChecks).toEqual([]);
    });

    it('case 7: compares only the component fields both sources actually expose', () => {
      const model = buildImportReviewModel(
        baseInput({
          screenshotParse: {
            playerRows: [{ cardPointsAnimals: 9, playerName: 'Izzy' }],
          },
        }),
      );

      expect(model.cardScoringCrossChecks).toEqual([
        {
          conflictingFields: [],
          hasExplicitLogScoreRow: false,
          matchingFields: [
            { calculatedValue: 9, field: 'cardPointsAnimals', referenceValue: 9 },
          ],
          pendingCardCount: 0,
          playerName: 'Izzy',
          status: 'matched',
        },
      ]);
    });

    it('case 8: stays empty and preserves current screenshot_only behavior when no calculated evidence exists', () => {
      const model = buildImportReviewModel(
        baseInput({ cardScoring: [] }),
      );

      expect(model.cardScoringCrossChecks).toEqual([]);
      expect(model.scoreCrossChecks).toEqual([
        {
          conflictingFields: [],
          matchingFields: [],
          playerName: 'Izzy',
          status: 'screenshot_only',
        },
      ]);
    });
  });
});
