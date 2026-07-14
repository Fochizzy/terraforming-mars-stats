import Link from 'next/link';
import type { ReactNode } from 'react';
import { CoverageBadge } from '@/components/charts/coverage-badge';
import { ChartFrame } from '@/components/charts/chart-frame';
import {
  buildScoreSourceEntries,
  type CoverageRow,
  type LeaderboardRow,
  type ProfileCardStat,
  type ProfileGameLengthProfile,
  type ProfileGlobalParameterTempoProfile,
  type ProfileHeadToHeadRow,
  type ProfileLeadPressure,
  type ProfilePhaseTempoProfile,
  type ProfileResourceRemovalProfile,
  type ProfileScorePace,
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
import {
  formatAverage,
  formatPercent,
  formatSignedAverage,
} from './performance-delta';
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
  gameLengthProfile?: ProfileGameLengthProfile | null;
  globalParameterTempoProfile?: ProfileGlobalParameterTempoProfile | null;
  headToHeadRows?: ProfileHeadToHeadRow[];
  keyCards?: ProfileCardStat[];
  leadPressure?: ProfileLeadPressure | null;
  lossCards?: ProfileCardStat[];
  performance?: LeaderboardRow | null;
  phaseTempoProfile?: ProfilePhaseTempoProfile | null;
  playerName: string | null;
  resourceRemovalProfile?: ProfileResourceRemovalProfile | null;
  scoreAverages?: ScoreSourceAverages | null;
  scorePace?: ProfileScorePace | null;
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
  gameLengthProfile,
  globalParameterTempoProfile,
  headToHeadRows,
  leadPressure,
  performance,
  phaseTempoProfile,
  playerName,
  resourceRemovalProfile,
  scoreAverages,
  scorePace,
  styleBreakdownRows,
}: {
  gameLengthProfile: ProfileGameLengthProfile | null;
  globalParameterTempoProfile: ProfileGlobalParameterTempoProfile | null;
  headToHeadRows: ProfileHeadToHeadRow[];
  leadPressure: ProfileLeadPressure | null;
  performance: LeaderboardRow | null;
  phaseTempoProfile: ProfilePhaseTempoProfile | null;
  playerName: string;
  resourceRemovalProfile: ProfileResourceRemovalProfile | null;
  scoreAverages: ScoreSourceAverages | null;
  scorePace: ProfileScorePace | null;
  styleBreakdownRows: ProfileStyleBreakdownRow[];
}) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const mostPlayedStyle = styleBreakdownRows[0] ?? null;
  const winningStyle = getWinningStyle(styleBreakdownRows);
  const styleFocus = getStyleFocus(styleBreakdownRows);
  const bestMatchup = getBestMatchup(headToHeadRows);
  const scoreHighlights = getScoreSourceHighlights(scoreAverages);

  const addStrength = (sentence: string | null) => {
    if (sentence && !strengths.includes(sentence)) {
      strengths.push(sentence);
    }
  };
  const addImprovement = (sentence: string | null) => {
    if (sentence && !improvements.includes(sentence)) {
      improvements.push(sentence);
    }
  };

  if (leadPressure && scorePace?.strongestSource) {
    addStrength(
      `${playerName} is a ${leadPressure.pressureLabel.toLowerCase()}: they lead in ${formatPercent(leadPressure.leadRate)} of finalized games, carry a ${formatSignedAverage(leadPressure.averageScoreDifferential)} average score edge, and pace their strongest scoring lane through ${scorePace.strongestSource.label} at ${formatAverage(scorePace.strongestSource.averagePointsPerGeneration)} points per generation.`,
    );
  } else if (leadPressure) {
    addStrength(
      `${playerName} is a ${leadPressure.pressureLabel.toLowerCase()}, leading in ${formatPercent(leadPressure.leadRate)} of finalized games with a ${formatSignedAverage(leadPressure.averageScoreDifferential)} average score edge.`,
    );
  } else if (scorePace?.strongestSource) {
    addStrength(
      `${scorePace.strongestSource.label} is the clearest pace engine, producing ${formatAverage(scorePace.strongestSource.averagePointsPerGeneration)} points per generation on average.`,
    );
  }

  const fitSignals: string[] = [];

  if (
    phaseTempoProfile?.bestPhase &&
    phaseTempoProfile.bestPhase.winRateWhenPeak !== null
  ) {
    fitSignals.push(
      `activity peaking in the ${phaseTempoProfile.bestPhase.label.toLowerCase()} (${formatPercent(phaseTempoProfile.bestPhase.winRateWhenPeak)} win rate)`,
    );
  }

  if (globalParameterTempoProfile?.bestMix) {
    fitSignals.push(
      `${globalParameterTempoProfile.bestMix.label.toLowerCase()} games (${formatPercent(globalParameterTempoProfile.bestMix.winRate)} win rate)`,
    );
  }

  if (gameLengthProfile?.bestBucket) {
    fitSignals.push(
      `${gameLengthProfile.bestBucket.label.toLowerCase()} (${formatPercent(gameLengthProfile.bestBucket.winRate)} win rate)`,
    );
  }

  if (fitSignals.length > 0) {
    addStrength(
      `The best-fit game shapes are ${fitSignals.join(', ')}; those are the tempo and length patterns where the profile data says ${playerName}'s plan travels best.`,
    );
  }

  if (
    resourceRemovalProfile &&
    resourceRemovalProfile.outgoing.events > 0 &&
    resourceRemovalProfile.outgoing.totalAmount >=
      resourceRemovalProfile.incoming.totalAmount
  ) {
    addStrength(
      `${playerName}'s interaction pressure is proactive: they made opponents lose ${formatAverage(resourceRemovalProfile.outgoing.totalAmount)} resources or production across ${pluralize(resourceRemovalProfile.outgoing.events, 'attributed removal')}, at least matching what opponents removed from them.`,
    );
  }

  if (performance && strengths.length < 3) {
    const gamesLabel = pluralize(performance.gamesPlayed, 'finalized game');

    if (performance.winRate >= 0.5) {
      addStrength(
        `${playerName} wins ${formatPercent(performance.winRate)} of ${gamesLabel}, so they are already turning a strong share of tables into wins.`,
      );
    } else if (performance.averagePlacement <= 2.5) {
      addStrength(
        `${playerName} stays in the mix with an average placement of ${formatAverage(performance.averagePlacement)} across ${gamesLabel}.`,
      );
    } else {
      addStrength(
        `${playerName} has ${gamesLabel} logged, which gives them a real baseline for spotting repeatable play patterns.`,
      );
    }
  }

  if (winningStyle && winningStyle.wins > 0 && strengths.length < 3) {
    addStrength(
      `${winningStyle.styleName} is the clearest successful plan, producing ${pluralize(winningStyle.wins, 'win')} and a ${formatPercent(winningStyle.winRate)} win rate.`,
    );
  } else if (mostPlayedStyle && strengths.length < 3) {
    addStrength(
      `${playerName} has a defined style identity around ${mostPlayedStyle.styleName}, using it in ${formatPercent(mostPlayedStyle.playRate)} of inferred-style games.`,
    );
  }

  if (scoreHighlights.top && strengths.length < 3) {
    addStrength(
      `${scoreHighlights.top.label} is the strongest scoring lane, averaging ${formatAverage(scoreHighlights.top.value)} points per finalized game.`,
    );
  }

  if (bestMatchup && strengths.length < 3) {
    addStrength(
      `In repeated head-to-head play, ${playerName} has the clearest edge against ${bestMatchup.opponentName} at ${bestMatchup.wins}-${bestMatchup.losses}-${bestMatchup.ties}.`,
    );
  }

  while (strengths.length < 2) {
    addStrength(
      strengths.length === 0
        ? `${playerName}'s profile is ready to turn finalized games into a concrete play identity.`
        : 'Complete score rows, style reads, and imported logs will make the strongest habits easier to call out.',
    );
  }

  const roughSpotSignals: string[] = [];

  if (
    gameLengthProfile?.weakestBucket &&
    gameLengthProfile.bestBucket &&
    gameLengthProfile.weakestBucket.bucket !== gameLengthProfile.bestBucket.bucket
  ) {
    roughSpotSignals.push(
      `${gameLengthProfile.weakestBucket.label.toLowerCase()} (${formatPercent(gameLengthProfile.weakestBucket.winRate)} win rate)`,
    );
  }

  if (
    globalParameterTempoProfile?.weakestMix &&
    globalParameterTempoProfile.bestMix &&
    globalParameterTempoProfile.weakestMix.code !==
      globalParameterTempoProfile.bestMix.code
  ) {
    roughSpotSignals.push(
      `${globalParameterTempoProfile.weakestMix.label.toLowerCase()} games (${formatPercent(globalParameterTempoProfile.weakestMix.winRate)} win rate)`,
    );
  }

  if (roughSpotSignals.length > 0) {
    addImprovement(
      `Tighten the roughest game shapes first: ${roughSpotSignals.join(' and ')} are where the profile currently shows the weakest outcomes.`,
    );
  }

  if (phaseTempoProfile?.bestPhase) {
    const phase = phaseTempoProfile.bestPhase;

    addImprovement(
      `Use the ${phase.label.toLowerCase()} peak as a review template: compare openings and late-game turns against the logs where that phase drove ${formatPercent(phase.winRateWhenPeak ?? 0)} win-rate outcomes.`,
    );
  } else if (
    phaseTempoProfile?.mostActivePhase &&
    phaseTempoProfile.mostActivePhase.actions > 0
  ) {
    addImprovement(
      `Review whether the ${phaseTempoProfile.mostActivePhase.label.toLowerCase()} activity spike is converting into points, because it is the heaviest logged tempo phase.`,
    );
  }

  if (scorePace?.lightestSource) {
    addImprovement(
      `The lightest pace source is ${scorePace.lightestSource.label} at ${formatAverage(scorePace.lightestSource.averagePointsPerGeneration)} points per generation; finding one more reliable route there would make low-variance games safer.`,
    );
  } else if (scoreHighlights.focus) {
    addImprovement(
      `${scoreHighlights.focus.label} is the lightest major score source at ${formatAverage(scoreHighlights.focus.value)} points on average; finding one more reliable route there would make low-variance games safer.`,
    );
  }

  if (resourceRemovalProfile && resourceRemovalProfile.incoming.events > 0) {
    addImprovement(
      `Build a buffer against resource and production attacks: opponents have made ${playerName} lose ${formatAverage(resourceRemovalProfile.incoming.totalAmount)} across ${pluralize(resourceRemovalProfile.incoming.events, 'attributed removal')}.`,
    );
  }

  if (leadPressure && leadPressure.averageShortfallWhenBehind !== null) {
    const chaseGap = leadPressure.averageShortfallWhenBehind;

    addImprovement(
      chaseGap > 0
        ? `When the explicit lead does not materialize, plan for a catch-up package worth at least ${formatAverage(chaseGap)} points, which is the average chase gap in non-winning games.`
        : `Keep testing whether the explicit-lead plan still works from behind, because the current profile has little shortfall data to separate comeback play from front-running.`,
    );
  }

  if (performance && improvements.length < 4) {
    if (performance.winRate < 0.5) {
      addImprovement(
        `Start by converting more competitive finishes into wins; the current win rate is ${formatPercent(performance.winRate)} over ${pluralize(performance.gamesPlayed, 'finalized game')}.`,
      );
    } else {
      addImprovement(
        `The next step is raising the floor in non-winning games so the ${formatPercent(performance.winRate)} win rate is backed by steadier finishes.`,
      );
    }

    if (performance.averageLossGap !== null && performance.averageLossGap > 0) {
      addImprovement(
        `Losses are averaging a ${formatAverage(performance.averageLossGap)}-point gap, so plan for one more late-game scoring swing before the final generation.`,
      );
    }
  }

  if (styleFocus && improvements.length < 4) {
    addImprovement(
      `Use ${styleFocus.styleName} as a review focus: it has a ${formatPercent(styleFocus.winRate)} win rate over ${pluralize(styleFocus.gamesPlayed, 'game')}, so compare its openings and endgame scoring against stronger results.`,
    );
  }

  while (improvements.length < 3) {
    const fallbacks = [
      'Keep logging complete score-source rows so the weakest scoring lanes become easier to separate from one-off games.',
      'Review one win and one loss after each session to compare tempo, card economy, and final-generation points.',
      'Import game logs when possible so the profile can connect card choices to actual outcomes.',
    ];

    addImprovement(fallbacks[improvements.length % fallbacks.length]);
  }

  return {
    improvements: improvements.slice(0, 4),
    strengths: strengths.slice(0, 3),
  };
}

