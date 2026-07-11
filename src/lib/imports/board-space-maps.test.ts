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

  it('overlays each map with its own 12 reserved ocean spaces', () => {
    const oceanCounts = (
      [
        'tharsis',
        'hellas',
        'elysium',
        'amazonis_planitia',
        'arabia_terra',
        'terra_cimmeria',
        'vastitas_borealis',
        'utopia_planitia',
      ] as const
    ).map((mapId) => {
      const spaces = getBoardSpaceMap(mapId).spaces;
      return Object.values(spaces).filter(
        (space) => space?.terrain === 'ocean',
      ).length;
    });

    // Every official Mars board reserves exactly 12 ocean spaces.
    expect(oceanCounts).toEqual([12, 12, 12, 12, 12, 12, 12, 12]);
  });

  it('carries authoritative per-map terrain and the Noctis reserved city', () => {
    const tharsis = getBoardSpaceMap('tharsis').spaces;
    // A Tharsis ocean space, and a volcanic land space.
    expect(tharsis['32']).toMatchObject({ id: '32', terrain: 'ocean' });
    expect(tharsis['21']).toMatchObject({ id: '21', terrain: 'volcanic' });
    // Noctis City is a reserved city (land), so it has no ocean terrain.
    expect(tharsis['31']).toMatchObject({ id: '31', reservedTile: 'Noctis City' });
    expect(tharsis['31']).not.toHaveProperty('terrain');
    // Terrain is map-specific: hex 32 is ocean on Tharsis but a cove on Arabia Terra.
    expect(getBoardSpaceMap('arabia_terra').spaces['32']).toMatchObject({
      terrain: 'cove',
    });
    expect(getBoardSpaceMap('amazonis_planitia').spaces['33']).toMatchObject({
      terrain: 'restricted',
    });
    // A plain land hex has no terrain marker.
    expect(getBoardSpaceMap('hellas').spaces['20']).not.toHaveProperty('terrain');
  });

  it('flags the special landmark spaces on Hellas and Vastitas Borealis', () => {
    // Hellas south-pole ocean space (SpaceName.HELLAS_OCEAN_TILE = "61").
    expect(getBoardSpaceMap('hellas').spaces['61']).toMatchObject({
      id: '61',
      specialSpace: 'Hellas Ocean',
    });
    // Vastitas Borealis north pole (SpaceName.VASTITAS_BOREALIS_NORTH_POLE = "33").
    expect(getBoardSpaceMap('vastitas_borealis').spaces['33']).toMatchObject({
      id: '33',
      specialSpace: 'Vastitas Borealis North Pole',
    });
    // Those ids are ordinary spaces on other maps.
    expect(getBoardSpaceMap('tharsis').spaces['61']).not.toHaveProperty(
      'specialSpace',
    );
    expect(getBoardSpaceMap('elysium').spaces['33']).not.toHaveProperty(
      'specialSpace',
    );
  });

  it('rejects unsupported board map ids', () => {
    expect(isSupportedBoardMapId('custom')).toBe(false);
    expect(() => getBoardSpaceMap('custom')).toThrowError(
      'Unsupported board map for curated board import: custom',
    );
  });
});
