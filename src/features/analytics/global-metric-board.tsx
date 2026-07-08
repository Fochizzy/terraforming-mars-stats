import { ChartFrame } from '@/components/charts/chart-frame';
import type { GlobalMapMetricRow } from '@/lib/db/analytics-repo';

const refreshEmptyState =
  'Global map metrics will appear after opted-in global Supabase summaries refresh.';

type DisplayGlobalMapMetricRow = GlobalMapMetricRow & {
  mapName?: string | null;
};

function formatDecimal(value: number | null, maximumFractionDigits = 2) {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function humanizeCode(value: string) {
  return value
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildMetaLine(row: DisplayGlobalMapMetricRow) {
  const parts = [
    row.bestTagLane ? `best lane ${humanizeCode(row.bestTagLane)}` : null,
    row.highestEfficiencyStyleCode
      ? `style ${humanizeCode(row.highestEfficiencyStyleCode)}`
      : null,
    row.highestWinRateCorporationId
      ? `corp ${humanizeCode(row.highestWinRateCorporationId)}`
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

export function GlobalMetricBoard({
  globalMapMetricRows,
}: {
  globalMapMetricRows: DisplayGlobalMapMetricRow[];
}) {
  return (
    <ChartFrame title="Global Map Meta">
      {globalMapMetricRows.length === 0 ? (
        <p className="text-sm text-stone-400">{refreshEmptyState}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalMapMetricRows.slice(0, 6).map((row) => {
            const metaLine = buildMetaLine(row);

            return (
              <article className="tm-stat-card" key={row.mapId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {row.mapName ?? row.mapId}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.playerCount} players | {row.gamesPlayed} games
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatDecimal(row.averagePointsPerGeneration)} pts/gen
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  {formatDecimal(row.averagePoints)} avg points |{' '}
                  {formatDecimal(row.averageGenerations)} avg gens
                  {row.expectedScoreBaseline !== null
                    ? ` | baseline ${formatDecimal(row.expectedScoreBaseline)}`
                    : ''}
                </p>
                {metaLine ? (
                  <p className="tm-muted-copy mt-2 text-sm">
                    <span className="text-stone-200">{metaLine}</span>
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </ChartFrame>
  );
}
