import Link from 'next/link';
import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';
import type {
  CoverageRow,
  LeaderboardRow,
  ProfileHeadToHeadRow,
  ScoreSourceAverages,
  StyleAgreementRow,
} from '@/lib/db/analytics-repo';
import { ScoreSourceList } from './score-source-list';

type ProfileDashboardProps = {
  coverage?: CoverageRow | null;
  headToHeadRows?: ProfileHeadToHeadRow[];
  performance?: LeaderboardRow | null;
  playerName: string | null;
  scoreAverages?: ScoreSourceAverages | null;
  styleAgreement?: Pick<
    StyleAgreementRow,
    'comparedGames' | 'exactMatchRate' | 'mismatchRate' | 'partialMatchRate'
  > | null;
  linkHref?: string;
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

export function ProfileDashboard({
  coverage = null,
  headToHeadRows = [],
  linkHref,
  performance = null,
  playerName,
  scoreAverages = null,
  styleAgreement = null,
}: ProfileDashboardProps) {
  if (!playerName) {
    return (
      <ChartFrame title="Link Your Player">
        <p className="text-sm text-stone-300">
          Link a saved player profile to your signed-in account so the app can
          show personal finalized-game analytics.
        </p>
        {linkHref ? (
          <Link className="tm-button-primary mt-4 inline-flex w-fit" href={linkHref}>
            Link Saved Player
          </Link>
        ) : null}
      </ChartFrame>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ChartFrame title="My Performance">
        {performance ? (
          <div className="grid gap-4">
            <div>
              <p className="text-xl font-semibold text-stone-100">
                {playerName}
              </p>
              <p className="tm-muted-copy mt-1 text-sm">
                {performance.gamesPlayed} finalized games
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  Weighted Score
                </dt>
                <dd className="mt-2 text-lg font-semibold text-stone-100">
                  {formatAverage(performance.weightedScore)}
                </dd>
              </div>
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  Win Rate
                </dt>
                <dd className="mt-2 text-lg font-semibold text-stone-100">
                  {formatPercent(performance.winRate)}
                </dd>
              </div>
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  Average Placement
                </dt>
                <dd className="mt-2 text-lg font-semibold text-stone-100">
                  {formatAverage(performance.averagePlacement)}
                </dd>
              </div>
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  Average Score
                </dt>
                <dd className="mt-2 text-lg font-semibold text-stone-100">
                  {formatAverage(performance.averageScore)}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            No finalized games are linked to {playerName} yet.
          </p>
        )}
      </ChartFrame>
      <ChartFrame title="Score Source Averages">
        <ScoreSourceList scoreAverages={scoreAverages} />
      </ChartFrame>
      <ChartFrame title="Head-to-Head Snapshot">
        {headToHeadRows.length === 0 ? (
          <p className="text-sm text-stone-400">
            No finalized head-to-head matchups are available yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {headToHeadRows.slice(0, 5).map((row) => (
              <article
                className="tm-stat-card"
                key={row.opponentName}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-stone-100">{row.opponentName}</p>
                  <p className="tm-accent-copy text-sm">
                    {row.wins}-{row.losses}-{row.ties}
                  </p>
                </div>
                <p className="tm-muted-copy mt-2 text-sm">
                  {row.gamesPlayed} games | score edge {formatAverage(row.averageScoreDifferential)}
                </p>
              </article>
            ))}
          </div>
        )}
      </ChartFrame>
      <ChartFrame title="Declared vs Inferred Style">
        {styleAgreement ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="tm-stat-card">
              <p className="tm-data-label">
                Exact Match
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-100">
                {formatPercent(styleAgreement.exactMatchRate)}
              </p>
            </div>
            <div className="tm-stat-card">
              <p className="tm-data-label">
                Partial Match
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-100">
                {formatPercent(styleAgreement.partialMatchRate)}
              </p>
            </div>
            <div className="tm-stat-card">
              <p className="tm-data-label">
                Mismatch
              </p>
              <p className="mt-2 text-lg font-semibold text-stone-100">
                {formatPercent(styleAgreement.mismatchRate)}
              </p>
            </div>
            <p className="tm-muted-copy text-sm sm:col-span-3">
              Based on {styleAgreement.comparedGames} finalized games that have
              both declared and inferred styles recorded.
            </p>
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            No declared-versus-inferred style comparisons are available yet.
          </p>
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
