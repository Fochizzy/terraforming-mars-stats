import type { ScoreSourceAverages } from '@/lib/db/analytics-repo';

/** A resolved score-source entry ready for rendering. */
export type ScoringSourceRow = {
  key: keyof ScoreSourceAverages;
  label: string;
  groupValue: number;
  playerValue: number | null;
  /** Difference: player − group (null when no player selected). */
  diff: number | null;
  /** Fill percent relative to the chart's upper bound. */
  groupFillPct: number;
  playerFillPct: number | null;
};

export type ScoringSummary = {
  totalAverage: number;
  leadingSource: ScoringSourceRow | null;
  leadingSourceShare: number;
  topTwoShare: number;
};

/** Canonical ordered list of score sources. */
export const SCORE_SOURCE_DEFS: Array<{
  key: keyof ScoreSourceAverages;
  label: string;
  shortLabel: string;
}> = [
  { key: 'averageTrPoints', label: 'Terraform Rating', shortLabel: 'TR' },
  { key: 'averageCardPoints', label: 'Card Points', shortLabel: 'Cards' },
  { key: 'averageOtherCardPoints', label: 'Other Card', shortLabel: 'Other Card' },
  { key: 'averageGreeneryPoints', label: 'Greenery', shortLabel: 'Greenery' },
  { key: 'averageCitiesPoints', label: 'Cities', shortLabel: 'Cities' },
  { key: 'averageMilestonePoints', label: 'Milestones', shortLabel: 'Milestones' },
  { key: 'averageAwardPoints', label: 'Awards', shortLabel: 'Awards' },
  { key: 'averageJovianPoints', label: 'Jovian', shortLabel: 'Jovian' },
  { key: 'averageMicrobePoints', label: 'Microbes', shortLabel: 'Microbes' },
  { key: 'averageAnimalPoints', label: 'Animals', shortLabel: 'Animals' },
];

/** Format a number with 1 decimal place. */
export function fmt(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value);
}

/** Format a percentage (0–1) as "42%" */
export function fmtPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Build sorted ScoringSourceRows from group averages and optional player averages.
 * Sort is highest group value → lowest.
 */
export function buildScoringSourceRows(
  groupAverages: ScoreSourceAverages,
  playerAverages: ScoreSourceAverages | null,
): ScoringSourceRow[] {
  const rows: ScoringSourceRow[] = SCORE_SOURCE_DEFS.map(({ key, label }) => {
    const groupValue = Math.max(0, groupAverages[key] ?? 0);
    const playerRaw = playerAverages ? (playerAverages[key] ?? null) : null;
    const playerValue = playerRaw !== null ? Math.max(0, playerRaw) : null;
    const diff = playerValue !== null ? playerValue - groupValue : null;
    return { key, label, groupValue, playerValue, diff, groupFillPct: 0, playerFillPct: null };
  });

  // Sort by group value descending, label ascending for ties
  rows.sort((a, b) => b.groupValue - a.groupValue || a.label.localeCompare(b.label));

  const upperBound = Math.max(rows[0]?.groupValue ?? 0, ...rows.map((r) => r.playerValue ?? 0), 1);
  const chartMax = Math.ceil(upperBound / 5) * 5 || 5;

  for (const row of rows) {
    row.groupFillPct = (row.groupValue / chartMax) * 100;
    row.playerFillPct =
      row.playerValue !== null ? (row.playerValue / chartMax) * 100 : null;
  }

  return rows;
}

/** Compute summary metrics from sorted rows. */
export function computeScoringSummary(rows: ScoringSourceRow[]): ScoringSummary {
  const totalAverage = rows.reduce((sum, r) => sum + r.groupValue, 0);
  const leadingSource = rows[0] ?? null;
  const leadingSourceShare =
    totalAverage > 0 && leadingSource ? leadingSource.groupValue / totalAverage : 0;

  const topTwo = rows.slice(0, 2).reduce((sum, r) => sum + r.groupValue, 0);
  const topTwoShare = totalAverage > 0 ? topTwo / totalAverage : 0;

  return { totalAverage, leadingSource, leadingSourceShare, topTwoShare };
}

/**
 * Compute a safe radar chart maximum.
 * Uses the observed max rounded up to nearest 10, with 40 as minimum when
 * the game's TR baseline typically anchors at ~20–25.
 */
export function computeRadarMax(
  groupAverages: ScoreSourceAverages,
  playerAverages: ScoreSourceAverages | null,
): number {
  const allValues = SCORE_SOURCE_DEFS.flatMap(({ key }) => {
    const vals: number[] = [groupAverages[key] ?? 0];
    if (playerAverages) vals.push(playerAverages[key] ?? 0);
    return vals;
  });
  const observed = Math.max(...allValues, 0);
  const rounded = Math.ceil(observed / 10) * 10;
  return Math.max(40, rounded);
}
