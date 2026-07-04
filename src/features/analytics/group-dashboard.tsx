import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';
import type {
  CoverageRow,
  GroupHeadToHeadRow,
  LeaderboardRow,
  LineupEffectRow,
  ScoreSourceAverages,
  StyleAgreementRow,
} from '@/lib/db/analytics-repo';
import { ScoreSourceList } from './score-source-list';

type GroupDashboardProps = {
  coverage?: CoverageRow | null;
  headToHeadRows?: GroupHeadToHeadRow[];
  leaderboardRows?: LeaderboardRow[];
  lineupEffectRows?: LineupEffectRow[];
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

export function GroupDashboard({
  coverage = null,
  headToHeadRows = [],
  leaderboardRows = [],
  lineupEffectRows = [],
  scoreAverages = null,
  styleAgreementRows = [],
}: GroupDashboardProps) {
  const hasFinalizedAnalytics =
    leaderboardRows.length > 0 ||
    headToHeadRows.length > 0 ||
    lineupEffectRows.length > 0 ||
    styleAgreementRows.length > 0 ||
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
