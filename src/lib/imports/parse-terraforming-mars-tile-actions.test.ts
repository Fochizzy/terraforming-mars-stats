import { describe, expect, it } from 'vitest';
import { TERRAFORMING_MARS_TILE_TYPES } from './terraforming-mars-tile-types';
import {
  parseTerraformingMarsTileActions,
  rowPositionToSpaceId,
} from './parse-terraforming-mars-tile-actions';

describe('parseTerraformingMarsTileActions', () => {
  it('recognizes every current upstream base, special, and Moon tile label', () => {
    const log = TERRAFORMING_MARS_TILE_TYPES.map((tile, index) => {
      const space = tile.board === 'moon' ? `m${index + 1}` : String(index + 3);
      return `Player placed a ${tile.canonicalName} tile at ${space}`;
    }).join('\n');
    const parsed = parseTerraformingMarsTileActions(log);

    expect(parsed.actions).toHaveLength(45);
    expect(parsed.unknownTileTypeCount).toBe(0);
    expect(parsed.actions.map((action) => action.canonicalTileCode)).toEqual(
      TERRAFORMING_MARS_TILE_TYPES.map((tile) => tile.canonicalCode),
    );
  });

  it('retains ordered placements and removals across current and historical formats', () => {
    const parsed = parseTerraformingMarsTileActions(
      [
        'Player A placed ocean tile at 34',
        'Player B placed Mining Rights tile on row 3 position 4',
        'Player B removed Mining Rights tile on row 3 position 4',
        '[4/4]: Player C placed a Mine tile at m03',
      ].join('\n'),
    );

    expect(parsed.placements).toHaveLength(3);
    expect(parsed.removals).toHaveLength(1);
    expect(parsed.oceanSpaceIds).toEqual(['34']);
    expect(parsed.actions[1]).toMatchObject({
      action: 'placed',
      canonicalTileCode: 'mining_rights',
      format: 'grid',
      spaceId: '17',
    });
    expect(parsed.actions[3]).toMatchObject({
      board: 'moon',
      canonicalTileCode: 'moon_mine',
      spaceId: 'm03',
    });
  });

  it('preserves future unknown labels as unresolved evidence', () => {
    const parsed = parseTerraformingMarsTileActions(
      'Player placed Unreleased Future Tile tile at 12',
    );
    expect(parsed.unknownTileTypeCount).toBe(1);
    expect(parsed.actions[0]).toMatchObject({
      canonicalTileCode: null,
      isKnownTileType: false,
      rawTileType: 'Unreleased Future Tile',
      tileKind: 'special',
    });
  });

  it('converts valid grid coordinates and rejects invalid ones', () => {
    expect(rowPositionToSpaceId(1, 1)).toBe('03');
    expect(rowPositionToSpaceId(9, 5)).toBe('63');
    expect(rowPositionToSpaceId(10, 1)).toBeNull();
  });

  it('returns a complete empty action set', () => {
    expect(parseTerraformingMarsTileActions('  ')).toEqual({
      actions: [],
      lineCount: 0,
      oceanSpaceIds: [],
      placements: [],
      removals: [],
      unknownTileTypeCount: 0,
    });
  });
});
