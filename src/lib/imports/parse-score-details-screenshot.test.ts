import { describe, expect, it } from 'vitest';
import { parseGameLog } from './parse-game-log';
import { parseScoreDetailsScreenshot } from './parse-score-details-screenshot';

const cardReferences = [
  { cardName: 'Natural Preserve', id: 'card-natural-preserve' },
  { cardName: 'Space Station', id: 'card-space-station' },
  { cardName: 'Space Elevator', id: 'card-space-elevator' },
  { cardName: 'Vermin', id: 'card-vermin', sourceTags: ['Microbe'] },
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
      awardPlacements: [],
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
              category: 'microbes',
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
            microbes: -2,
            other: 2,
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
      efficiencies: [
        {
          efficiency: 0.43,
          playerName: 'James',
        },
        {
          efficiency: -0.29,
          playerName: 'Izzy',
        },
      ],
      milestoneClaims: [
        {
          matchedMilestoneId: null,
          milestoneName: 'Tactician',
          playerName: 'James',
          points: 5,
        },
        {
          matchedMilestoneId: null,
          milestoneName: 'Diversifier',
          playerName: 'Izzy',
          points: 5,
        },
      ],
    });
  });

  it('keeps award claims when the word "award" lands on the same OCR line as the points', () => {
    const parsed = parseScoreDetailsScreenshot({
      awardReferences: [
        { id: 'award-landlord', name: 'Landlord' },
        { id: 'award-miner', name: 'Miner' },
      ],
      cardReferences: [],
      events: [],
      expectedAwardPointsByPlayerName: { Izzy: 10 },
      expectedMilestonePointsByPlayerName: { Izzy: 10 },
      expectedPlayerNames: ['Izzy'],
      milestoneReferences: [
        { id: 'milestone-mayor', name: 'Mayor' },
        { id: 'milestone-gardener', name: 'Gardener' },
      ],
      ocrColumns: [
        {
          // Short award names ("Miner") keep the word "award" on the same
          // rendered line, while longer ones wrap it onto the next line.
          textLines: [
            'Izzy',
            'Efficiency: +0.02',
            'Claimed Mayor milestone 5',
            'Claimed Gardener 5',
            'milestone',
            '1st place for Landlord 5',
            'award (funded by Izzy)',
            '1st place for Miner award 5',
            '(funded by Izzy)',
          ],
        },
      ],
    });

    expect(parsed.awardPlacements).toEqual([
      {
        awardName: 'Landlord',
        fundedByPlayerName: 'Izzy',
        matchedAwardId: 'award-landlord',
        placement: 1,
        playerName: 'Izzy',
        points: 5,
      },
      {
        awardName: 'Miner',
        fundedByPlayerName: 'Izzy',
        matchedAwardId: 'award-miner',
        placement: 1,
        playerName: 'Izzy',
        points: 5,
      },
    ]);
    expect(parsed.milestoneClaims).toEqual([
      {
        matchedMilestoneId: 'milestone-mayor',
        milestoneName: 'Mayor',
        playerName: 'Izzy',
        points: 5,
      },
      {
        matchedMilestoneId: 'milestone-gardener',
        milestoneName: 'Gardener',
        playerName: 'Izzy',
        points: 5,
      },
    ]);
  });

  it('extracts milestones and award placements from noisy OCR lines and reconciles points against the table totals', () => {
    const parsed = parseScoreDetailsScreenshot({
      awardReferences: [
        { id: 'award-space-baron', name: 'Space Baron' },
        { id: 'award-excentric', name: 'Excentric' },
        { id: 'award-contractor', name: 'Contractor' },
      ],
      cardReferences: [],
      events: [],
      expectedAwardPointsByPlayerName: { James: 15 },
      expectedMilestonePointsByPlayerName: { James: 5 },
      expectedPlayerNames: ['James', 'Izzy'],
      milestoneReferences: [{ id: 'milestone-tactician', name: 'Tactician' }],
      ocrColumns: [
        {
          // Real OCR variants captured from the combined-result fixture: the
          // point values are misread ("9", "3)", "o") and the award names
          // wrap onto "award (funded by ...)" continuation lines.
          textLines: [
            'James',
            'Efficiency: +043',
            'Efficiency: +0.43',
            'Claimed Tactician 9',
            'milestone',
            '1st place for Space Baron 9',
            'award (funded by James)',
            '1st place for Excentnc o',
            'award (funded by Izzy)',
            '1st place for Contractor o',
            'Claimed Tactician 3)',
            '1st place for Space Baron §',
            '1st place for Excentric d',
            'Claimed Tactician o',
            '1st place for Excentnic 4)',
          ],
        },
      ],
    });

    expect(parsed.efficiencies).toEqual([
      {
        efficiency: 0.43,
        playerName: 'James',
      },
    ]);
    expect(parsed.milestoneClaims).toEqual([
      {
        matchedMilestoneId: 'milestone-tactician',
        milestoneName: 'Tactician',
        playerName: 'James',
        points: 5,
      },
    ]);
    expect(parsed.awardPlacements).toHaveLength(3);
    expect(
      parseScoreDetailsScreenshot({
        awardReferences: [{ id: 'award-cultivator', name: 'Cultivator' }],
        cardReferences: [],
        events: [],
        expectedAwardPointsByPlayerName: { Corey: 2 },
        expectedPlayerNames: ['Corey'],
        ocrColumns: [
          {
            textLines: [
              'Corey',
              '2nd place for Cultivator 2',
              'award (funded by James)',
            ],
          },
        ],
      }).awardPlacements,
    ).toEqual([
      {
        awardName: 'Cultivator',
        fundedByPlayerName: 'James',
        matchedAwardId: 'award-cultivator',
        placement: 2,
        playerName: 'Corey',
        points: 2,
      },
    ]);
    expect(parsed.awardPlacements).toEqual(
      expect.arrayContaining([
        {
          awardName: 'Space Baron',
          fundedByPlayerName: 'James',
          matchedAwardId: 'award-space-baron',
          placement: 1,
          playerName: 'James',
          points: 5,
        },
        {
          awardName: 'Excentric',
          fundedByPlayerName: 'Izzy',
          matchedAwardId: 'award-excentric',
          placement: 1,
          playerName: 'James',
          points: 5,
        },
        {
          awardName: 'Contractor',
          fundedByPlayerName: null,
          matchedAwardId: 'award-contractor',
          placement: 1,
          playerName: 'James',
          points: 5,
        },
      ]),
    );
  });

  describe('cards that score outside a player’s own project cards', () => {
    const corporationAwareReferences = [
      { cardName: 'Space Elevator', id: 'card-space-elevator' },
      { cardName: 'Decomposers', id: 'card-decomposers', sourceTags: ['microbe'] },
      // Vermin deducts points from its owner's opponents.
      { cardName: 'Vermin', id: 'card-vermin', sourceTags: ['microbe', 'animal'] },
      // Corporations carry no tags in the catalog.
      { cardName: 'Agricola Inc', id: 'corp-agricola-inc', sourceTags: [] },
    ];
    const events = parseGameLog(
      [
        'Izzy played Space Elevator',
        'Colette played Agricola Inc',
        'Corey played Decomposers',
        'Corey played Vermin',
      ].join('\n'),
    ).events;

    it('scores a corporation listed in a player’s score details', () => {
      const parsed = parseScoreDetailsScreenshot({
        cardReferences: corporationAwareReferences,
        events,
        expectedCardPointTotalsByPlayerName: { Colette: 1 },
        expectedPlayerNames: ['Colette'],
        ocrColumns: [{ textLines: ['Colette', 'Agricola Inc 1'] }],
      });

      expect(parsed.cardScoring[0].autoScoredCards).toEqual([
        expect.objectContaining({
          cardId: 'corp-agricola-inc',
          cardName: 'Agricola Inc',
          category: 'other',
          points: 1,
        }),
      ]);
      expect(parsed.cardScoring[0].totals).toMatchObject({
        complete: true,
        other: 1,
        total: 1,
      });
    });

    it('scores an opponent’s card that penalises this player, outside the tag buckets', () => {
      const parsed = parseScoreDetailsScreenshot({
        cardReferences: corporationAwareReferences,
        events,
        expectedCardPointTotalsByPlayerName: { Izzy: -3 },
        expectedPlayerNames: ['Izzy'],
        ocrColumns: [{ textLines: ['Izzy', 'Space Elevator 2', 'Vermin -5'] }],
      });

      const izzy = parsed.cardScoring[0];

      expect(izzy.autoScoredCards).toContainEqual(
        expect.objectContaining({
          cardName: 'Vermin',
          // Vermin is tagged microbe+animal, but the penalty is not this
          // player's microbe scoring.
          category: 'other',
          points: -5,
        }),
      );
      expect(izzy.totals).toMatchObject({
        animals: 0,
        complete: true,
        microbes: 0,
        total: -3,
      });
    });

    it('keeps the owner’s own copy in its tag bucket', () => {
      const parsed = parseScoreDetailsScreenshot({
        cardReferences: corporationAwareReferences,
        events,
        expectedCardPointTotalsByPlayerName: { Corey: 5 },
        expectedPlayerNames: ['Corey'],
        ocrColumns: [{ textLines: ['Corey', 'Decomposers 5', 'Vermin 0'] }],
      });

      expect(parsed.cardScoring[0].totals).toMatchObject({
        complete: true,
        microbes: 5,
        total: 5,
      });
    });

    it('does not pull in an opponent card on a loose name match', () => {
      const parsed = parseScoreDetailsScreenshot({
        cardReferences: corporationAwareReferences,
        events,
        expectedPlayerNames: ['Izzy'],
        // "Verminous" is close enough for the own-card threshold but must not
        // reach across players.
        ocrColumns: [{ textLines: ['Izzy', 'Space Elevator 2', 'Verminous Growth -5'] }],
      });

      expect(
        parsed.cardScoring[0].autoScoredCards.map((card) => card.cardName),
      ).toEqual(['Space Elevator']);
    });
  });
});
