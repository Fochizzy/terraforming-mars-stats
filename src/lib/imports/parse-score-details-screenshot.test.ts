import { describe, expect, it } from 'vitest';
import { parseGameLog } from './parse-game-log';
import { parseScoreDetailsScreenshot } from './parse-score-details-screenshot';

const cardReferences = [
  { cardName: 'Natural Preserve', id: 'card-natural-preserve' },
  { cardName: 'Space Station', id: 'card-space-station' },
  { cardName: 'Space Elevator', id: 'card-space-elevator' },
  { cardName: 'Vermin', id: 'card-vermin' },
];

describe('parseScoreDetailsScreenshot', () => {
  it('parses direct score-detail columns into import card scoring summaries', () => {
    const parsedGameLog = parseGameLog(
      [
        'James played Natural Preserve',
        'James played Space Station',
        'Izzy played Space Elevator',
        'Izzy played Vermin',
      ].join('\n'),
    );

    expect(
      parseScoreDetailsScreenshot({
        cardReferences,
        events: parsedGameLog.events,
        expectedCardPointTotalsByPlayerName: {
          James: 2,
          Izzy: 0,
        },
        expectedPlayerNames: ['James', 'Izzy'],
        ocrColumns: [
          {
            textLines: [
              'James',
              'Efficiency: +0.43',
              'Natural Preserve L',
              'Space Staion 1',
              'Claimed Tactician 5',
              'milestone',
            ],
          },
          {
            textLines: [
              'lzzy',
              'Efficiency: -0.29',
              'Space Elevalor 2',
              'Vermin -2',
              'Claimed Diversifier 5',
              'milestone',
            ],
          },
        ],
      }),
    ).toEqual({
      cardScoring: [
        {
          autoScoredCards: [
            {
              cardId: 'card-space-elevator',
              cardName: 'Space Elevator',
              category: 'other',
              evidenceSummary: 'Direct score details screenshot: 2 VP.',
              humanSummary: 'Read from score details screenshot.',
              points: 2,
              sourceType: 'ocr',
            },
            {
              cardId: 'card-vermin',
              cardName: 'Vermin',
              category: 'other',
              evidenceSummary: 'Direct score details screenshot: -2 VP.',
              humanSummary: 'Read from score details screenshot.',
              points: -2,
              sourceType: 'ocr',
            },
          ],
          pendingCards: [],
          playerName: 'Izzy',
          totals: {
            animals: 0,
            complete: true,
            jovian: 0,
            microbes: 0,
            other: 0,
            total: 0,
          },
        },
        {
          autoScoredCards: [
            {
              cardId: 'card-natural-preserve',
              cardName: 'Natural Preserve',
              category: 'other',
              evidenceSummary: 'Direct score details screenshot: 1 VP.',
              humanSummary: 'Read from score details screenshot.',
              points: 1,
              sourceType: 'ocr',
            },
            {
              cardId: 'card-space-station',
              cardName: 'Space Station',
              category: 'other',
              evidenceSummary: 'Direct score details screenshot: 1 VP.',
              humanSummary: 'Read from score details screenshot.',
              points: 1,
              sourceType: 'ocr',
            },
          ],
          pendingCards: [],
          playerName: 'James',
          totals: {
            animals: 0,
            complete: true,
            jovian: 0,
            microbes: 0,
            other: 2,
            total: 2,
          },
        },
      ],
      detectedPlayerNames: ['James', 'Izzy'],
    });
  });
});
