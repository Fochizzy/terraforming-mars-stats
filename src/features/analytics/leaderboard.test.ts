import { describe, expect, it } from 'vitest';
import { sortLeaderboardRows } from '@/lib/db/analytics-repo';

describe('sortLeaderboardRows', () => {
  it('sorts rows by weighted score descending', () => {
    const rows = sortLeaderboardRows([
      { player_name: 'A', weighted_score: 0.71 },
      { player_name: 'B', weighted_score: 0.84 },
    ]);

    expect(rows[0].player_name).toBe('B');
  });
});
