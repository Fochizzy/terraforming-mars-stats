import { describe, expect, it } from 'vitest';
import {
  boardTerrainByMap,
  buildTerrainBySpaceId,
  reservedCityByMap,
  specialSpacesByMap,
} from './board-terrain-data';
import { supportedBoardMapIds } from './board-space-maps';

describe('boardTerrainByMap', () => {
  it('reserves exactly 12 ocean spaces on every map', () => {
    for (const mapId of supportedBoardMapIds) {
      expect(boardTerrainByMap[mapId].ocean).toHaveLength(12);
    }
  });

  it('keys terrain by valid, unique on-planet ids with no overlapping types', () => {
    for (const mapId of supportedBoardMapIds) {
      const terrain = boardTerrainByMap[mapId];
      const allIds = [
        ...terrain.ocean,
        ...(terrain.cove ?? []),
        ...(terrain.restricted ?? []),
        ...(terrain.volcanic ?? []),
      ];

      // Every id is a zero-padded on-planet space id "03".."63".
      for (const id of allIds) {
        expect(id).toMatch(/^\d{2}$/);
        expect(Number(id)).toBeGreaterThanOrEqual(3);
        expect(Number(id)).toBeLessThanOrEqual(63);
      }

      // No space is assigned to two terrain categories.
      expect(new Set(allIds).size).toBe(allIds.length);
    }
  });

  it('flattens terrain into a spaceId lookup', () => {
    const tharsis = buildTerrainBySpaceId('tharsis');
    expect(tharsis['32']).toBe('ocean');
    expect(tharsis['21']).toBe('volcanic');
    expect(tharsis['20']).toBeUndefined(); // plain land

    const arabia = buildTerrainBySpaceId('arabia_terra');
    expect(arabia['32']).toBe('cove');
  });

  it('reserves Noctis City only on Tharsis', () => {
    expect(reservedCityByMap.tharsis).toEqual({
      reservedTile: 'Noctis City',
      spaceId: '31',
    });
    expect(reservedCityByMap.hellas).toBeUndefined();
    expect(reservedCityByMap.amazonis_planitia).toBeUndefined();
    // Noctis must not be one of Tharsis's ocean spaces.
    expect(boardTerrainByMap.tharsis.ocean).not.toContain('31');
  });

  it('flags the Hellas ocean space and Vastitas north pole special spaces', () => {
    expect(specialSpacesByMap.hellas).toEqual({ '61': 'Hellas Ocean' });
    expect(specialSpacesByMap.vastitas_borealis).toEqual({
      '33': 'Vastitas Borealis North Pole',
    });
    expect(specialSpacesByMap.tharsis).toBeUndefined();

    // The Hellas ocean space is special land, not one of the 12 reserved oceans.
    expect(boardTerrainByMap.hellas.ocean).not.toContain('61');
  });
});