function buildModelEnhancements({
  resourceRemovalProfile,
  scorePace,
}: {
  resourceRemovalProfile: ProfileResourceRemovalProfile | null;
  scorePace: ProfileScorePace | null;
}) {
  const suggestions = [
    'Store explicit source player and target player on each removal event so attack metrics do not depend on prior-card inference.',
    'Split resource deltas from production deltas; production removal is strategically different from spending or losing stored resources.',
    'Capture per-generation snapshots for TR, card points, greeneries, cities, and milestone progress so pace can separate early pressure from final scoring.',
    'Track milestone claim generation, award funding timing, and second-place award outcomes to show whether pressure is proactive or reactive.',
  ];

  if (!scorePace) {
    suggestions.unshift(
      'Keep generation counts on every finalized game so per-generation style pace can be calculated consistently.',
    );
  }

  if (!resourceRemovalProfile || resourceRemovalProfile.importedGames === 0) {
    suggestions.unshift(
      'Import more game logs so the model can connect card plays, resource removal, and actual opponents.',
    );
  }

  return suggestions.slice(0, 5);
}

function buildPhaseTempoStatements(
  phaseTempoProfile: ProfilePhaseTempoProfile | null,
) {
  if (!phaseTempoProfile) {
    return [
      'Import logs with generation markers to show whether your strongest play happens early, mid, or late.',
    ];
  }

  const statements: string[] = [];

  const bestPhase = phaseTempoProfile.bestPhase;
  const bestPhaseWinRate = bestPhase?.winRateWhenPeak ?? null;

  if (bestPhase && bestPhaseWinRate !== null) {
    const phase = bestPhase;

    statements.push(
      `Your best log-backed results come when your activity peaks in the ${phase.label.toLowerCase()}: ${formatPercent(bestPhaseWinRate)} win rate over ${pluralize(phase.gamesWithPeak, 'imported game')}, with average placement ${formatAverage(phase.averagePlacementWhenPeak)}.`,
    );
  }

  if (
    phaseTempoProfile.mostActivePhase &&
    phaseTempoProfile.mostActivePhase.actions > 0
  ) {
    const phase = phaseTempoProfile.mostActivePhase;

    statements.push(
      `Your logged tempo is heaviest in the ${phase.label.toLowerCase()}, averaging ${formatAverage(phase.actionsPerImportedGame)} tracked actions per imported game.`,
    );
  }

  if (statements.length === 0) {
    statements.push(
      'Imported logs are present, but they do not yet contain enough player-scoped generation actions to call an early, mid, or late tendency.',
    );
  }

  statements.push(phaseTempoProfile.confidenceLabel);

  return statements;
}

