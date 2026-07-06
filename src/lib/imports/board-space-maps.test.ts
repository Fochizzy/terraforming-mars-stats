import { describe, expect, it } from 'vitest';
import { getBoardSpaceMap } from './board-space-maps';

describe('getBoardSpaceMap', () => {
  it('returns Tharsis space metadata for supported adjacency queries', () => {
    const tharsis = getBoardSpaceMap('tharsis');

    expect(tharsis.mapId).toBe('tharsis');
    expect(tharsis.spaces['21']).toMatchObject({
      id: '21',
      neighbors: expect.any(Array),
    });
    expect(tharsis.spaces['31']).toMatchObject({
      id: '31',
      reservedTile: 'Noctis City',
    });
  });
});
