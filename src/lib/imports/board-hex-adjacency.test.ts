import { describe, expect, it } from 'vitest';
import { buildBoardHexAdjacency } from './board-hex-adjacency';

describe('buildBoardHexAdjacency', () => {
  const adjacency = buildBoardHexAdjacency();
  const spaceIds = Object.keys(adjacency);

  it('covers all 61 on-planet hexes with zero-padded app ids', () => {
    expect(spaceIds).toHaveLength(61);
    expect(adjacency['03']).toBeDefined();
    expect(adjacency['63']).toBeDefined();
    expect(adjacency['02']).toBeUndefined();
    expect(adjacency['64']).toBeUndefined();
  });

  it('is symmetric: every neighbour links back', () => {
    for (const [spaceId, neighbors] of Object.entries(adjacency)) {
      for (const neighbor of neighbors) {
        expect(adjacency[neighbor]).toContain(spaceId);
      }
    }
  });

  it('gives every hex between 3 (corner) and 6 (interior) neighbours', () => {
    for (const neighbors of Object.values(adjacency)) {
      expect(neighbors.length).toBeGreaterThanOrEqual(3);
      expect(neighbors.length).toBeLessThanOrEqual(6);
    }
  });

  it('matches the known geometry for corner, edge, and interior hexes', () => {
    // Top-left corner (row 1, position 1) touches its right neighbour and the
    // two hexes of the wider row below it.
    expect(adjacency['03']).toEqual(['04', '08', '09']);
    // A left edge hex (row 4, position 1).
    expect(adjacency['21']).toEqual(['14', '22', '29', '30']);
    // Dead centre of the widest row (row 5, position 5) has all six neighbours.
    expect(adjacency['33']).toEqual(['24', '25', '32', '34', '41', '42']);
  });
});
