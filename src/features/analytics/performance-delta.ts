import type { LeaderboardRow } from '@/lib/db/analytics-repo';

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatAverage(value: number | null) {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatSignedAverage(value: number) {
  const formatted = formatAverage(Math.abs(value));

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export function formatPercentagePointDelta(value: number) {
  const percentagePoints = Math.round(value * 100);

  if (percentagePoints > 0) {
    return `+${percentagePoints} pp`;
  }

  if (percentagePoints < 0) {
    return `${percentagePoints} pp`;
  }

  return '0 pp';
}

/** Returns 'positive' when the delta is beneficial, 'negative' when harmful, 'neutral' otherwise. */
export function deltaDirection(
  delta: number,
  lowerIsBetter = false,
): 'positive' | 'negative' | 'neutral' {
  if (delta === 0) return 'neutral';
  const beneficial = lowerIsBetter ? delta < 0 : delta > 0;
  return beneficial ? 'positive' : 'negative';
}

/** 'Early trend' | 'Developing trend' | 'Established trend' */
export function sampleStrength(gamesPlayed: number): string {
  if (gamesPlayed >= 10) return 'Established trend';
  if (gamesPlayed >= 5) return 'Developing trend';
  return 'Early trend';
}

export type StatEntry = {
  label: string;
  value: string;
  /** Raw numeric delta (group − overall) used for direction colouring. */
  numericDelta: number | null;
  /** Formatted delta string. */
  delta: string | null;
  /** Whether lower values for this metric are better (e.g. placement). */
  lowerIsBetter?: boolean;
};

export function buildGroupStatEntries({
  overallPerformance,
  performance,
}: {
  overallPerformance: LeaderboardRow | null;
  performance: LeaderboardRow;
}): StatEntry[] {
  return [
    {
      label: 'Weighted Score',
      value: formatAverage(performance.weightedScore),
      numericDelta: overallPerformance
        ? performance.weightedScore - overallPerformance.weightedScore
        : null,
      delta: overallPerformance
        ? formatSignedAverage(
            performance.weightedScore - overallPerformance.weightedScore,
          )
        : null,
    },
    {
      label: 'Win Rate',
      value: formatPercent(performance.winRate),
      numericDelta: overallPerformance
        ? performance.winRate - overallPerformance.winRate
        : null,
      delta: overallPerformance
        ? formatPercentagePointDelta(
            performance.winRate - overallPerformance.winRate,
          )
        : null,
    },
    {
      label: 'Average Placement',
      value: formatAverage(performance.averagePlacement),
      lowerIsBetter: true,
      numericDelta: overallPerformance
        ? performance.averagePlacement - overallPerformance.averagePlacement
        : null,
      delta: overallPerformance
        ? (() => {
            const difference =
              performance.averagePlacement - overallPerformance.averagePlacement;
            if (difference === 0) return 'Same placement';
            return `${formatAverage(Math.abs(difference))} places ${
              difference < 0 ? 'better' : 'worse'
            }`;
          })()
        : null,
    },
    {
      label: 'Average Score',
      value: formatAverage(performance.averageScore),
      numericDelta: overallPerformance
        ? performance.averageScore - overallPerformance.averageScore
        : null,
      delta: overallPerformance
        ? formatSignedAverage(
            performance.averageScore - overallPerformance.averageScore,
          )
        : null,
    },
  ];
}
