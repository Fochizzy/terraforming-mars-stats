import { ChartFrame } from '@/components/charts/chart-frame';
import type { PlayerMapMetricRow } from '@/lib/db/analytics-repo';

const refreshEmptyState =
  'Metrics will appear after persisted Supabase summaries refresh.';

function formatDecimal(value: number | null, maximumFractionDigits = 1) {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function MapPerformanceList({
  mapMetricRows,
}: {
  mapMetricRows: PlayerMapMetricRow[];
}) {
  return (
    <ChartFrame title="Map Performance">
      {mapMetricRows.length === 0 ? (
        <p className="text-sm text-stone-400">{refreshEmptyState}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {mapMetricRows.slice(0, 6).map((row) => (
            <article
              className="tm-stat-card"
              key={`${row.groupId}-${row.playerId}-${row.mapId}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-100">
                    {row.mapName ?? row.mapId}
                  </p>
                  <p className="tm-muted-copy mt-1 text-sm">
                    {row.mapRankForPlayer ? `Rank #${row.mapRankForPlayer}` : 'Unranked'}
                  </p>
                </div>
                <p className="tm-accent-copy text-sm">
                  {formatPercent(row.winRate)}
                </p>
              </div>
              <p className="tm-muted-copy mt-3 text-sm">
                {formatDecimal(row.averagePoints)} avg points |{' '}
                {formatDecimal(row.averagePointsPerGeneration)} pts/gen |{' '}
                {row.gamesPlayed} games
              </p>
              {row.bestTagLaneOnMap || row.bestScoreSourceOnMap ? (
                <p className="tm-muted-copy mt-2 text-sm">
                  Best lane/source:{' '}
                  <span className="text-stone-200">
                    {[row.bestTagLaneOnMap, row.bestScoreSourceOnMap]
                      .filter(Boolean)
                      .join(' / ')}
                  </span>
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
