import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';
import type {
  CoverageRow,
  GlobalAwardMetricRow,
  GlobalCorporationMetricRow,
  GlobalGenerationMetricRow,
  GlobalMapMetricRow,
  GlobalMilestoneMetricRow,
  GlobalPlayerCountMetricRow,
  GlobalStyleMetricRow,
  GlobalTagMetricRow,
  GroupHeadToHeadRow,
  LeaderboardRow,
  LineupEffectRow,
  PlayerEfficiencySummary,
  PlayerMapMetricRow,
  ScoreSourceAverages,
  StyleAgreementRow,
} from '@/lib/db/analytics-repo';
import { GlobalMetricBoard } from './global-metric-board';
import { GlobalSummaryBoard } from './global-summary-board';
import { MapPerformanceList } from './map-performance-list';
import { ScoreSourceList } from './score-source-list';

type GroupDashboardProps = {
  coverage?: CoverageRow | null;
  globalAwardMetricRows?: GlobalAwardMetricRow[];
  globalCorporationMetricRows?: GlobalCorporationMetricRow[];
  globalGenerationMetricRows?: GlobalGenerationMetricRow[];
  headToHeadRows?: GroupHeadToHeadRow[];
  leaderboardRows?: LeaderboardRow[];
  lineupEffectRows?: LineupEffectRow[];
  globalMapMetricRows?: GlobalMapMetricRow[];
  globalMilestoneMetricRows?: GlobalMilestoneMetricRow[];
  globalPlayerCountMetricRows?: GlobalPlayerCountMetricRow[];
  globalStyleMetricRows?: GlobalStyleMetricRow[];
  globalTagMetricRows?: GlobalTagMetricRow[];
  playerEfficiencySummaries?: PlayerEfficiencySummary[];
  playerMapMetricRows?: PlayerMapMetricRow[];
  scoreAverages?: ScoreSourceAverages | null;
  styleAgreementRows?: Array<
    Pick<
      StyleAgreementRow,
      'comparedGames' | 'exactMatchRate' | 'mismatchRate' | 'partialMatchRate' | 'playerName'
    >
  >;
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAverage(value: number | null) {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatPersistedMetric(value: number | null) {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function getPlayerName(playerId: string, leaderboardRows: LeaderboardRow[]) {
  return (
    leaderboardRows.find((row) => row.playerId === playerId)?.playerName ?? playerId
  );
}

export function GroupDashboard({
  coverage = null,
  globalAwardMetricRows = [],
  globalCorporationMetricRows = [],
  globalGenerationMetricRows = [],
  globalMapMetricRows = [],
  globalMilestoneMetricRows = [],
  globalPlayerCountMetricRows = [],
  globalStyleMetricRows = [],
  globalTagMetricRows = [],
  headToHeadRows = [],
  leaderboardRows = [],
  lineupEffectRows = [],
  playerEfficiencySummaries = [],
  playerMapMetricRows = [],
  scoreAverages = null,
  styleAgreementRows = [],
}: GroupDashboardProps) {
  const topEfficiencySummary = playerEfficiencySummaries[0] ?? null;
  const hasFinalizedAnalytics =
    leaderboardRows.length > 0 ||
    headToHeadRows.length > 0 ||
    lineupEffectRows.length > 0 ||
    styleAgreementRows.length > 0 ||
    playerEfficiencySummaries.length > 0 ||
    playerMapMetricRows.length > 0 ||
    globalMapMetricRows.length > 0 ||
    globalCorporationMetricRows.length > 0 ||
    globalStyleMetricRows.length > 0 ||
    globalTagMetricRows.length > 0 ||
    globalMilestoneMetricRows.length > 0 ||
    globalAwardMetricRows.length > 0 ||
    globalPlayerCountMetricRows.length > 0 ||
    globalGenerationMetricRows.length > 0 ||
    coverage !== null ||
    scoreAverages !== null;

  if (!hasFinalizedAnalytics) {
    return (
      <ChartFrame title="Group Analytics">
        <p className="text-sm text-stone-300">
          Finalize a few games to unlock the leaderboard, head-to-head, lineup,
          style, and coverage analytics for this group.
        </p>
      </ChartFrame>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="Weighted Leaderboard">
        {leaderboardRows.length === 0 ? (
          <p className="text-sm text-stone-400">
            No finalized leaderboard rows are available yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {leaderboardRows.slice(0, 6).map((row) => (
              <article
                className="tm-stat-card"
                key={row.playerId}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-100">{row.playerName}</p>
                  <p className="tm-accent-copy text-sm">
                    {formatAverage(row.weightedScore)}
                  </p>
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  {formatPercent(row.winRate)} win rate | avg place {formatAverage(row.averagePlacement)}
                </p>
              </article>
            ))}
          </div>
        )}
      </ChartFrame>
      {topEfficiencySummary ? (
        <ChartFrame title="Persisted Efficiency">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="tm-stat-card">
              <p className="tm-data-label">Top Player</p>
              <p className="mt-2 text-lg font-semibold text-stone-100">
                {getPlayerName(topEfficiencySummary.playerId, leaderboardRows)}
              </p>
            </div>
            <div className="tm-stat-card">
              <p className="tm-data-label">Points per Generation</p>
              <p className="mt-2 text-lg font-semibold text-stone-100">
                {formatPersistedMetric(topEfficiencySummary.averagePointsPerGeneration)} pts/gen
              </p>
            </div>
            <div className="tm-stat-card">
              <p className="tm-data-label">Expected Delta</p>
              <p className="mt-2 text-lg font-semibold text-stone-100">
                {formatPersistedMetric(topEfficiencySummary.averageScoreDeltaVsExpected)}
              </p>
            </div>
            <div className="tm-stat-card">
              <p className="tm-data-label">Best Lane / Source</p>
              <p className="mt-2 text-lg font-semibold text-stone-100">
                {topEfficiencySummary.bestTagLane ??
                  topEfficiencySummary.bestScoreSource ??
                  '-'}
              </p>
            </div>
          </div>
        </ChartFrame>
      ) : null}
      <MapPerformanceList mapMetricRows={playerMapMetricRows} />
      <GlobalMetricBoard globalMapMetricRows={globalMapMetricRows} />
      <GlobalSummaryBoard
        globalAwardMetricRows={globalAwardMetricRows}
        globalCorporationMetricRows={globalCorporationMetricRows}
        globalGenerationMetricRows={globalGenerationMetricRows}
        globalMilestoneMetricRows={globalMilestoneMetricRows}
        globalPlayerCountMetricRows={globalPlayerCountMetricRows}
        globalStyleMetricRows={globalStyleMetricRows}
        globalTagMetricRows={globalTagMetricRows}
      />
      <ChartFrame title="Score Source Averages">
        <ScoreSourceList scoreAverages={scoreAverages} />
      </ChartFrame>
      <ChartFrame title="Head-to-Head">
        {headToHeadRows.length === 0 ? (
          <p className="text-sm text-stone-400">
            No finalized head-to-head rows are available yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {headToHeadRows.slice(0, 5).map((row) => (
              <article
                className="tm-stat-card"
                key={`${row.leftPlayerId}-${row.rightPlayerId}`}
              >
                <p className="font-semibold text-stone-100">
                  {row.leftPlayerName} vs {row.rightPlayerName}
                </p>
                <p className="tm-muted-copy mt-2 text-sm">
                  {row.leftWins}-{row.rightWins}-{row.ties} over {row.gamesPlayed} games
                </p>
              </article>
            ))}
          </div>
        )}
      </ChartFrame>
      <ChartFrame title="Lineup Effects">
        {lineupEffectRows.length === 0 ? (
          <p className="text-sm text-stone-400">
            No finalized lineup comparisons are available yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {lineupEffectRows.slice(0, 5).map((row) => (
              <article
                className="tm-stat-card"
                key={`${row.playerId}-${row.lineupLabel}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-100">{row.playerName}</p>
                  <p className="tm-accent-copy text-sm">{formatPercent(row.winRate)}</p>
                </div>
                <p className="tm-muted-copy mt-2 text-sm">{row.lineupLabel}</p>
              </article>
            ))}
          </div>
        )}
      </ChartFrame>
      <ChartFrame title="Style Agreement">
        {styleAgreementRows.length === 0 ? (
          <p className="text-sm text-stone-400">
            No declared-versus-inferred style comparisons are available yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {styleAgreementRows.slice(0, 5).map((row) => (
              <article
                className="tm-stat-card"
                key={row.playerName}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-100">{row.playerName}</p>
                  <p className="tm-accent-copy text-sm">{formatPercent(row.exactMatchRate)}</p>
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  {row.comparedGames} compared games | partial {formatPercent(row.partialMatchRate)} | mismatch {formatPercent(row.mismatchRate)}
                </p>
              </article>
            ))}
          </div>
        )}
      </ChartFrame>
      <ChartFrame title="Optional Data Coverage">
        {coverage ? (
          <div className="flex flex-wrap gap-2">
            <CoverageBadge label="Full card breakdown" value={coverage.cardBreakdownCoverage} />
            <CoverageBadge label="Microbe coverage" value={coverage.microbeCoverage} />
            <CoverageBadge label="Animal coverage" value={coverage.animalCoverage} />
            <CoverageBadge label="Jovian coverage" value={coverage.jovianCoverage} />
            <CoverageBadge label="Declared style coverage" value={coverage.declaredStyleCoverage} />
            <CoverageBadge label="Key-card coverage" value={coverage.keyCardCoverage} />
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            Optional-data coverage will appear after finalized games are logged.
          </p>
        )}
      </ChartFrame>
    </div>
  );
}
