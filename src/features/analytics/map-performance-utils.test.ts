import { describe, expect, it } from 'vitest';
import type { PlayerMapMetricRow } from '@/lib/db/analytics-repo';
import {
  computeOverallAverages,
  formatMapMetric,
  getMetricValue,
  getPerformanceDifference,
  getSampleSizeLabel,
  sortMapRows,
  type MapMetric,
} from './map-performance-utils';

const ROW_A: PlayerMapMetricRow = {
  averageGenerations: 10.0,
  averageNormalizedEfficiency: null,
  averagePoints: 80.0,
  averagePointsPerGeneration: 8.0,
  averageScoreDeltaVsExpected: null,
  bestScoreSourceOnMap: null,
  bestTagLaneOnMap: null,
  gamesPlayed: 10,
  groupId: 'g1',
  mapId: 'map-a',
  mapName: 'Alpha',
  mapRankForPlayer: 1,
  playerId: 'p1',
  winRate: 0.6,
  wins: 6,
};

const ROW_B: PlayerMapMetricRow = {
  ...ROW_A,
  mapId: 'map-b',
  mapName: 'Beta',
  gamesPlayed: 4,
  averagePoints: 95.0,
  winRate: 0.25,
  wins: 1,
  mapRankForPlayer: 2,
  averageGenerations: 9.0,
};

describe('formatMapMetric', () => {
  it.each<[MapMetric, number, string]>([
    ['winRate', 0.625, '63%'],
    ['winRate', 1, '100%'],
    ['winRate', 0, '0%'],
    ['averageScore', 82.4, '82.4'],
    ['averageScore', 80.0, '80.0'],
    ['gamesPlayed', 12, '12'],
    ['gamesPlayed', 3.9, '4'],
    ['avgGenerations', 10.5, '10.5'],
    ['avgGenerations', 9.0, '9.0'],
  ])('formatMapMetric(%s, %s) → %s', (metric, value, expected) => {
    expect(formatMapMetric(value, metric)).toBe(expected);
  });

  it('returns "—" for null value', () => {
    expect(formatMapMetric(null, 'averageScore')).toBe('—');
  });
});

describe('getSampleSizeLabel', () => {
  it.each<[number, string]>([
    [1, 'Very limited data'],
    [4, 'Very limited data'],
    [5, 'Limited data'],
    [9, 'Limited data'],
    [10, 'Moderate sample'],
    [19, 'Moderate sample'],
    [20, 'Stronger sample'],
    [50, 'Stronger sample'],
  ])('%i games → %s', (games, label) => {
    expect(getSampleSizeLabel(games)).toBe(label);
  });
});

describe('getPerformanceDifference', () => {
  it('returns null when value is null', () => {
    expect(getPerformanceDifference(null, 0.5, 'winRate')).toBeNull();
  });

  it('returns null when overallAverage is null', () => {
    expect(getPerformanceDifference(0.6, null, 'winRate')).toBeNull();
  });

  it('computes win rate delta in percentage points', () => {
    const result = getPerformanceDifference(0.625, 0.5, 'winRate');
    expect(result?.delta).toBe(13); // 63% - 50% = 13pp
    expect(result?.positive).toBe(true);
    expect(result?.formatted).toContain('+13');
  });

  it('handles negative win rate delta', () => {
    const result = getPerformanceDifference(0.4, 0.6, 'winRate');
    expect(result?.delta).toBe(-20);
    expect(result?.positive).toBe(false);
    expect(result?.formatted).toContain('-20');
  });

  it('computes score delta', () => {
    const result = getPerformanceDifference(85.0, 80.0, 'averageScore');
    expect(result?.delta).toBeCloseTo(5.0);
    expect(result?.positive).toBe(true);
  });
});

describe('getMetricValue', () => {
  it.each<[MapMetric, number]>([
    ['winRate', 0.6],
    ['averageScore', 80.0],
    ['gamesPlayed', 10],
    ['avgGenerations', 10.0],
  ])('returns correct value for %s', (metric, expected) => {
    expect(getMetricValue(ROW_A, metric)).toBe(expected);
  });
});

describe('computeOverallAverages', () => {
  it('returns nulls for empty array', () => {
    const result = computeOverallAverages([]);
    expect(result.winRate).toBeNull();
    expect(result.averageScore).toBeNull();
    expect(result.avgGenerations).toBeNull();
  });

  it('computes weighted averages across rows', () => {
    const result = computeOverallAverages([ROW_A, ROW_B]);
    // ROW_A: 10 games × 80 pts, ROW_B: 4 games × 95 pts → (800+380)/14 ≈ 84.3
    expect(result.averageScore).toBeCloseTo(84.29, 1);
    // ROW_A: 10 × 0.6, ROW_B: 4 × 0.25 → (6+1)/14 ≈ 0.5
    expect(result.winRate).toBeCloseTo(0.5, 2);
    expect(result.gamesPlayed).toBe(14);
  });
});

describe('sortMapRows', () => {
  it('sorts by best performance descending by average score by default', () => {
    const sorted = sortMapRows([ROW_A, ROW_B], 'bestPerformance', 'averageScore');
    expect(sorted[0].mapId).toBe('map-b'); // ROW_B has higher averageScore (95)
    expect(sorted[1].mapId).toBe('map-a');
  });

  it('sorts by most played', () => {
    const sorted = sortMapRows([ROW_B, ROW_A], 'mostPlayed', 'averageScore');
    expect(sorted[0].mapId).toBe('map-a'); // 10 games
    expect(sorted[1].mapId).toBe('map-b'); // 4 games
  });

  it('sorts alphabetically by map name', () => {
    const sorted = sortMapRows([ROW_B, ROW_A], 'mapName', 'averageScore');
    expect(sorted[0].mapName).toBe('Alpha');
    expect(sorted[1].mapName).toBe('Beta');
  });

  it('sorts by win rate when metric is winRate', () => {
    const sorted = sortMapRows([ROW_B, ROW_A], 'bestPerformance', 'winRate');
    expect(sorted[0].mapId).toBe('map-a'); // winRate 0.6 > 0.25
  });

  it('does not mutate the original array', () => {
    const input = [ROW_B, ROW_A];
    sortMapRows(input, 'mapName', 'averageScore');
    expect(input[0].mapId).toBe('map-b');
  });
});
