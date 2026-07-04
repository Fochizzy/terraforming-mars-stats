import { describe, expect, it } from 'vitest';
import { buildImportDraft } from './build-import-draft';

describe('buildImportDraft', () => {
  it('builds a cloud draft payload from import values and group defaults', () => {
    expect(
      buildImportDraft({
        defaultExpansionCodes: ['base', 'prelude'],
        defaultPromoSetSlugs: ['2022-seasonal-promos'],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: 'endgame.png',
          exportedGameLog: 'Friday Mars won by 6 points.',
          generationCount: 12,
          mapId: 'elysium',
          participantNames: ['Friday Mars', 'Second Seat', 'Third Seat'],
          playedOn: '2026-07-04',
          playerCount: 3,
        },
        selectedPlayerIds: ['player-1', 'player-2', 'player-3'],
      }),
    ).toEqual({
      awardClaims: {},
      expansionCodes: ['base', 'prelude'],
      gameId: undefined,
      generationCount: 12,
      groupId: '11111111-1111-4111-8111-111111111111',
      mapId: 'elysium',
      milestoneClaims: {},
      notes: [
        'Imported evidence attached.',
        'Review the saved game log and screenshot details before finalizing.',
      ].join('\n\n'),
      playedOn: '2026-07-04',
      playerCount: 3,
      playerScores: {},
      playerSelections: {},
      playerStyles: {},
      promoSetSlugs: ['2022-seasonal-promos'],
      selectedPlayerIds: ['player-1', 'player-2', 'player-3'],
    });
  });

  it('prefills optional card-point breakdowns when the imported log exposes them for matched participants', () => {
    expect(
      buildImportDraft({
        awardOptions: [{ awardId: 'award-1', awardName: 'Landlord', mapId: 'elysium' }],
        defaultExpansionCodes: ['base'],
        defaultPromoSetSlugs: [],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: null,
          exportedGameLog: 'Imported score breakdown rows.',
          generationCount: 12,
          mapId: 'elysium',
          participantNames: ['Friday Mars', 'Second Seat', 'Third Seat'],
          playedOn: '2026-07-04',
          playerCount: 3,
        },
        milestoneOptions: [
          { mapId: 'elysium', milestoneId: 'milestone-1', milestoneName: 'Builder' },
        ],
        parsedGameLog: {
          cardPointBreakdowns: [
            {
              cardPointsAnimals: 2,
              cardPointsJovian: 6,
              cardPointsMicrobes: 4,
              eventType: 'card_points_breakdown',
              lineNumber: 14,
              playerName: 'friday mars',
              rawLine: 'Friday Mars Microbes 4 Animals 2 Jovian 6',
            },
          ],
          events: [
            {
              actor: 'Friday Mars',
              eventType: 'milestone_claimed',
              lineNumber: 10,
              milestone: 'Builder',
              rawLine: 'Friday Mars claimed Builder milestone',
            },
            {
              actor: 'Second Seat',
              award: 'Landlord',
              eventType: 'award_funded',
              lineNumber: 11,
              rawLine: 'Second Seat funded Landlord award',
            },
            {
              actor: 'Friday Mars',
              award: 'Landlord',
              eventType: 'award_result',
              lineNumber: 12,
              placement: 'first',
              rawLine: 'Friday Mars won first place on Landlord award',
            },
            {
              actor: 'Third Seat',
              award: 'Landlord',
              eventType: 'award_result',
              lineNumber: 13,
              placement: 'second',
              rawLine: 'Third Seat won second place on Landlord award',
            },
          ],
        },
        selectedPlayerIds: ['player-1', 'player-2', 'player-3'],
      }),
    ).toMatchObject({
      awardClaims: {
        'award-1': {
          firstPlaceWinnerPlayerIds: ['player-1'],
          funded: true,
          fundedByPlayerId: 'player-2',
          secondPlaceWinnerPlayerIds: ['player-3'],
        },
      },
      milestoneClaims: {
        'milestone-1': {
          claimed: true,
          winnerPlayerId: 'player-1',
        },
      },
      playerScores: {
        'player-1': {
          cardPointsAnimals: 2,
          cardPointsJovian: 6,
          cardPointsMicrobes: 4,
        },
      },
    });
  });

  it('maps confirmed player links and screenshot scores into the shared draft', () => {
    expect(
      buildImportDraft({
        defaultExpansionCodes: ['base'],
        defaultPromoSetSlugs: [],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: 'endgame.png',
          exportedGameLog: 'Izzy played Earth Catapult',
          generationCount: 11,
          mapId: 'tharsis',
          participantNames: ['Izzy', 'Corey'],
          playedOn: '2026-07-04',
          playerCount: 2,
        },
        playerSelections: [
          { importedName: 'Izzy', playerId: 'player-1' },
          { importedName: 'Corey', playerId: 'player-2' },
        ],
        scoreCandidates: [
          {
            cardPointsAnimals: 2,
            cardPointsJovian: 6,
            cardPointsMicrobes: 4,
            cardPointsTotal: 22,
            citiesPoints: 10,
            finalMegacredits: 8,
            greeneryPoints: 5,
            playerName: 'Izzy',
            totalPoints: 62,
            trPoints: 18,
          },
          { playerName: 'Corey', totalPoints: 45, trPoints: 16 },
        ],
        selectedPlayerIds: ['player-1', 'player-2'],
      }).playerScores,
    ).toMatchObject({
      'player-1': {
        cardPointsAnimals: 2,
        cardPointsJovian: 6,
        cardPointsMicrobes: 4,
        cardPointsTotal: 22,
        citiesPoints: 10,
        greeneryPoints: 5,
        totalPoints: 62,
        trPoints: 18,
      },
      'player-2': {
        totalPoints: 45,
        trPoints: 16,
      },
    });
  });
});
