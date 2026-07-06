import { describe, expect, it } from 'vitest';
import { getBoardSpaceMap } from './board-space-maps';

describe('getBoardSpaceMap', () => {
  it('supports all three official board map ids', () => {
    const tharsis = getBoardSpaceMap('tharsis');
    const hellas = getBoardSpaceMap('hellas');
    const elysium = getBoardSpaceMap('elysium');

    expect(tharsis.mapId).toBe('tharsis');
    expect(hellas.mapId).toBe('hellas');
    expect(elysium.mapId).toBe('elysium');

    expect(tharsis.spaces['21']).toMatchObject({
      id: '21',
      neighbors: expect.any(Array),
    });
    expect(hellas.spaces['21']).toMatchObject({
      id: '21',
      neighbors: expect.any(Array),
    });
    expect(elysium.spaces['21']).toMatchObject({
      id: '21',
      neighbors: expect.any(Array),
    });

    expect(tharsis.spaces['31']).toMatchObject({
      id: '31',
      reservedTile: 'Noctis City',
    });
    expect(hellas.spaces['31']).toMatchObject({
      id: '31',
    });
    expect(elysium.spaces['31']).toMatchObject({
      id: '31',
    });
  });
});
