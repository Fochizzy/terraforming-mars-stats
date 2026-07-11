import { describe, expect, it } from 'vitest';
import { boardSpaceFromRowPosition } from './board-space-from-row-position';

describe('boardSpaceFromRowPosition', () => {
  it('maps the first on-planet hex to zero-padded space "03"', () => {
    expect(boardSpaceFromRowPosition(1, 1)).toBe('03');
  });

  it('maps the last on-planet hex to space "63"', () => {
    expect(boardSpaceFromRowPosition(9, 5)).toBe('63');
  });

  it('accumulates prior row lengths for interior rows', () => {
    // Rows 1-2 hold 11 hexes, so row 3 position 7 is the 18th hex => "20".
    expect(boardSpaceFromRowPosition(3, 7)).toBe('20');
    // Middle of the widest row (row 5, position 5) is the 31st hex => "33".
    expect(boardSpaceFromRowPosition(5, 5)).toBe('33');
  });

  it('rejects positions beyond a row length', () => {
    expect(boardSpaceFromRowPosition(1, 6)).toBeNull();
    expect(boardSpaceFromRowPosition(9, 6)).toBeNull();
  });

  it('rejects rows outside the board', () => {
    expect(boardSpaceFromRowPosition(0, 1)).toBeNull();
    expect(boardSpaceFromRowPosition(10, 1)).toBeNull();
  });
});
