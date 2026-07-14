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

export function buildGroupStatEntries({
  overallPerformance,
  performance,
}: {
  overallPerformance: LeaderboardRow | null;
  performance: LeaderboardRow;
}) {
  return [
    {
      label: 'Weighted Score',
      value: formatAverage(performance.weightedScore),
      delta: overallPerformance
        ? formatSignedAverage(
            performance.weightedScore - overallPerformance.weightedScore,
          )
        : null,
    },
    {
      label: 'Win Rate',
      value: formatPercent(performance.winRate),
      delta: overallPerformance
        ? formatPercentagePointDelta(
            performance.winRate - overallPerformance.winRate,
          )
        : null,
    },
    {
      label: 'Average Placement',
      value: formatAverage(performance.averagePlacement),
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
      delta: overallPerformance
        ? formatSignedAverage(
            performance.averageScore - overallPerformance.averageScore,
          )
        : null,
    },
  ];
}
