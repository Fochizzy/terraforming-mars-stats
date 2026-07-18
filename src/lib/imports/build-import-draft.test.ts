import { describe, expect, it } from 'vitest';
import { buildImportDraft } from './build-import-draft';

describe('buildImportDraft', () => {
  it('builds a cloud draft payload from import values and group defaults', () => {
    expect(
      buildImportDraft({
        defaultGuaranteedMergerOffer: true,
        defaultPromoSetSlugs: ['2022-promos'],
        groupId: '11111111-1111-4111-8111-111111111111',
        importValues: {
          endgameScreenshotName: 'endgame.png',
          exportedGameLog: 'Friday Mars won by 6 points.',
          generationCount: 12,
          mapId: 'elysium',
          playedOn: '2026-07-04',
          playerIdentities: [],
          playerCount: 3,
        },
      }),
    ).toEqual({
      awardClaims: {},
      gameId: undefined,
      generationCount: 12,
      guaranteedMergerOffer: true,
      groupId: '11111111-1111-4111-8111-111111111111',
      importedPlayerResolutions: [],
      mapId: 'elysium',
      // No objective setup was supplied, so the imported draft stays unknown
      // until the importer confirms board-defined or randomized objectives.
      objectiveConfiguration: 'unknown',
      mergerOfferRuleSource: 'group_default',
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
      promoSetSlugs: ['2022-promos'],
      selectedPlayerIds: [],
    });
  });

  it('preserves resolved player IDs and import provenance in the draft', () => {
    const playerResolutions = [
      {
        decision: 'reused' as const,
        identityMode: 'personal_name' as const,
        normalizedImportedValue: 'known private name',
        parserIdentity: 'manual-web-import-v1' as const,
        selectedPlayerId: '22222222-2222-4222-8222-222222222222',
        sourceFormat: 'manual_web_import' as const,
        sourcePlayerText: 'Known Private Name',
        state: 'existing_unlinked_guest' as const,
        valueSource: 'user_corrected' as const,
      },
      {
        decision: 'created' as const,
        identityMode: 'username' as const,
        normalizedImportedValue: 'new-guest',
        parserIdentity: 'manual-web-import-v1' as const,
        selectedPlayerId: '33333333-3333-4333-8333-333333333333',
        sourceFormat: 'manual_web_import' as const,
        sourcePlayerText: 'New_Guest',
        state: 'newly_created_unlinked_guest' as const,
        valueSource: 'user_corrected' as const,
      },
    ];

    const draft = buildImportDraft({
      defaultGuaranteedMergerOffer: false,
      defaultPromoSetSlugs: [],
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        exportedGameLog: 'Original evidence',
        generationCount: 10,
        mapId: 'tharsis',
        playedOn: '2026-07-04',
        playerIdentities: [],
        playerCount: 2,
      },
      playerResolutions,
    });

    expect(draft.selectedPlayerIds).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    ]);
    expect(draft.importedPlayerResolutions).toEqual(playerResolutions);
  });

  it('maps screenshot score evidence to the preserved imported player ID', () => {
    const playerId = '22222222-2222-4222-8222-222222222222';
    const draft = buildImportDraft({
      defaultGuaranteedMergerOffer: true,
      defaultPromoSetSlugs: [],
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        exportedGameLog: 'Good luck Friday Mars!',
        generationCount: 12,
        mapId: 'tharsis',
        objectiveEvidence: [
          {
            candidateEntityIds: ['milestone-mayor'],
            canonicalId: 'milestone-mayor',
            canonicalName: 'Mayor',
            lineNumber: 3,
            normalizedPlayerValue: 'friday mars',
            normalizedValue: 'mayor',
            originalLine: 'Friday Mars claimed Mayor milestone',
            originalPlayerValue: 'Friday Mars',
            originalValue: 'Mayor',
            resolution: 'exact',
            source: 'exported_log',
            type: 'milestone',
          },
          {
            candidateEntityIds: ['award-scientist'],
            canonicalId: 'award-scientist',
            canonicalName: 'Scientist',
            lineNumber: 4,
            normalizedPlayerValue: 'friday mars',
            normalizedValue: 'scientist',
            originalLine: 'Friday Mars funded Scientist award',
            originalPlayerValue: 'Friday Mars',
            originalValue: 'Scientist',
            resolution: 'exact',
            source: 'exported_log',
            type: 'award',
          },
        ],
        parsedPromoSetSlugs: ['2024-promos'],
        playedEntityEvidence: [
          {
            candidateEntityIds: ['corp-ecoline'],
            canonicalId: 'corp-ecoline',
            canonicalName: 'Ecoline',
            entityType: 'corporation',
            lineNumber: 5,
            normalizedPlayerValue: 'friday mars',
            normalizedValue: 'ecoline',
            originalLine: 'Friday Mars played Ecoline',
            originalPlayerValue: 'Friday Mars',
            originalValue: 'Ecoline',
            promoSetSlug: null,
            resolution: 'exact',
          },
          {
            candidateEntityIds: ['prelude-allied-banks'],
            canonicalId: 'prelude-allied-banks',
            canonicalName: 'Allied Banks',
            entityType: 'prelude',
            lineNumber: 6,
            normalizedPlayerValue: 'friday mars',
            normalizedValue: 'allied banks',
            originalLine: 'Friday Mars played Allied Banks',
            originalPlayerValue: 'Friday Mars',
            originalValue: 'Allied Banks',
            promoSetSlug: null,
            resolution: 'exact',
          },
        ],
        playedOn: '2026-07-04',
        playerIdentities: [],
        playerCount: 1,
        scoreRows: [
          {
            awardPoints: 5,
            cardPointsTotal: 20,
            citiesPoints: 8,
            finalMegacredits: 12,
            greeneryPoints: 12,
            milestonePoints: 5,
            normalizedPlayerName: 'friday mars',
            originalPlayerName: 'Friday Mars',
            sourceWords: ['Friday', 'Mars', '40', '5', '5', '12', '8', '20', '90', '12'],
            status: 'exact_base_layout',
            totalPoints: 90,
            trPoints: 40,
            unsupportedComponentCount: 0,
          },
        ],
      },
      playerResolutions: [
        {
          decision: 'reused',
          identityMode: 'username',
          normalizedImportedValue: 'fridaymars',
          parserIdentity: 'manual-web-import-v1',
          selectedPlayerId: playerId,
          sourceFormat: 'manual_web_import',
          sourcePlayerText: 'Friday Mars',
          state: 'linked_registered_player',
          valueSource: 'user_corrected',
        },
      ],
    });

    expect(draft.playerScores[playerId]).toEqual({
      awardPoints: 5,
      cardPointsTotal: 20,
      citiesPoints: 8,
      finalMegacredits: 12,
      greeneryPoints: 12,
      milestonePoints: 5,
      totalPoints: 90,
      trPoints: 40,
    });
    expect(draft.milestoneClaims).toEqual({
      'milestone-mayor': { claimed: true, winnerPlayerId: playerId },
    });
    expect(draft.awardClaims).toEqual({
      'award-scientist': {
        firstPlaceWinnerPlayerIds: [],
        funded: true,
        fundedByPlayerId: playerId,
        secondPlaceWinnerPlayerIds: [],
      },
    });
    expect(draft.playerSelections).toEqual({
      [playerId]: {
        corporationId: 'corp-ecoline',
        preludeIds: ['prelude-allied-banks'],
      },
    });
    expect(draft.promoSetSlugs).toEqual(['2024-promos']);
  });

  it('maps PDF first-name evidence and award placements to preserved full-name player IDs', () => {
    const jamesId = '22222222-2222-4222-8222-222222222222';
    const coletteId = '33333333-3333-4333-8333-333333333333';
    const playerResolutions = [
      {
        decision: 'reused' as const,
        identityMode: 'personal_name' as const,
        normalizedImportedValue: 'james hodnett',
        parserIdentity: 'manual-web-import-v1' as const,
        selectedPlayerId: jamesId,
        sourceFormat: 'manual_web_import' as const,
        sourcePlayerText: 'James Hodnett',
        state: 'existing_unlinked_guest' as const,
        valueSource: 'imported' as const,
      },
      {
        decision: 'reused' as const,
        identityMode: 'personal_name' as const,
        normalizedImportedValue: 'colette hodnett',
        parserIdentity: 'manual-web-import-v1' as const,
        selectedPlayerId: coletteId,
        sourceFormat: 'manual_web_import' as const,
        sourcePlayerText: 'Colette Hodnett',
        state: 'existing_unlinked_guest' as const,
        valueSource: 'imported' as const,
      },
    ];

    const draft = buildImportDraft({
      defaultGuaranteedMergerOffer: false,
      defaultPromoSetSlugs: [],
      groupId: '11111111-1111-4111-8111-111111111111',
      importValues: {
        exportedGameLog: 'Good luck James Hodnett!\nGood luck Colette Hodnett!',
        generationCount: 10,
        mapId: 'map-hellas',
        objectiveEvidence: [
          {
            candidateEntityIds: ['milestone-polar-explorer'],
            canonicalId: 'milestone-polar-explorer',
            canonicalName: 'Polar Explorer',
            lineNumber: 1,
            normalizedPlayerValue: 'james',
            normalizedValue: 'polar explorer',
            originalLine: 'Claimed Polar Explorer milestone 5',
            originalPlayerValue: 'James',
            originalValue: 'Polar Explorer',
            resolution: 'exact',
            source: 'result_pdf',
            type: 'milestone',
          },
        ],
        playedOn: '2026-07-11',
        playerIdentities: [],
        playerCount: 2,
        resultAwardPlacements: [
          {
            awardName: 'Excentric',
            fundedByPlayerName: 'Colette',
            matchedAwardId: 'award-excentric',
            placement: 1,
            playerName: 'James',
            points: 5,
          },
          {
            awardName: 'Excentric',
            fundedByPlayerName: 'Colette',
            matchedAwardId: 'award-excentric',
            placement: 2,
            playerName: 'Colette',
            points: 2,
          },
        ],
        scoreRows: [
          {
            awardPoints: 5,
            cardPointsTotal: 17,
            citiesPoints: 10,
            finalMegacredits: 87,
            greeneryPoints: 7,
            milestonePoints: 5,
            normalizedPlayerName: 'james',
            originalPlayerName: 'James',
            sourceWords: ['James', '44', '5', '5', '7', '10', '17', '88', '87'],
            status: 'exact_base_layout',
            totalPoints: 88,
            trPoints: 44,
            unsupportedComponentCount: 0,
          },
          {
            awardPoints: 2,
            cardPointsTotal: 25,
            citiesPoints: 2,
            finalMegacredits: 56,
            greeneryPoints: 0,
            milestonePoints: 0,
            normalizedPlayerName: 'colette',
            originalPlayerName: 'Colette',
            sourceWords: ['Colette', '29', '0', '2', '0', '2', '25', '58', '56'],
            status: 'exact_base_layout',
            totalPoints: 58,
            trPoints: 29,
            unsupportedComponentCount: 0,
          },
        ],
      },
      playerResolutions,
    });

    expect(draft.playerScores).toHaveProperty(jamesId);
    expect(draft.playerScores).toHaveProperty(coletteId);
    expect(draft.milestoneClaims['milestone-polar-explorer']).toEqual({
      claimed: true,
      winnerPlayerId: jamesId,
    });
    expect(draft.awardClaims['award-excentric']).toEqual({
      firstPlaceWinnerPlayerIds: [jamesId],
      funded: true,
      fundedByPlayerId: coletteId,
      secondPlaceWinnerPlayerIds: [coletteId],
    });
  });
});
