import Link from 'next/link';
import type { ReactNode } from 'react';
import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  buildScoreSourceEntries,
  type CoverageRow,
  type LeaderboardRow,
  type ProfileCardStat,
  type ProfileHeadToHeadRow,
  type ProfileStyleBreakdownRow,
  type ProfileStyleInsight,
  type ScoreSourceAverages,
} from '@/lib/db/analytics-repo';
import { CardStatsButton } from '@/features/catalog/card-stats-dialog';
import { GlossaryLink } from '@/features/glossary/glossary-link';
import {
  StyleEffectivenessPanel,
  type StyleEffectivenessScopeInput,
} from '@/features/insights/style-effectiveness';
import { formatAverage, formatPercent } from './performance-delta';
import { ProfileCardPanels } from './profile-card-panels';
import { ScoreSourceList } from './score-source-list';

/**
 * Split a sentence around named tokens and swap each one for a link node,
 * keeping the surrounding prose as plain text. Tokens are matched at their
 * earliest position and each is replaced once, so a style name and a card name
 * in the same sentence both become links without disturbing the wording.
 */
function renderLinkedText(
  text: string,
  links: Array<{ match: string; render: (key: string) => ReactNode }>,
): ReactNode[] {
  const segments: ReactNode[] = [];
  const remainingLinks = links.filter((link) => link.match);
  let rest = text;
  let key = 0;

  while (remainingLinks.length > 0) {
    let bestIndex = -1;
    let bestPosition = Infinity;

    remainingLinks.forEach((link, index) => {
      const position = rest.indexOf(link.match);

      if (position !== -1 && position < bestPosition) {
        bestPosition = position;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      break;
    }

    const [link] = remainingLinks.splice(bestIndex, 1);

    if (bestPosition > 0) {
      segments.push(rest.slice(0, bestPosition));
    }

    segments.push(link.render(`lnk-${key}`));
    key += 1;
    rest = rest.slice(bestPosition + link.match.length);
  }

  if (rest) {
    segments.push(rest);
  }

  return segments;
}

/** The glossary deep-link slug for an inferred style code (e.g. `style-balanced`). */
function styleGlossarySlug(styleCode: string) {
  return `style-${styleCode.replaceAll('_', '-')}`;
}

function renderStyleInsightBody(insight: ProfileStyleInsight): ReactNode[] {
  const links: Array<{ match: string; render: (key: string) => ReactNode }> = [];

  if (insight.styleName && insight.styleCode) {
    const slug = styleGlossarySlug(insight.styleCode);
    const styleName = insight.styleName;

    links.push({
      match: styleName,
      render: (key) => (
        <GlossaryLink key={key} slug={slug}>
          {styleName}
        </GlossaryLink>
      ),
    });
  }

  if (insight.card) {
    const card = insight.card;

    links.push({
      match: card.cardName,
      render: (key) => (
        <CardStatsButton card={card} className="tm-glossary-link" key={key}>
          {card.cardName}
        </CardStatsButton>
      ),
    });
  }

  return renderLinkedText(insight.body, links);
}

type ProfileDashboardProps = {
  cardOutcomes?: ProfileCardStat[];
  coverage?: CoverageRow | null;
  headToHeadRows?: ProfileHeadToHeadRow[];
  keyCards?: ProfileCardStat[];
  lossCards?: ProfileCardStat[];
  performance?: LeaderboardRow | null;
  playerName: string | null;
  scoreAverages?: ScoreSourceAverages | null;
  styleBreakdownRows?: ProfileStyleBreakdownRow[];
  styleInsights?: ProfileStyleInsight[];
  linkHref?: string;
};

function getWinningStyle(rows: ProfileStyleBreakdownRow[]) {
  return [...rows].sort(
    (left, right) =>
      right.wins - left.wins ||
      right.winRate - left.winRate ||
      right.gamesPlayed - left.gamesPlayed ||
      left.styleName.localeCompare(right.styleName),
  )[0] ?? null;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getScoreSourceHighlights(scoreAverages: ScoreSourceAverages | null) {
  if (!scoreAverages) {
    return { focus: null, top: null };
  }

  const entries = [
    { label: 'Terraform Rating', value: scoreAverages.averageTrPoints },
    { label: 'Card Points', value: scoreAverages.averageCardPoints },
    { label: 'Greenery', value: scoreAverages.averageGreeneryPoints },
    { label: 'Cities', value: scoreAverages.averageCitiesPoints },
    { label: 'Milestones', value: scoreAverages.averageMilestonePoints },
    { label: 'Awards', value: scoreAverages.averageAwardPoints },
  ];
  const top = [...entries]
    .filter((entry) => entry.value > 0)
    .sort(
      (left, right) =>
        right.value - left.value || left.label.localeCompare(right.label),
    )[0] ?? null;
  const focus = [...entries].sort(
    (left, right) =>
      left.value - right.value || left.label.localeCompare(right.label),
  )[0] ?? null;

  return { focus, top };
}

function getBestMatchup(rows: ProfileHeadToHeadRow[]) {
  return [...rows]
    .filter((row) => row.gamesPlayed >= 2 && row.wins > row.losses)
    .sort((left, right) => {
      const leftEdge = left.wins - left.losses;
      const rightEdge = right.wins - right.losses;

      return (
        rightEdge - leftEdge ||
        right.averageScoreDifferential - left.averageScoreDifferential ||
        right.gamesPlayed - left.gamesPlayed ||
        left.opponentName.localeCompare(right.opponentName)
      );
    })[0] ?? null;
}

function getStyleFocus(rows: ProfileStyleBreakdownRow[]) {
  const repeatedRows = rows.filter((row) => row.gamesPlayed >= 2);
  const candidates = repeatedRows.length > 0 ? repeatedRows : rows;

  return [...candidates].sort(
    (left, right) =>
      left.winRate - right.winRate ||
      right.averagePlacement - left.averagePlacement ||
      right.gamesPlayed - left.gamesPlayed ||
      left.styleName.localeCompare(right.styleName),
  )[0] ?? null;
}

function buildPlayAnalysis({
  headToHeadRows,
  performance,
  playerName,
  scoreAverages,
  styleBreakdownRows,
}: {
  headToHeadRows: ProfileHeadToHeadRow[];
  performance: LeaderboardRow | null;
  playerName: string;
  scoreAverages: ScoreSourceAverages | null;
  styleBreakdownRows: ProfileStyleBreakdownRow[];
}) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const mostPlayedStyle = styleBreakdownRows[0] ?? null;
  const winningStyle = getWinningStyle(styleBreakdownRows);
  const styleFocus = getStyleFocus(styleBreakdownRows);
  const bestMatchup = getBestMatchup(headToHeadRows);
  const scoreHighlights = getScoreSourceHighlights(scoreAverages);

  if (performance) {
    const gamesLabel = pluralize(performance.gamesPlayed, 'finalized game');

    if (performance.winRate >= 0.5) {
      strengths.push(
        `${playerName} wins ${formatPercent(performance.winRate)} of ${gamesLabel}, so they are already turning a strong share of tables into wins.`,
      );
    } else if (performance.averagePlacement <= 2.5) {
      strengths.push(
        `${playerName} stays in the mix with an average placement of ${formatAverage(performance.averagePlacement)} across ${gamesLabel}.`,
      );
    } else {
      strengths.push(
        `${playerName} has ${gamesLabel} logged, which gives them a real baseline for spotting repeatable play patterns.`,
      );
    }
  }

  if (winningStyle && winningStyle.wins > 0) {
    strengths.push(
      `${winningStyle.styleName} is the clearest successful plan, producing ${pluralize(winningStyle.wins, 'win')} and a ${formatPercent(winningStyle.winRate)} win rate.`,
    );
  } else if (mostPlayedStyle) {
    strengths.push(
      `${playerName} has a defined style identity around ${mostPlayedStyle.styleName}, using it in ${formatPercent(mostPlayedStyle.playRate)} of inferred-style games.`,
    );
  }

  if (scoreHighlights.top) {
    strengths.push(
      `${scoreHighlights.top.label} is the strongest scoring lane, averaging ${formatAverage(scoreHighlights.top.value)} points per finalized game.`,
    );
  }

  if (bestMatchup && strengths.length < 3) {
    strengths.push(
      `In repeated head-to-head play, ${playerName} has the clearest edge against ${bestMatchup.opponentName} at ${bestMatchup.wins}-${bestMatchup.losses}-${bestMatchup.ties}.`,
    );
  }

  while (strengths.length < 2) {
    strengths.push(
      strengths.length === 0
        ? `${playerName}'s profile is ready to turn finalized games into a concrete play identity.`
        : 'Complete score rows, style reads, and imported logs will make the strongest habits easier to call out.',
    );
  }

  if (performance) {
    if (performance.winRate < 0.5) {
      improvements.push(
        `Start by converting more competitive finishes into wins; the current win rate is ${formatPercent(performance.winRate)} over ${pluralize(performance.gamesPlayed, 'finalized game')}.`,
      );
    } else {
      improvements.push(
        `The next step is raising the floor in non-winning games so the ${formatPercent(performance.winRate)} win rate is backed by steadier finishes.`,
      );
    }

    if (performance.averageLossGap !== null && performance.averageLossGap > 0) {
      improvements.push(
        `Losses are averaging a ${formatAverage(performance.averageLossGap)}-point gap, so plan for one more late-game scoring swing before the final generation.`,
      );
    }
  }

  if (styleFocus) {
    improvements.push(
      `Use ${styleFocus.styleName} as a review focus: it has a ${formatPercent(styleFocus.winRate)} win rate over ${pluralize(styleFocus.gamesPlayed, 'game')}, so compare its openings and endgame scoring against stronger results.`,
    );
  }

  if (scoreHighlights.focus) {
    improvements.push(
      `${scoreHighlights.focus.label} is the lightest major score source at ${formatAverage(scoreHighlights.focus.value)} points on average; finding one more reliable route there would make low-variance games safer.`,
    );
  }

  while (improvements.length < 3) {
    const fallbacks = [
      'Keep logging complete score-source rows so the weakest scoring lanes become easier to separate from one-off games.',
      'Review one win and one loss after each session to compare tempo, card economy, and final-generation points.',
      'Import game logs when possible so the profile can connect card choices to actual outcomes.',
    ];

    improvements.push(fallbacks[improvements.length % fallbacks.length]);
  }

  return {
    improvements: improvements.slice(0, 4),
    strengths: strengths.slice(0, 3),
  };
}

export function ProfileDashboard({
  cardOutcomes = [],
  coverage = null,
  headToHeadRows = [],
  keyCards = [],
  linkHref,
  lossCards = [],
  performance = null,
  playerName,
  scoreAverages = null,
  styleBreakdownRows = [],
  styleInsights = [],
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

  const mostPlayedStyle = styleBreakdownRows[0] ?? null;
  const winningStyle = getWinningStyle(styleBreakdownRows);
  const playAnalysis = buildPlayAnalysis({
    headToHeadRows,
    performance,
    playerName,
    scoreAverages,
    styleBreakdownRows,
  });
  const styleEffectivenessScopes: StyleEffectivenessScopeInput[] =
    styleBreakdownRows.length > 0
      ? [
          {
            key: 'profile',
            label: playerName,
            scoreEntries: scoreAverages
              ? buildScoreSourceEntries(scoreAverages)
              : [],
            styleRows: styleBreakdownRows.map((row) => ({
              averagePlacement: row.averagePlacement,
              averageScore: row.averageScore,
              gamesPlayed: row.gamesPlayed,
              styleCode: row.styleCode,
              winRate: row.winRate,
              wins: row.wins,
            })),
            subject: {
              possessive: `${playerName}'s`,
              subject: playerName,
            },
          },
        ]
      : [];

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
                {performance.gamesPlayed} finalized games overall
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  <GlossaryLink slug="weighted-score">Weighted Score</GlossaryLink>
                </dt>
                <dd className="mt-2 text-lg font-semibold text-stone-100">
                  {formatAverage(performance.weightedScore)}
                </dd>
              </div>
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  <GlossaryLink slug="win-rate">Win Rate</GlossaryLink>
                </dt>
                <dd className="mt-2 text-lg font-semibold text-stone-100">
                  {formatPercent(performance.winRate)}
                </dd>
              </div>
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  <GlossaryLink slug="average-placement">Average Placement</GlossaryLink>
                </dt>
                <dd className="mt-2 text-lg font-semibold text-stone-100">
                  {formatAverage(performance.averagePlacement)}
                </dd>
              </div>
              <div className="tm-stat-card">
                <dt className="tm-data-label">
                  <GlossaryLink slug="average-score">Average Score</GlossaryLink>
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
      <ChartFrame title="Play Analysis">
        <div className="grid gap-3 lg:grid-cols-2">
          <article className="tm-stat-card">
            <h3 className="font-semibold text-stone-100">
              What {playerName} Does Well
            </h3>
            <ul
              aria-label={`What ${playerName} does well`}
              className="mt-3 grid list-disc gap-2 pl-5 text-sm text-stone-300"
            >
              {playAnalysis.strengths.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          </article>
          <article className="tm-stat-card">
            <h3 className="font-semibold text-stone-100">
              How {playerName} Could Improve
            </h3>
            <ul
              aria-label={`How ${playerName} could improve`}
              className="mt-3 grid list-disc gap-2 pl-5 text-sm text-stone-300"
            >
              {playAnalysis.improvements.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          </article>
        </div>
      </ChartFrame>
      <ChartFrame title="Group Comparisons">
        <p className="text-sm text-stone-300">
          Compare your play in any group you have played against your{' '}
          <GlossaryLink slug="overall-view">overall</GlossaryLink> record.
        </p>
        <Link
          className="tm-button-primary mt-4 inline-flex w-fit"
          href="/profile/comparison"
        >
          Open My Play vs Overall
        </Link>
      </ChartFrame>
      <ChartFrame title="Score Source Averages">
        <ScoreSourceList scoreAverages={scoreAverages} />
      </ChartFrame>
      <ProfileCardPanels
        cardOutcomes={cardOutcomes}
        keyCards={keyCards}
        lossCards={lossCards}
        playerName={playerName}
      />
      {styleEffectivenessScopes.length > 0 ? (
        <StyleEffectivenessPanel
          scopes={styleEffectivenessScopes}
          title="My Style Effectiveness"
        />
      ) : null}
      <ChartFrame title="Styles Breakdown">
        <p className="tm-muted-copy mb-3 text-sm">
          How each{' '}
          <GlossaryLink slug="inferred-style">inferred play style</GlossaryLink>{' '}
          you have used has performed across your finalized games.
        </p>
        {styleBreakdownRows.length === 0 ? (
          <p className="text-sm text-stone-400">
            No inferred style results are available for {playerName} yet.
          </p>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {mostPlayedStyle ? (
                <div className="tm-stat-card">
                  <p className="tm-data-label">Most Played</p>
                  <p className="mt-2 text-lg font-semibold text-stone-100">
                    {mostPlayedStyle.styleName}
                  </p>
                  <p className="tm-muted-copy mt-1 text-sm">
                    {mostPlayedStyle.gamesPlayed} games | {formatPercent(mostPlayedStyle.playRate)}
                  </p>
                </div>
              ) : null}
              {winningStyle ? (
                <div className="tm-stat-card">
                  <p className="tm-data-label">Most Wins</p>
                  <p className="mt-2 text-lg font-semibold text-stone-100">
                    {winningStyle.styleName}
                  </p>
                  <p className="tm-muted-copy mt-1 text-sm">
                    {winningStyle.wins} wins | {formatPercent(winningStyle.winRate)} win rate
                  </p>
                </div>
              ) : null}
            </div>
            <div className="grid gap-3">
              {styleBreakdownRows.map((row) => (
                <article className="tm-stat-card" key={row.styleCode}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-100">
                        {row.styleName}
                      </p>
                      <p className="tm-muted-copy mt-1 text-sm">
                        {row.gamesPlayed} games | {row.wins} wins
                      </p>
                    </div>
                    <p className="tm-accent-copy text-sm">
                      {formatPercent(row.playRate)} played
                    </p>
                  </div>
                  <p className="tm-muted-copy mt-2 text-sm">
                    {formatPercent(row.winRate)} win rate | avg place {formatAverage(row.averagePlacement)} | avg score {formatAverage(row.averageScore)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </ChartFrame>
      {styleInsights.length > 0 ? (
        <ChartFrame title="Style Insights">
          <div className="grid gap-3">
            {styleInsights.map((insight) => (
              <article className="tm-stat-card" key={insight.title}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-semibold text-stone-100">{insight.title}</p>
                  <p className="tm-data-label">
                    {insight.confidence} confidence
                  </p>
                </div>
                <p className="mt-2 text-sm text-stone-300">
                  {renderStyleInsightBody(insight)}
                </p>
                <p className="tm-muted-copy mt-2 text-xs">
                  Evidence: {insight.evidenceLabel}
                </p>
              </article>
            ))}
          </div>
        </ChartFrame>
      ) : null}
      <ChartFrame title="Head-to-Head Snapshot">
        <p className="tm-muted-copy mb-3 text-sm">
          Your direct{' '}
          <GlossaryLink slug="head-to-head">head-to-head</GlossaryLink> records
          against opponents you have shared{' '}
          <GlossaryLink slug="finalized-game">finalized games</GlossaryLink>{' '}
          with.
        </p>
        {headToHeadRows.length === 0 ? (
          <p className="text-sm text-stone-400">
            No finalized head-to-head matchups are available yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
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
      <ChartFrame title="Optional Data Coverage">
        <p className="tm-muted-copy mb-3 text-sm">
          How complete the{' '}
          <GlossaryLink slug="optional-data-coverage">
            optional data coverage
          </GlossaryLink>{' '}
          behind these charts is — a low value means a detail was not recorded,
          not that it was zero.
        </p>
        {coverage ? (
          <div className="flex flex-wrap gap-2">
            <GlossaryLink slug="full-card-breakdown-coverage">
              <CoverageBadge label="Full card breakdown" value={coverage.cardBreakdownCoverage} />
            </GlossaryLink>
            <GlossaryLink slug="microbe-coverage">
              <CoverageBadge label="Microbe coverage" value={coverage.microbeCoverage} />
            </GlossaryLink>
            <GlossaryLink slug="animal-coverage">
              <CoverageBadge label="Animal coverage" value={coverage.animalCoverage} />
            </GlossaryLink>
            <GlossaryLink slug="jovian-coverage">
              <CoverageBadge label="Jovian coverage" value={coverage.jovianCoverage} />
            </GlossaryLink>
            <GlossaryLink slug="key-card-coverage">
              <CoverageBadge label="Key-card coverage" value={coverage.keyCardCoverage} />
            </GlossaryLink>
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
