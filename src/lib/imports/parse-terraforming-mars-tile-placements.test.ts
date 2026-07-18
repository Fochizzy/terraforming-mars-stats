import { describe, expect, it } from 'vitest';
import {
  parseTerraformingMarsTilePlacements,
  rowPositionToSpaceId,
} from './parse-terraforming-mars-tile-placements';

// Real lines from Downloads exports: the 07-11 Hellas log ("… at NN") and the
// 07-08 Elysium/Tharsis logs ("… on row R position P"), plus an exporter-prefixed
// line and non-placement noise (gained / land claim / removed) to guard the parser.
const sampleLog = [
  'Corey placed city tile at 54',
  'Corey placed ocean tile at 34',
  'Izzy placed ocean tile at 35',
  'Corey placed Mining Rights tile at 53',
  'James placed Natural Preserve tile at 29',
  'Izzy gained 2 M€ from 1 ocean(s)',
  'Colette placed greenery tile at 04',
  '[12/48]: Izzy placed ocean tile at 03',
  'James placed ocean tile on row 1 position 3',
  'Izzy placed ocean tile on row 2 position 6',
  'James placed city tile on row 3 position 7',
  'Izzy placed land claim on row 5 position 6',
  'Izzy removed greenery tile on row 3 position 4',
].join('\n');

describe('rowPositionToSpaceId', () => {
  it('maps 1-based grid coordinates to flat space ids, matching real logs', () => {
    expect(rowPositionToSpaceId(1, 1)).toBe('03'); // first hex
    expect(rowPositionToSpaceId(1, 4)).toBe('06'); // real Tharsis ocean
    expect(rowPositionToSpaceId(1, 3)).toBe('05'); // real Elysium ocean
    expect(rowPositionToSpaceId(2, 6)).toBe('13'); // real Tharsis ocean
    expect(rowPositionToSpaceId(5, 4)).toBe('32'); // real Elysium ocean
    expect(rowPositionToSpaceId(9, 5)).toBe('63'); // last hex
  });

  it('rejects out-of-range coordinates', () => {
    expect(rowPositionToSpaceId(10, 1)).toBeNull();
    expect(rowPositionToSpaceId(5, 10)).toBeNull(); // row 5 has width 9
    expect(rowPositionToSpaceId(1, 0)).toBeNull();
  });
});

describe('parseTerraformingMarsTilePlacements', () => {
  it('parses flat-id and grid placements, ignoring non-placement lines', () => {
    const { placements } = parseTerraformingMarsTilePlacements(sampleLog);
    // 13 lines; gained / land-claim / removed lines are not placements.
    expect(placements).toHaveLength(10);
    expect(placements[0]).toMatchObject({
      actor: 'Corey',
      tileKind: 'city',
      rawTileType: 'city',
      spaceId: '54',
      format: 'flat-id',
    });
  });

  it('keeps multi-word special tile names intact and classifies them as special', () => {
    const { placements } = parseTerraformingMarsTilePlacements(sampleLog);
    const special = placements.filter((placement) => placement.tileKind === 'special');
    expect(special.map((placement) => placement.rawTileType)).toEqual([
      'Mining Rights',
      'Natural Preserve',
    ]);
  });

  it('converts grid coordinates to flat ids and tags the format', () => {
    const { placements } = parseTerraformingMarsTilePlacements(sampleLog);
    const grid = placements.filter((placement) => placement.format === 'grid');
    expect(grid.map((placement) => `${placement.spaceId}:${placement.tileKind}`)).toEqual([
      '05:ocean',
      '13:ocean',
      '20:city',
    ]);
  });

  it('strips the exporter [n/m]: prefix before matching', () => {
    const { placements } = parseTerraformingMarsTilePlacements(sampleLog);
    const prefixed = placements.find((placement) => placement.spaceId === '03');
    expect(prefixed).toMatchObject({ actor: 'Izzy', tileKind: 'ocean' });
  });

  it('collects distinct ocean space ids ascending across both formats', () => {
    const { oceanSpaceIds } = parseTerraformingMarsTilePlacements(sampleLog);
    expect(oceanSpaceIds).toEqual(['03', '05', '13', '34', '35']);
  });

  it('returns an empty set for empty input', () => {
    expect(parseTerraformingMarsTilePlacements('   ')).toEqual({
      placements: [],
      oceanSpaceIds: [],
      lineCount: 0,
    });
  });
});
