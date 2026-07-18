import { describe, expect, it } from 'vitest';
import {
  TERRAFORMING_MARS_TILE_TYPES,
  findTerraformingMarsTileType,
} from './terraforming-mars-tile-types';

describe('Terraforming Mars tile type registry', () => {
  it('covers every current upstream TileType exactly once', () => {
    expect(TERRAFORMING_MARS_TILE_TYPES).toHaveLength(45);
    expect(new Set(TERRAFORMING_MARS_TILE_TYPES.map((tile) => tile.canonicalCode)).size).toBe(45);
    expect(new Set(TERRAFORMING_MARS_TILE_TYPES.map((tile) => tile.canonicalName)).size).toBe(45);
  });

  it('recognizes base and special tile labels emitted by real logs', () => {
    expect(findTerraformingMarsTileType('ocean')).toMatchObject({
      canonicalCode: 'ocean',
      countsAsOcean: true,
      kind: 'ocean',
    });
    expect(findTerraformingMarsTileType('Mining Rights')).toMatchObject({
      canonicalCode: 'mining_rights',
      kind: 'special',
    });
    expect(findTerraformingMarsTileType('Natural Preserve')).toMatchObject({
      canonicalCode: 'natural_preserve',
      kind: 'special',
    });
  });

  it('keeps Moon tile space ids on a distinct board layer', () => {
    expect(findTerraformingMarsTileType('Mine')).toMatchObject({
      board: 'moon',
      canonicalCode: 'moon_mine',
    });
    expect(findTerraformingMarsTileType('Luna Trade Station')).toMatchObject({
      board: 'moon',
    });
  });

  it('retains upstream multi-category semantics for upgrade tiles', () => {
    expect(findTerraformingMarsTileType('Ocean City')).toMatchObject({
      countsAsCity: true,
      countsAsOcean: true,
    });
    expect(findTerraformingMarsTileType('Wetlands')).toMatchObject({
      countsAsGreenery: true,
      countsAsOcean: true,
    });
    expect(findTerraformingMarsTileType('Mild Dust Storm')?.isHazard).toBe(true);
  });

  it('does not invent a match for a future unknown label', () => {
    expect(findTerraformingMarsTileType('Unreleased Future Tile')).toBeNull();
  });
});
