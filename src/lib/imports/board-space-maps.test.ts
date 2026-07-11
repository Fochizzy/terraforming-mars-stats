import { describe, expect, it } from 'vitest';
import { getBoardSpaceMap, isSupportedBoardMapId } from './board-space-maps';

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
    expect(hellas.spaces['31']).not.toHaveProperty('reservedTile');
    expect(elysium.spaces['31']).toMatchObject({
      id: '31',
    });
    expect(elysium.spaces['31']).not.toHaveProperty('reservedTile');
  });

  it('keys spaces by the app ids "03".."63" with full adjacency on every hex', () => {
    const tharsis = getBoardSpaceMap('tharsis');

    // 61 on-planet hexes; off-planet ids ("01"/"02") are not part of the grid.
    expect(Object.keys(tharsis.spaces)).toHaveLength(61);
    expect(tharsis.spaces['01']).toBeUndefined();
    expect(tharsis.spaces['03']).toMatchObject({ id: '03' });
    expect(tharsis.spaces['63']).toMatchObject({ id: '63' });

    // Every space carries a non-empty neighbour list now.
    for (const space of Object.values(tharsis.spaces)) {
      expect(space?.neighbors?.length).toBeGreaterThan(0);
    }

    // Known geometry: the left-edge hex "21" borders 14/22/29/30.
    expect(tharsis.spaces['21']).toMatchObject({
      id: '21',
      neighbors: ['14', '22', '29', '30'],
    });
    expect(tharsis.spaces['31']).toMatchObject({
      id: '31',
      reservedTile: 'Noctis City',
    });
  });

  it('exposes empty region registries for all three supported maps until a rule needs them', () => {
    expect(getBoardSpaceMap('tharsis').regions).toEqual({});
    expect(getBoardSpaceMap('hellas').regions).toEqual({});
    expect(getBoardSpaceMap('elysium').regions).toEqual({});
  });

  it('registers the additional official maps with the standard 61-hex geometry', () => {
    for (const mapId of [
      'amazonis_planitia',
      'arabia_terra',
      'terra_cimmeria',
      'vastitas_borealis',
      'utopia_planitia',
    ] as const) {
      expect(isSupportedBoardMapId(mapId)).toBe(true);

      const map = getBoardSpaceMap(mapId);
      expect(map.mapId).toBe(mapId);
      // Same shared board geometry as Tharsis (ids "03".."63" with adjacency).
      expect(Object.keys(map.spaces)).toHaveLength(61);
      expect(map.spaces['21']).toMatchObject({
        id: '21',
        neighbors: ['14', '22', '29', '30'],
      });
      expect(map.spaces['63']).toMatchObject({ id: '63' });
      // Noctis City is Tharsis-specific and must not leak onto other maps.
      expect(map.spaces['31']).not.toHaveProperty('reservedTile');
    }
  });

  it('rejects unsupported board map ids', () => {
    expect(isSupportedBoardMapId('custom')).toBe(false);
    expect(() => getBoardSpaceMap('custom')).toThrowError(
      'Unsupported board map for curated board import: custom',
    );
  });
});
