import { describe, expect, it } from 'vitest';
import { buildImportDraft } from './build-import-draft';
import type { CuratedBoardImportItem } from './score-curated-board-import-items';

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

  it('keeps milestone claims map-aware instead of hard-coding Tharsis names', () => {
    expect(
      buildImportDraft({
        defaultExpansionCodes: ['base'],
        defaultPromoSetSlugs: [],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: null,
          exportedGameLog: 'Imported score breakdown rows.',
          generationCount: 12,
          mapId: 'hellas',
          participantNames: ['Friday Mars'],
          playedOn: '2026-07-04',
          playerCount: 1,
        },
        milestoneOptions: [
          { mapId: 'hellas', milestoneId: 'milestone-1', milestoneName: 'Polar Explorer' },
          { mapId: 'tharsis', milestoneId: 'milestone-2', milestoneName: 'Mayor' },
        ],
        parsedGameLog: {
          cardPointBreakdowns: [],
          events: [
            {
              actor: 'Friday Mars',
              eventType: 'milestone_claimed',
              lineNumber: 10,
              milestone: 'Polar Explorer',
              rawLine: 'Friday Mars claimed Polar Explorer milestone',
            },
            {
              actor: 'Friday Mars',
              eventType: 'milestone_claimed',
              lineNumber: 11,
              milestone: 'Mayor',
              rawLine: 'Friday Mars claimed Mayor milestone',
            },
          ],
        },
        selectedPlayerIds: ['player-1'],
      }).milestoneClaims,
    ).toEqual({
      'milestone-1': {
        claimed: true,
        winnerPlayerId: 'player-1',
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

  it('uses complete calculated card scoring when imported evidence can justify final card totals', () => {
    expect(
      buildImportDraft({
        cardScoring: [
          {
            autoScoredCards: [
              {
                cardId: 'card-1',
                cardName: 'Pets',
                category: 'animals',
                evidenceSummary: '3 animal => 3 VP',
                humanSummary: '1 VP per animal on this card',
                points: 3,
                sourceType: 'curated',
              },
              {
                cardId: 'card-2',
                cardName: 'Research Network',
                category: 'other',
                evidenceSummary: '2 science tags => 2 VP',
                humanSummary: '1 VP per science tag you have',
                points: 2,
                sourceType: 'ocr',
              },
            ],
            pendingCards: [],
            playerName: 'Friday Mars',
            totals: {
              animals: 3,
              complete: true,
              jovian: 0,
              microbes: 0,
              other: 2,
              total: 5,
            },
          },
        ],
        defaultExpansionCodes: ['base'],
        defaultPromoSetSlugs: [],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: 'endgame.png',
          exportedGameLog: 'Friday Mars played Pets',
          generationCount: 11,
          mapId: 'tharsis',
          participantNames: ['Friday Mars'],
          playedOn: '2026-07-04',
          playerCount: 1,
        },
        playerSelections: [
          { importedName: 'Friday Mars', playerId: 'player-1' },
        ],
        selectedPlayerIds: ['player-1'],
      }).playerScores,
    ).toEqual({
      'player-1': {
        cardPointsAnimals: 3,
        cardPointsTotal: 5,
      },
    });
  });

  it('does not double count proved curated board card points on top of a complete calculated card total', () => {
    expect(
      buildImportDraft({
        cardScoring: [
          {
            autoScoredCards: [
              {
                cardId: 'card-1',
                cardName: 'Pets',
                category: 'animals',
                evidenceSummary: '3 animal => 3 VP',
                humanSummary: '1 VP per animal on this card',
                points: 3,
                sourceType: 'curated',
              },
              {
                cardId: 'card-2',
                cardName: 'Research Network',
                category: 'other',
                evidenceSummary: '2 science tags => 2 VP',
                humanSummary: '1 VP per science tag you have',
                points: 2,
                sourceType: 'ocr',
              },
            ],
            pendingCards: [],
            playerName: 'Friday Mars',
            totals: {
              animals: 3,
              complete: true,
              jovian: 0,
              microbes: 0,
              other: 2,
              total: 5,
            },
          },
        ],
        curatedBoardItems: [
          {
            cardName: 'Commercial District',
            itemType: 'card',
            mapId: 'tharsis',
            notes: ['The Commercial District placement had 3 adjacent cities.'],
            playerName: 'Friday Mars',
            points: 3,
            sourceType: 'log_and_board',
            status: 'proved',
          },
        ],
        defaultExpansionCodes: ['base'],
        defaultPromoSetSlugs: [],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: 'endgame.png',
          exportedGameLog: 'Friday Mars played Pets',
          generationCount: 11,
          mapId: 'tharsis',
          participantNames: ['Friday Mars'],
          playedOn: '2026-07-04',
          playerCount: 1,
        },
        playerSelections: [
          { importedName: 'Friday Mars', playerId: 'player-1' },
        ],
        selectedPlayerIds: ['player-1'],
      }).playerScores,
    ).toMatchObject({
      'player-1': {
        cardPointsAnimals: 3,
        cardPointsTotal: 5,
      },
    });
  });

  it('leaves cardPointsTotal unset when only partial calculated categories and separate proved board-card points are available', () => {
    const draft = buildImportDraft({
      cardScoring: [
        {
          autoScoredCards: [
            {
              cardId: 'card-1',
              cardName: 'Pets',
              category: 'animals',
              evidenceSummary: '3 animal => 3 VP',
              humanSummary: '1 VP per animal on this card',
              points: 3,
              sourceType: 'curated',
            },
          ],
          pendingCards: [
            {
              cardId: 'card-2',
              cardName: 'Commercial District',
              reason: 'Commercial District still needs board confirmation.',
              requestedSpaceIds: ['21'],
              reviewKind: 'board_evidence',
            },
          ],
          playerName: 'Friday Mars',
          totals: {
            animals: 3,
            complete: false,
            jovian: 0,
            microbes: 0,
            other: 0,
            total: 3,
          },
        },
      ],
      curatedBoardItems: [
        {
          cardName: 'Commercial District',
          itemType: 'card',
          mapId: 'tharsis',
          notes: ['The Commercial District placement had 2 adjacent cities.'],
          playerName: 'Friday Mars',
          points: 2,
          sourceType: 'log_and_board',
          status: 'proved',
        },
      ],
      defaultExpansionCodes: ['base'],
      defaultPromoSetSlugs: [],
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: 'Friday Mars played Pets',
        generationCount: 11,
        mapId: 'tharsis',
        participantNames: ['Friday Mars'],
        playedOn: '2026-07-04',
        playerCount: 1,
      },
      playerSelections: [{ importedName: 'Friday Mars', playerId: 'player-1' }],
      selectedPlayerIds: ['player-1'],
    });

    expect(draft.playerScores['player-1']).toMatchObject({
      cardPointsAnimals: 3,
    });
    expect(draft.playerScores['player-1']?.cardPointsTotal).toBeUndefined();
  });

  it('merges proved curated board award values and leaves unresolved board card values unset', () => {
    const curatedBoardItems: CuratedBoardImportItem[] = [
      {
        awardName: 'Cultivator',
        firstPlacePlayerNames: ['Friday Mars'],
        fundedByPlayerName: 'Second Seat',
        itemType: 'award',
        mapId: 'hellas',
        notes: ['Greenery placements from the log proved the ranking.'],
        secondPlacePlayerNames: ['Third Seat'],
        sourceType: 'log',
        status: 'proved',
      },
      {
        cardName: 'Commercial District',
        itemType: 'card',
        mapId: 'hellas',
        notes: ['The placement could not be linked safely from the log.'],
        playerName: 'Friday Mars',
        sourceType: 'log_and_board',
        status: 'review_needed',
      },
      {
        cardName: 'Commercial District',
        itemType: 'card',
        mapId: 'hellas',
        notes: ['The Commercial District placement had 3 adjacent cities.'],
        playerName: 'Third Seat',
        points: 3,
        sourceType: 'log_and_board',
        status: 'proved',
      },
    ];

    expect(
      buildImportDraft({
        awardOptions: [{ awardId: 'award-1', awardName: 'Cultivator', mapId: 'hellas' }],
        curatedBoardItems,
        defaultExpansionCodes: ['base'],
        defaultPromoSetSlugs: [],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: null,
          exportedGameLog: 'Imported score breakdown rows.',
          generationCount: 12,
          mapId: 'hellas',
          participantNames: ['Friday Mars', 'Second Seat', 'Third Seat'],
          playedOn: '2026-07-04',
          playerCount: 3,
        },
        playerSelections: [
          { importedName: 'Friday Mars', playerId: 'player-1' },
          { importedName: 'Second Seat', playerId: 'player-2' },
          { importedName: 'Third Seat', playerId: 'player-3' },
        ],
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
      playerScores: {
        'player-1': {
          awardPoints: 5,
        },
        'player-3': {
          awardPoints: 2,
          cardPointsTotal: 3,
        },
      },
    });
  });

  it('prefills corporation, preludes, and style evidence while blanking conflicting log-versus-screenshot score fields', () => {
    const draft = buildImportDraft({
      awardOptions: [{ awardId: 'award-1', awardName: 'Landlord', mapId: 'tharsis' }],
      cardOptions: [
        {
          cardName: 'Earth Catapult',
          cardNumber: '001',
          expansionCode: 'base',
          id: 'card-1',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
        {
          cardName: 'Tardigrades',
          cardNumber: '002',
          expansionCode: 'base',
          id: 'card-2',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
        {
          cardName: 'Media Group',
          cardNumber: '003',
          expansionCode: 'base',
          id: 'card-3',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
      ],
      corporationOptions: [
        {
          expansionCode: 'base',
          id: 'corp-1',
          name: 'Tharsis Republic',
          promoSetSlug: null,
          requiredExpansionCodes: ['base'],
        },
      ],
      defaultExpansionCodes: ['base', 'prelude'],
      defaultPromoSetSlugs: [],
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        endgameScreenshotName: 'endgame.png',
        exportedGameLog: [
          'Friday Mars chose corporation Tharsis Republic',
          'Friday Mars kept preludes Allied Bank, Corporate Archives',
          'Friday Mars claimed Builder milestone',
          'Friday Mars funded Landlord award',
          'Friday Mars played Earth Catapult',
          'Friday Mars played Tardigrades',
          'Friday Mars played Media Group',
          'Friday Mars added 2 microbes to Tardigrades',
          'Friday Mars: Cities 4, Greenery 9, Cards 18, TR 36, Total 87, MC 11',
        ].join('\n'),
        generationCount: 11,
        mapId: 'tharsis',
        participantNames: ['Friday Mars'],
        playedOn: '2026-07-04',
        playerCount: 1,
      },
      milestoneOptions: [
        { mapId: 'tharsis', milestoneId: 'milestone-1', milestoneName: 'Builder' },
      ],
      parsedGameLog: {
        cardPointBreakdowns: [
          {
            cardPointsAnimals: 3,
            cardPointsJovian: 4,
            cardPointsMicrobes: 2,
            eventType: 'card_points_breakdown',
            lineNumber: 10,
            playerName: 'Friday Mars',
            rawLine: 'Friday Mars Microbes 2 Animals 3 Jovian 4',
          },
        ],
        events: [
          {
            actor: 'Friday Mars',
            eventType: 'milestone_claimed',
            lineNumber: 3,
            milestone: 'Builder',
            rawLine: 'Friday Mars claimed Builder milestone',
          },
          {
            actor: 'Friday Mars',
            award: 'Landlord',
            eventType: 'award_funded',
            lineNumber: 4,
            rawLine: 'Friday Mars funded Landlord award',
          },
          {
            actor: 'Friday Mars',
            card: 'Earth Catapult',
            eventType: 'card_played',
            lineNumber: 5,
            rawLine: 'Friday Mars played Earth Catapult',
          },
          {
            actor: 'Friday Mars',
            card: 'Tardigrades',
            eventType: 'card_played',
            lineNumber: 6,
            rawLine: 'Friday Mars played Tardigrades',
          },
          {
            actor: 'Friday Mars',
            card: 'Media Group',
            eventType: 'card_played',
            lineNumber: 7,
            rawLine: 'Friday Mars played Media Group',
          },
          {
            actor: 'Friday Mars',
            card: 'Tardigrades',
            eventType: 'resource_changed',
            lineNumber: 8,
            operation: 'added',
            rawLine: 'Friday Mars added 2 microbes to Tardigrades',
            resourceAmount: 2,
            resourceType: 'microbe',
          },
          {
            actor: 'Friday Mars',
            award: 'Landlord',
            eventType: 'award_result',
            lineNumber: 9,
            placement: 'first',
            rawLine: 'Friday Mars won first place on Landlord award',
          },
        ],
      },
      playerSelections: [{ importedName: 'Friday Mars', playerId: 'player-1' }],
      preludeOptions: [
        {
          expansionCode: 'prelude',
          id: 'prelude-1',
          name: 'Allied Bank',
          promoSetSlug: null,
          requiredExpansionCodes: ['prelude'],
        },
        {
          expansionCode: 'prelude',
          id: 'prelude-2',
          name: 'Corporate Archives',
          promoSetSlug: null,
          requiredExpansionCodes: ['prelude'],
        },
      ],
      scoreCandidates: [
        {
          awardPoints: 5,
          cardPointsTotal: 20,
          finalMegacredits: 10,
          milestonePoints: 5,
          playerName: 'Friday Mars',
          totalPoints: 88,
          trPoints: 38,
        },
      ],
      selectedPlayerIds: ['player-1'],
      styleOptions: [
        {
          code: 'milestone_aggression',
          id: 'style-1',
          name: 'Milestone Aggression',
        },
        {
          code: 'award_pressure',
          id: 'style-2',
          name: 'Award Pressure',
        },
      ],
    });

    expect(draft).toMatchObject({
      awardClaims: {
        'award-1': {
          firstPlaceWinnerPlayerIds: ['player-1'],
          funded: true,
          fundedByPlayerId: 'player-1',
          secondPlaceWinnerPlayerIds: [],
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
          awardPoints: 5,
          cardPointsAnimals: 3,
          cardPointsJovian: 4,
          cardPointsMicrobes: 2,
          citiesPoints: 4,
          greeneryPoints: 9,
          milestonePoints: 5,
        },
      },
      playerSelections: {
        'player-1': {
          corporationId: 'corp-1',
          preludeIds: ['prelude-1', 'prelude-2'],
        },
      },
      playerStyles: {
        'player-1': {
          keyCardIds: ['card-2', 'card-3', 'card-1'],
          modifierStyleCodes: ['milestone_aggression', 'award_pressure'],
          primaryStyleCode: '',
        },
      },
    });
    expect(draft.playerScores['player-1']?.cardPointsTotal).toBeUndefined();
    expect(draft.playerScores['player-1']?.finalMegacredits).toBeUndefined();
    expect(draft.playerScores['player-1']?.totalPoints).toBeUndefined();
    expect(draft.playerScores['player-1']?.trPoints).toBeUndefined();
  });
});