function buildGameLengthStatements(
  gameLengthProfile: ProfileGameLengthProfile | null,
) {
  if (!gameLengthProfile || gameLengthProfile.rows.length === 0) {
    return [
      'Finalized games with generation counts will show whether short, standard, or long games suit you best.',
    ];
  }

  const statements: string[] = [];

  if (gameLengthProfile.bestBucket) {
    const best = gameLengthProfile.bestBucket;

    statements.push(
      `You do best in ${best.label.toLowerCase()} (${best.rangeLabel}): ${formatPercent(best.winRate)} win rate, average placement ${formatAverage(best.averagePlacement)}, and ${formatAverage(best.averagePointsPerGeneration)} points per generation over ${pluralize(best.gamesPlayed, 'game')}.`,
    );
  }

  if (
    gameLengthProfile.weakestBucket &&
    gameLengthProfile.bestBucket &&
    gameLengthProfile.weakestBucket.bucket !== gameLengthProfile.bestBucket.bucket
  ) {
    const weakest = gameLengthProfile.weakestBucket;

    statements.push(
      `${weakest.label} are the roughest length so far at ${formatPercent(weakest.winRate)} win rate and average placement ${formatAverage(weakest.averagePlacement)}.`,
    );
  }

  return statements;
}

function buildGlobalParameterTempoStatements(
  globalParameterTempoProfile: ProfileGlobalParameterTempoProfile | null,
) {
  if (
    !globalParameterTempoProfile ||
    globalParameterTempoProfile.rows.length === 0
  ) {
    return [
      'Imported logs with oxygen, heat, and ocean raises will show which fast terraforming mixes help or hurt you.',
    ];
  }

  const best = globalParameterTempoProfile.bestMix;
  const weakest = globalParameterTempoProfile.weakestMix;

  if (!best) {
    return [
      'Imported logs are present, but there is not enough linked-player oxygen, heat, or ocean tempo to compare fast terraforming mixes yet.',
      globalParameterTempoProfile.confidenceLabel,
    ];
  }

  const statements: string[] = [];
  const bestSentence = `You fare best in ${best.label.toLowerCase()} games: ${formatPercent(best.winRate)} win rate, average placement ${formatAverage(best.averagePlacement)}, and average score ${formatAverage(best.averageScore)} over ${pluralize(best.gamesPlayed, 'imported game')}.`;

  if (weakest && weakest.code !== best.code) {
    statements.push(
      `${bestSentence} Your toughest fast-terraforming mix is ${weakest.label.toLowerCase()} games at ${formatPercent(weakest.winRate)} win rate and average placement ${formatAverage(weakest.averagePlacement)}.`,
    );
  } else {
    statements.push(
      `${bestSentence} More mixed fast-parameter logs will make the best/worst split sharper.`,
    );
  }

  statements.push(globalParameterTempoProfile.confidenceLabel);

  return statements;
}

