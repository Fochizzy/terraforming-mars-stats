import { describe, expect, it } from 'vitest';
import {
  buildScoringSourceRows,
  computeScoringSummary,
  computeRadarMax,
} from './scoring-calculations';
import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';

const groupAvg: ScoreSourceAverages = {
  averageTrPoints: 25.3,
  averageCardPoints: 20.2,
  averageOtherCardPoints: 11.2,
  averageGreeneryPoints: 11.6,
  averageCitiesPoints: 7.4,
  averageMilestonePoints: 4.1,
  averageAwardPoints: 3.5,
  averageJovianPoints: 3.3,
  averageMicrobePoints: 1.8,
  averageAnimalPoints: 2.1,
};

const playerAvg: ScoreSourceAverages = {
  averageTrPoints: 24.3,
  averageCardPoints: 28.4,
  averageOtherCardPoints: 12.1,
  averageGreeneryPoints: 10.2,
  averageCitiesPoints: 6.4,
  averageMilestonePoints: 2.1,
  averageAwardPoints: 2.5,
  averageJovianPoints: 1.3,
  averageMicrobePoints: 0.8,
  averageAnimalPoints: 1.1,
};

describe('buildScoringSourceRows', () => {
  it('sorts rows highest group value first', () => {
    const rows = buildScoringSourceRows(groupAvg, null);
    expect(rows[0].label).toBe('Terraform Rating');
    expect(rows[1].label).toBe('Card Points');
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i].groupValue).toBeGreaterThanOrEqual(rows[i + 1].groupValue);
    }
  });

  it('preserves group sort order when player is selected', () => {
    const rows = buildScoringSourceRows(groupAvg, playerAvg);
    // Group sort is by groupValue; player has higher Card Points but TR still leads group
    expect(rows[0].label).toBe('Terraform Rating');
    expect(rows[1].label).toBe('Card Points');
  });

  it('computes diff as playerValue - groupValue', () => {
    const rows = buildScoringSourceRows(groupAvg, playerAvg);
    const cardRow = rows.find((r) => r.label === 'Card Points')!;
    expect(cardRow.diff).toBeCloseTo(8.2, 1);
  });

  it('sets diff to null when no player selected', () => {
    const rows = buildScoringSourceRows(groupAvg, null);
    for (const row of rows) {
      expect(row.diff).toBeNull();
    }
  });

  it('handles zero totals safely', () => {
    const zero: ScoreSourceAverages = {
      averageTrPoints: 0,
      averageCardPoints: 0,
      averageOtherCardPoints: 0,
      averageGreeneryPoints: 0,
      averageCitiesPoints: 0,
      averageMilestonePoints: 0,
      averageAwardPoints: 0,
      averageJovianPoints: 0,
      averageMicrobePoints: 0,
      averageAnimalPoints: 0,
    };
    const rows = buildScoringSourceRows(zero, null);
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(row.groupFillPct).toBe(0);
    }
  });

  it('handles missing player values as null, not zero', () => {
    const rows = buildScoringSourceRows(groupAvg, null);
    for (const row of rows) {
      expect(row.playerValue).toBeNull();
      expect(row.playerFillPct).toBeNull();
    }
  });
});

describe('computeScoringSummary', () => {
  it('computes total average correctly', () => {
    const rows = buildScoringSourceRows(groupAvg, null);
    const summary = computeScoringSummary(rows);
    const expected = Object.values(groupAvg).reduce((a, b) => a + b, 0);
    expect(summary.totalAverage).toBeCloseTo(expected, 1);
  });

  it('identifies the leading source', () => {
    const rows = buildScoringSourceRows(groupAvg, null);
    const summary = computeScoringSummary(rows);
    expect(summary.leadingSource?.label).toBe('Terraform Rating');
  });

  it('computes leading source share correctly', () => {
    const rows = buildScoringSourceRows(groupAvg, null);
    const summary = computeScoringSummary(rows);
    const total = Object.values(groupAvg).reduce((a, b) => a + b, 0);
    const expectedShare = groupAvg.averageTrPoints / total;
    expect(summary.leadingSourceShare).toBeCloseTo(expectedShare, 3);
  });

  it('computes top-two share correctly', () => {
    const rows = buildScoringSourceRows(groupAvg, null);
    const summary = computeScoringSummary(rows);
    const total = Object.values(groupAvg).reduce((a, b) => a + b, 0);
    const expectedShare = (groupAvg.averageTrPoints + groupAvg.averageCardPoints) / total;
    expect(summary.topTwoShare).toBeCloseTo(expectedShare, 3);
  });

  it('handles zero total safely (no division by zero)', () => {
    const rows: import('./scoring-calculations').ScoringSourceRow[] = [
      { key: 'averageTrPoints', label: 'TR', groupValue: 0, playerValue: null, diff: null, groupFillPct: 0, playerFillPct: null },
    ];
    const summary = computeScoringSummary(rows);
    expect(summary.leadingSourceShare).toBe(0);
    expect(summary.topTwoShare).toBe(0);
  });

  it('handles ties in leading source (returns first in sorted order)', () => {
    const tied: ScoreSourceAverages = {
      averageTrPoints: 20,
      averageCardPoints: 20,
      averageOtherCardPoints: 0,
      averageGreeneryPoints: 0,
      averageCitiesPoints: 0,
      averageMilestonePoints: 0,
      averageAwardPoints: 0,
      averageJovianPoints: 0,
      averageMicrobePoints: 0,
      averageAnimalPoints: 0,
    };
    const rows = buildScoringSourceRows(tied, null);
    const summary = computeScoringSummary(rows);
    // Both are 20; sort-stable should give "Card Points" or "Terraform Rating" first (alphabetical on tie)
    expect(['Card Points', 'Terraform Rating']).toContain(summary.leadingSource?.label);
  });
});

describe('computeRadarMax', () => {
  it('returns at least 40', () => {
    const rows: ScoreSourceAverages = {
      averageTrPoints: 10,
      averageCardPoints: 5,
      averageOtherCardPoints: 2,
      averageGreeneryPoints: 3,
      averageCitiesPoints: 1,
      averageMilestonePoints: 1,
      averageAwardPoints: 1,
      averageJovianPoints: 0.5,
      averageMicrobePoints: 0.5,
      averageAnimalPoints: 0.5,
    };
    expect(computeRadarMax(rows, null)).toBe(40);
  });

  it('rounds up to nearest 10 when values exceed 40', () => {
    const big: ScoreSourceAverages = {
      averageTrPoints: 44,
      averageCardPoints: 5,
      averageOtherCardPoints: 2,
      averageGreeneryPoints: 3,
      averageCitiesPoints: 1,
      averageMilestonePoints: 1,
      averageAwardPoints: 1,
      averageJovianPoints: 0.5,
      averageMicrobePoints: 0.5,
      averageAnimalPoints: 0.5,
    };
    expect(computeRadarMax(big, null)).toBe(50);
  });

  it('incorporates player values when comparing', () => {
    const player: ScoreSourceAverages = {
      averageTrPoints: 55,
      averageCardPoints: 5,
      averageOtherCardPoints: 2,
      averageGreeneryPoints: 3,
      averageCitiesPoints: 1,
      averageMilestonePoints: 1,
      averageAwardPoints: 1,
      averageJovianPoints: 0.5,
      averageMicrobePoints: 0.5,
      averageAnimalPoints: 0.5,
    };
    expect(computeRadarMax(groupAvg, player)).toBe(60);
  });
});
