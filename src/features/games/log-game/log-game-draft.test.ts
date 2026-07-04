import { describe, expect, it } from 'vitest';
import { cloneGameSetup, mergeDraftIntoInitialValues } from './use-log-game-draft';

describe('cloneGameSetup', () => {
  it('copies setup fields without copying final results', () => {
    const cloned = cloneGameSetup({
      mapId: 'elysium',
      playerCount: 4,
      expansionCodes: ['base', 'prelude', 'colonies'],
      promoSetSlugs: ['2022-promos'],
      selectedPlayerIds: ['a', 'b', 'c', 'd'],
      totalPoints: [85, 79, 76, 63],
    });

    expect(cloned.mapId).toBe('elysium');
    expect(cloned.selectedPlayerIds).toHaveLength(4);
    expect('totalPoints' in cloned).toBe(false);
  });
});

describe('mergeDraftIntoInitialValues', () => {
  it('hydrates a saved draft shell without losing empty form collections', () => {
    const merged = mergeDraftIntoInitialValues(
      {
        awardClaims: {},
        expansionCodes: ['base'],
        gameId: undefined,
        generationCount: 10,
        groupId: '11111111-1111-4111-8111-111111111111',
        mapId: 'tharsis',
        milestoneClaims: {},
        notes: '',
        playedOn: '2026-07-03',
        playerCount: 2,
        playerScores: {},
        playerSelections: {},
        playerStyles: {},
        promoSetSlugs: [],
        selectedPlayerIds: [],
      },
      {
        expansionCodes: ['base', 'prelude'],
        gameId: 'game-1',
        generationCount: 12,
        mapId: 'elysium',
        notes: 'Imported evidence attached',
        playedOn: '2026-07-04',
        playerCount: 4,
        promoSetSlugs: ['2022-promos'],
      },
    );

    expect(merged.gameId).toBe('game-1');
    expect(merged.mapId).toBe('elysium');
    expect(merged.playerCount).toBe(4);
    expect(merged.generationCount).toBe(12);
    expect(merged.expansionCodes).toEqual(['base', 'prelude']);
    expect(merged.promoSetSlugs).toEqual(['2022-promos']);
    expect(merged.selectedPlayerIds).toEqual([]);
    expect(merged.playerScores).toEqual({});
  });
});
