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
          playerCount: 3,
        },
      }),
    ).toEqual({
      awardClaims: {},
      gameId: undefined,
      generationCount: 12,
      guaranteedMergerOffer: true,
      groupId: '11111111-1111-4111-8111-111111111111',
      mapId: 'elysium',
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
});
