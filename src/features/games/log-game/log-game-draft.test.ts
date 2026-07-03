import { describe, expect, it } from 'vitest';
import { cloneGameSetup } from './use-log-game-draft';

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
