import { describe, expect, it } from 'vitest';
import {
  getWeightedSelectionVpScore,
  sortSelectionOriginRows,
} from './selection-origin-chart';

const rows = [
  {
    avg_points: 137,
    name: 'SolBank',
    plays: 1,
    win_rate: 1,
  },
  {
    avg_points: 136,
    name: 'EcoTec',
    plays: 1,
    win_rate: 1,
  },
  {
    avg_points: 124,
    name: 'Saturn Systems',
    plays: 8,
    win_rate: 0.625,
  },
];

describe('selection origin ranking', () => {
  it('weights best VP ranking by play count', () => {
    const sorted = sortSelectionOriginRows(rows, 'weightedVp');

    expect(sorted[0].name).toBe('Saturn Systems');
    expect(sorted.map((row) => row.name)).toEqual([
      'Saturn Systems',
      'SolBank',
      'EcoTec',
    ]);
  });

  it('keeps raw average VP available as an unweighted sort', () => {
    const sorted = sortSelectionOriginRows(rows, 'vp');

    expect(sorted[0].name).toBe('SolBank');
  });

  it('discounts one-play averages below repeated samples', () => {
    const onePlayScore = getWeightedSelectionVpScore(rows[0], 125);
    const repeatedScore = getWeightedSelectionVpScore(rows[2], 125);

    expect(onePlayScore).toBeLessThan(rows[0].avg_points);
    expect(repeatedScore).toBeGreaterThan(onePlayScore);
  });
});
