import { ChartFrame } from '@/components/charts/chart-frame';
import type {
  GlobalAwardMetricRow,
  GlobalCorporationMetricRow,
  GlobalGenerationMetricRow,
  GlobalMilestoneMetricRow,
  GlobalPlayerCountMetricRow,
  GlobalStyleMetricRow,
  GlobalTagMetricRow,
} from '@/lib/db/analytics-repo';
import { CorporationMetaPanel } from './corporation-meta-panel';

type GlobalSummaryBoardProps = {
  globalAwardMetricRows?: GlobalAwardMetricRow[];
  globalCorporationMetricRows?: GlobalCorporationMetricRow[];
  globalGenerationMetricRows?: GlobalGenerationMetricRow[];
  globalMilestoneMetricRows?: GlobalMilestoneMetricRow[];
  globalPlayerCountMetricRows?: GlobalPlayerCountMetricRow[];
  globalStyleMetricRows?: GlobalStyleMetricRow[];
  globalTagMetricRows?: GlobalTagMetricRow[];
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function humanizeCode(value: string) {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function contextLine(row: {
  mapId: string | null;
  mapName: string | null;
  playerCount: number;
}) {
  const mapLabel = row.mapName ?? row.mapId;
  const parts = [
    mapLabel ? `map ${mapLabel}` : null,
    row.playerCount > 0 ? `${row.playerCount} players` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

export function GlobalSummaryBoard({
  globalAwardMetricRows = [],
  globalCorporationMetricRows = [],
  globalGenerationMetricRows = [],
  globalMilestoneMetricRows = [],
  globalPlayerCountMetricRows = [],
  globalStyleMetricRows = [],
  globalTagMetricRows = [],
}: GlobalSummaryBoardProps) {
  const hasRows =
    globalAwardMetricRows.length > 0 ||
    globalCorporationMetricRows.length > 0 ||
    globalGenerationMetricRows.length > 0 ||
    globalMilestoneMetricRows.length > 0 ||
    globalPlayerCountMetricRows.length > 0 ||
    globalStyleMetricRows.length > 0 ||
    globalTagMetricRows.length > 0;

  if (!hasRows) {
    return null;
  }

  return (
    <>
      {globalCorporationMetricRows.length > 0 ? (
        <CorporationMetaPanel rows={globalCorporationMetricRows} />
      ) : null}

      <ChartFrame title="Global Style Meta">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalStyleMetricRows.slice(0, 6).map((row) => {
            const context = contextLine(row);

            return (
              <article
                className="tm-stat-card"
                key={`${row.styleCode}-${row.mapId ?? 'all'}-${row.playerCount}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {humanizeCode(row.styleCode)}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.gamesPlayed} games | {row.wins} wins
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.winRate)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  {formatDecimal(row.averagePoints)} avg points |{' '}
                  {formatDecimal(row.averagePointsPerGeneration)} pts/gen
                </p>
                {context ? (
                  <p className="tm-muted-copy mt-2 text-sm">{context}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </ChartFrame>

      <ChartFrame title="Global Tag Meta">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalTagMetricRows.slice(0, 6).map((row) => {
            const context = contextLine(row);

            return (
              <article
                className="tm-stat-card"
                key={`${row.tagCode}-${row.mapId ?? 'all'}-${row.playerCount}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {humanizeCode(row.tagCode)}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.gamesPlayed} games | {formatDecimal(row.averageTagCount)}{' '}
                      avg tags
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.winRate)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  {formatDecimal(row.averagePoints)} avg points |{' '}
                  {formatDecimal(row.averagePointsPerGeneration)} pts/gen
                </p>
                {context ? (
                  <p className="tm-muted-copy mt-2 text-sm">{context}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </ChartFrame>

      <ChartFrame title="Global Milestone Meta">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalMilestoneMetricRows.slice(0, 6).map((row) => {
            const context = contextLine(row);

            return (
              <article
                className="tm-stat-card"
                key={`${row.milestoneId}-${row.mapId ?? 'all'}-${row.playerCount}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {row.milestoneName ?? humanizeCode(row.milestoneId)}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.gamesPlayed} games | {row.winnerWins} winner wins
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.milestoneWinnerWinRate)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  {formatDecimal(row.averageWinnerPointsPerGeneration)} winner pts/gen
                  {row.averageClaimedGeneration !== null
                    ? ` | claimed gen ${formatDecimal(row.averageClaimedGeneration)}`
                    : ''}
                </p>
                {context ? (
                  <p className="tm-muted-copy mt-2 text-sm">{context}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </ChartFrame>

      <ChartFrame title="Global Award Meta">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalAwardMetricRows.slice(0, 6).map((row) => {
            const context = contextLine(row);

            return (
              <article
                className="tm-stat-card"
                key={`${row.awardId}-${row.mapId ?? 'all'}-${row.playerCount}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-100">
                      {row.awardName ?? humanizeCode(row.awardId)}
                    </p>
                    <p className="tm-muted-copy mt-1 text-sm">
                      {row.gamesPlayed} games | {row.funderWins} funder wins
                    </p>
                  </div>
                  <p className="tm-accent-copy text-sm">
                    {formatPercent(row.funderSuccessRate)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-3 text-sm">
                  winner win {formatPercent(row.awardWinnerWinRate)} | ROI{' '}
                  {formatDecimal(row.averageAwardRoi)}
                  {row.averageFundedGeneration !== null
                    ? ` | funded gen ${formatDecimal(row.averageFundedGeneration)}`
                    : ''}
                </p>
                <p className="tm-muted-copy mt-2 text-sm">
                  mismatch {formatPercent(row.winnerFunderMismatchRate)}
                  {context ? ` | ${context}` : ''}
                </p>
              </article>
            );
          })}
        </div>
      </ChartFrame>

      <ChartFrame title="Global Player Count Baselines">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalPlayerCountMetricRows.map((row) => (
            <article className="tm-stat-card" key={row.playerCount}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-100">
                    {row.playerCount}-player games
                  </p>
                  <p className="tm-muted-copy mt-1 text-sm">
                    {row.gamesPlayed} games | {formatDecimal(row.averageGenerations)}{' '}
                    avg gens
                  </p>
                </div>
                <p className="tm-accent-copy text-sm">
                  {formatDecimal(row.averagePointsPerGeneration)} pts/gen
                </p>
              </div>
              <p className="tm-muted-copy mt-3 text-sm">
                {formatDecimal(row.averagePoints)} avg points
                {row.expectedScoreBaseline !== null
                  ? ` | baseline ${formatDecimal(row.expectedScoreBaseline)}`
                  : ''}
              </p>
            </article>
          ))}
        </div>
      </ChartFrame>

      <ChartFrame title="Global Generation Baselines">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {globalGenerationMetricRows.map((row) => (
            <article className="tm-stat-card" key={row.generationCount}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-100">
                    {row.generationCount} generations
                  </p>
                  <p className="tm-muted-copy mt-1 text-sm">
                    {row.gamesPlayed} games
                  </p>
                </div>
                <p className="tm-accent-copy text-sm">
                  {formatDecimal(row.averagePointsPerGeneration)} pts/gen
                </p>
              </div>
              <p className="tm-muted-copy mt-3 text-sm">
                {formatDecimal(row.averagePoints)} avg points
                {row.expectedScoreBaseline !== null
                  ? ` | baseline ${formatDecimal(row.expectedScoreBaseline)}`
                  : ''}
              </p>
            </article>
          ))}
        </div>
      </ChartFrame>
    </>
  );
}