export function ProfileDashboard({
  cardOutcomes = [],
  coverage = null,
  gameLengthProfile = null,
  globalParameterTempoProfile = null,
  headToHeadRows = [],
  keyCards = [],
  leadPressure = null,
  linkHref,
  lossCards = [],
  performance = null,
  phaseTempoProfile = null,
  playerName,
  resourceRemovalProfile = null,
  scoreAverages = null,
  scorePace = null,
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
    gameLengthProfile,
    globalParameterTempoProfile,
    headToHeadRows,
    leadPressure,
    performance,
    phaseTempoProfile,
    playerName,
    resourceRemovalProfile,
    scoreAverages,
    scorePace,
    styleBreakdownRows,
  });
  const modelEnhancements = buildModelEnhancements({
    resourceRemovalProfile,
    scorePace,
  });
  const phaseTempoStatements = buildPhaseTempoStatements(phaseTempoProfile);
  const gameLengthStatements = buildGameLengthStatements(gameLengthProfile);
  const globalParameterTempoStatements = buildGlobalParameterTempoStatements(
    globalParameterTempoProfile,
  );
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
      <ChartFrame title="Play Style Profile">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="tm-stat-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-100">
                  Score Pace by Generation
                </h3>
                <p className="tm-muted-copy mt-1 text-sm">
                  TR, card points, greenery, milestones, and cities normalized by game length.
                </p>
              </div>
              {scorePace ? (
                <p className="tm-accent-copy text-sm">
                  {formatAverage(scorePace.averageTotalPointsPerGeneration)} pts/gen
                </p>
              ) : null}
            </div>
            {scorePace ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Source</th>
                      <th className="pb-2 pr-4 font-medium">Per Gen</th>
                      <th className="pb-2 pr-4 font-medium">Per Game</th>
                      <th className="pb-2 font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-stone-200">
                    {scorePace.rows.map((row) => (
                      <tr key={row.code}>
                        <td className="py-2 pr-4">{row.label}</td>
                        <td className="py-2 pr-4">
                          {formatAverage(row.averagePointsPerGeneration)}
                        </td>
                        <td className="py-2 pr-4">
                          {formatAverage(row.averagePoints)}
                        </td>
                        <td className="py-2">{formatPercent(row.scoreShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="tm-muted-copy mt-3 text-xs">
                  Average game length: {formatAverage(scorePace.averageGenerationCount)} generations.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-stone-400">
                Per-generation score pace will appear after finalized games include generation counts.
              </p>
            )}
          </section>
          <div className="grid gap-3">
            <article className="tm-stat-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-semibold text-stone-100">
                  Explicit Lead
                </h3>
                {leadPressure ? (
                  <p className="tm-data-label">{leadPressure.pressureLabel}</p>
                ) : null}
              </div>
              {leadPressure ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="tm-data-label">Lead Rate</dt>
                    <dd className="mt-1 text-stone-100">
                      {formatPercent(leadPressure.leadRate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="tm-data-label">Score Edge</dt>
                    <dd className="mt-1 text-stone-100">
                      {formatSignedAverage(leadPressure.averageScoreDifferential)}
                    </dd>
                  </div>
                  <div>
                    <dt className="tm-data-label">Avg Winning Lead</dt>
                    <dd className="mt-1 text-stone-100">
                      {formatAverage(leadPressure.averageLeadWhenWinning)}
                    </dd>
                  </div>
                  <div>
                    <dt className="tm-data-label">Avg Chase Gap</dt>
                    <dd className="mt-1 text-stone-100">
                      {formatAverage(leadPressure.averageShortfallWhenBehind)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-stone-400">
                  Lead pressure needs finalized score differentials.
                </p>
              )}
            </article>
            <article className="tm-stat-card">
              <h3 className="font-semibold text-stone-100">
                Interaction Pressure
              </h3>
              {resourceRemovalProfile ? (
                <div className="mt-3 grid gap-2 text-sm text-stone-300">
                  <p>
                    You made opponents lose{' '}
                    <span className="font-semibold text-stone-100">
                      {formatAverage(resourceRemovalProfile.outgoing.totalAmount)}
                    </span>{' '}
                    resources or production over{' '}
                    {pluralize(resourceRemovalProfile.outgoing.events, 'attributed removal')}.
                  </p>
                  <p>
                    Opponents made you lose{' '}
                    <span className="font-semibold text-stone-100">
                      {formatAverage(resourceRemovalProfile.incoming.totalAmount)}
                    </span>{' '}
                    resources or production over{' '}
                    {pluralize(resourceRemovalProfile.incoming.events, 'attributed removal')}.
                  </p>
                  {resourceRemovalProfile.resourceRows[0] ? (
                    <p className="tm-muted-copy text-xs">
                      Most affected resource/production track: {resourceRemovalProfile.resourceRows[0].resourceType} ({formatAverage(resourceRemovalProfile.resourceRows[0].amount)} total).
                    </p>
                  ) : (
                    <p className="tm-muted-copy text-xs">
                      No resource or production removal events were found in imported logs yet.
                    </p>
                  )}
                  <p className="tm-muted-copy text-xs">
                    {resourceRemovalProfile.confidenceLabel}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-400">
                  Imported game logs will add resource and production removal pressure here.
                </p>
              )}
            </article>
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-3">
          <article className="tm-stat-card">
            <h3 className="font-semibold text-stone-100">
              Early, Mid, and Late Game
            </h3>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-stone-300">
              {phaseTempoStatements.map((statement) => (
                <li key={statement}>{statement}</li>
              ))}
            </ul>
            {phaseTempoProfile ? (
              <div className="mt-4 grid gap-2 text-sm">
                {phaseTempoProfile.rows.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2"
                    key={row.phase}
                  >
                    <span className="font-medium text-stone-200">
                      {row.label}
                    </span>
                    <span className="tm-muted-copy">
                      {formatAverage(row.actionsPerImportedGame)} actions/game
                      {row.winRateWhenPeak !== null
                        ? ` | ${formatPercent(row.winRateWhenPeak)} when peak`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
          <article className="tm-stat-card">
            <h3 className="font-semibold text-stone-100">
              Terraforming Tempo
            </h3>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-stone-300">
              {globalParameterTempoStatements.map((statement) => (
                <li key={statement}>{statement}</li>
              ))}
            </ul>
            {globalParameterTempoProfile?.rows.length ? (
              <div className="mt-4 grid gap-2 text-sm">
                {globalParameterTempoProfile.rows.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2"
                    key={row.code}
                  >
                    <span className="font-medium text-stone-200">
                      {row.label}
                    </span>
                    <span className="tm-muted-copy">
                      {formatPercent(row.winRate)} | avg place{' '}
                      {formatAverage(row.averagePlacement)} | gen{' '}
                      {formatAverage(row.averageFastGeneration)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
          <article className="tm-stat-card">
            <h3 className="font-semibold text-stone-100">
              Generation Length Fit
            </h3>
            <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-stone-300">
              {gameLengthStatements.map((statement) => (
                <li key={statement}>{statement}</li>
              ))}
            </ul>
            {gameLengthProfile ? (
              <div className="mt-4 grid gap-2 text-sm">
                {gameLengthProfile.rows.map((row) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2"
                    key={row.bucket}
                  >
                    <span className="font-medium text-stone-200">
                      {row.label}
                    </span>
                    <span className="tm-muted-copy">
                      {formatPercent(row.winRate)} | avg place{' '}
                      {formatAverage(row.averagePlacement)} |{' '}
                      {formatAverage(row.averagePointsPerGeneration)} pts/gen
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </div>
        <article className="tm-stat-card mt-4">
          <h3 className="font-semibold text-stone-100">
            Ways to Enhance the Model
          </h3>
          <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm text-stone-300">
            {modelEnhancements.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </article>
      </ChartFrame>
      <ChartFrame title="Group Comparisons">
        <p className="text-sm text-stone-300">
          Compare your play in any group you have played against your{' '}
          <GlossaryLink slug="overall-view">overall</GlossaryLink> record.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="tm-button-primary inline-flex w-fit"
            href="/profile/compare"
          >
            Compare Players
          </Link>
          <Link
            className="tm-button-secondary inline-flex w-fit px-4 py-2 text-xs"
            href="/profile/comparison"
          >
            Open My Play vs Overall
          </Link>
        </div>
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
