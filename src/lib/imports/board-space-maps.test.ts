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

  it('recognizes the official board space ids even when adjacency is not yet trusted for scoring', () => {
    const tharsis = getBoardSpaceMap('tharsis');

    expect(tharsis.spaces['20']).toMatchObject({
      id: '20',
    });
    expect(tharsis.spaces['21']).toMatchObject({
      id: '21',
      neighbors: expect.any(Array),
    });
    expect(tharsis.spaces['31']).toMatchObject({
      id: '31',
      reservedTile: 'Noctis City',
    });
    expect(tharsis.spaces['63']).toMatchObject({
      id: '63',
    });
  });

  it('exposes empty region registries for all three supported maps until a rule needs them', () => {
    expect(getBoardSpaceMap('tharsis').regions).toEqual({});
    expect(getBoardSpaceMap('hellas').regions).toEqual({});
    expect(getBoardSpaceMap('elysium').regions).toEqual({});
  });

  it('rejects unsupported board map ids', () => {
    expect(isSupportedBoardMapId('custom')).toBe(false);
    expect(() => getBoardSpaceMap('custom')).toThrowError(
      'Unsupported board map for curated board import: custom',
    );
  });
});
