import { describe, expect, it } from 'vitest';
import { fingerprintRows } from './historical-backfill-snapshot';

describe('fingerprintRows', () => {
  it('is stable across row and object-key order but changes with data', () => {
    const first = fingerprintRows([
      { game_id: 'game-2', score: 80 },
      { game_id: 'game-1', nested: { b: 2, a: 1 } },
    ]);
    const reordered = fingerprintRows([
      { nested: { a: 1, b: 2 }, game_id: 'game-1' },
      { score: 80, game_id: 'game-2' },
    ]);
    const changed = fingerprintRows([
      { game_id: 'game-2', score: 81 },
      { game_id: 'game-1', nested: { a: 1, b: 2 } },
    ]);

    expect(reordered).toBe(first);
    expect(changed).not.toBe(first);
  });
});
