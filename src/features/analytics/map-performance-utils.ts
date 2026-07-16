import type { PlayerMapMetricRow } from '@/lib/db/analytics-repo';

// ─── Metric types ─────────────────────────────────────────────────────────────

export type MapMetric = 'averageScore' | 'winRate' | 'gamesPlayed' | 'avgGenerations';

export const MAP_METRIC_LABELS: Record<MapMetric, string> = {
  averageScore: 'Average score',
  winRate: 'Win rate',
  gamesPlayed: 'Games played',
  avgGenerations: 'Avg. generations',
};

export const MAP_METRIC_Y_LABELS: Record<MapMetric, string> = {
  averageScore: 'Points',
  winRate: 'Win rate (%)',
  gamesPlayed: 'Games',
  avgGenerations: 'Generations',
};

// ─── Sort types ───────────────────────────────────────────────────────────────

export type MapSort =
  | 'bestPerformance'
  | 'mostPlayed'
  | 'mapName'
  | 'recentlyPlayed';

export const MAP_SORT_LABELS: Record<MapSort, string> = {
  bestPerformance: 'Best performance',
  mostPlayed: 'Most played',
  mapName: 'Map name',
  recentlyPlayed: 'Recently played',
};

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatMapMetric(value: number | null, metric: MapMetric): string {
  if (value === null) {
    return '—';
  }

  switch (metric) {
    case 'winRate':
      return `${Math.round(value * 100)}%`;
    case 'gamesPlayed':
      return String(Math.round(value));
    case 'averageScore':
    case 'avgGenerations':
      return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      }).format(value);
    default:
      return String(value);
  }
}

export function formatMetricForChart(value: number, metric: MapMetric): number {
  if (metric === 'winRate') {
    return Math.round(value * 100);
  }
  return value;
}

export function formatMetricTooltip(value: number, metric: MapMetric): string {
  if (metric === 'winRate') {
    return `${value}%`;
  }
  if (metric === 'averageScore' || metric === 'avgGenerations') {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    }).format(value);
  }
  return String(Math.round(value));
}

// ─── Sample size ──────────────────────────────────────────────────────────────

export type SampleSizeLabel =
  | 'Very limited data'
  | 'Limited data'
  | 'Moderate sample'
  | 'Stronger sample';

export function getSampleSizeLabel(gamesPlayed: number): SampleSizeLabel {
  if (gamesPlayed <= 4) return 'Very limited data';
  if (gamesPlayed <= 9) return 'Limited data';
  if (gamesPlayed <= 19) return 'Moderate sample';
  return 'Stronger sample';
}

export function getSampleSizeColor(gamesPlayed: number): string {
  if (gamesPlayed <= 4) return 'var(--tm-muted)';
  if (gamesPlayed <= 9) return 'var(--tm-muted)';
  if (gamesPlayed <= 19) return 'var(--tm-copper-400)';
  return '#7ba73d';
}

// ─── Performance delta ────────────────────────────────────────────────────────

export function getPerformanceDifference(
  value: number | null,
  overallAverage: number | null,
  metric: MapMetric,
): { delta: number; formatted: string; positive: boolean } | null {
  if (value === null || overallAverage === null) {
    return null;
  }

  const delta = metric === 'winRate'
    ? Math.round(value * 100) - Math.round(overallAverage * 100)
    : value - overallAverage;

  const formatted = metric === 'winRate'
    ? `${delta > 0 ? '+' : ''}${delta} pp vs overall`
    : `${delta >= 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(delta)} vs overall`;

  return { delta, formatted, positive: delta >= 0 };
}

// ─── Metric value extractor ───────────────────────────────────────────────────

export function getMetricValue(row: PlayerMapMetricRow, metric: MapMetric): number {
  switch (metric) {
    case 'winRate':
      return row.winRate;
    case 'averageScore':
      return row.averagePoints;
    case 'gamesPlayed':
      return row.gamesPlayed;
    case 'avgGenerations':
      return row.averageGenerations;
    default:
      return 0;
  }
}

// ─── Overall averages across all maps ────────────────────────────────────────

export function computeOverallAverages(rows: PlayerMapMetricRow[]): {
  avgGenerations: number | null;
  averageScore: number | null;
  gamesPlayed: number | null;
  winRate: number | null;
} {
  const totalGames = rows.reduce((sum, row) => sum + row.gamesPlayed, 0);

  if (totalGames === 0) {
    return { avgGenerations: null, averageScore: null, gamesPlayed: null, winRate: null };
  }

  // Weighted by games played
  const winRate = rows.reduce((sum, row) => sum + row.winRate * row.gamesPlayed, 0) / totalGames;
  const averageScore = rows.reduce((sum, row) => sum + row.averagePoints * row.gamesPlayed, 0) / totalGames;
  const avgGenerations = rows.reduce((sum, row) => sum + row.averageGenerations * row.gamesPlayed, 0) / totalGames;

  return {
    avgGenerations,
    averageScore,
    gamesPlayed: totalGames,
    winRate,
  };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

export function sortMapRows(
  rows: PlayerMapMetricRow[],
  sort: MapSort,
  metric: MapMetric,
): PlayerMapMetricRow[] {
  const sorted = [...rows];

  switch (sort) {
    case 'bestPerformance':
      return sorted.sort((a, b) => {
        const av = getMetricValue(a, metric);
        const bv = getMetricValue(b, metric);
        return bv - av || b.gamesPlayed - a.gamesPlayed;
      });
    case 'mostPlayed':
      return sorted.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    case 'mapName':
      return sorted.sort((a, b) => (a.mapName ?? '').localeCompare(b.mapName ?? ''));
    case 'recentlyPlayed':
      // Fall back to map rank which mirrors recently computed order
      return sorted.sort((a, b) => {
        const ar = a.mapRankForPlayer ?? Number.POSITIVE_INFINITY;
        const br = b.mapRankForPlayer ?? Number.POSITIVE_INFINITY;
        return ar - br || b.gamesPlayed - a.gamesPlayed;
      });
    default:
      return sorted;
  }
}
