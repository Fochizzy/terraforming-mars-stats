import type {
  CoverageRow,
  GlobalMapMetricRow,
  GroupHeadToHeadRow,
  GroupInteractionRow,
  GroupStylePerformanceRow,
  LeaderboardRow,
  LineupEffectRow,
  PlayerEfficiencySummary,
  PlayerMapMetricRow,
  StyleAgreementRow,
  TrendRow,
} from '@/lib/db/analytics-repo';

type InsightConfidence = 'low' | 'medium' | 'high';
type InsightTone =
  | 'coverage'
  | 'interaction'
  | 'lineup'
  | 'performance'
  | 'rivalry'
  | 'style'
  | 'trend';

export type InsightCard = {
  body: string;
  confidence: InsightConfidence;
  sampleSize: number;
  title: string;
  tone: InsightTone;
};

type FocusedHeadToHeadRow = {
  averageScoreDifferential: number;
  gamesPlayed: number;
  losses: number;
  opponentName: string;
  ties: number;
  wins: number;
};

type BuildInsightCardsInput = {
  coverage?: CoverageRow | null;
  focusPlayerId?: string | null;
  focusPlayerName?: string | null;
  headToHeadRows?: GroupHeadToHeadRow[];
  globalMapMetricRows?: GlobalMapMetricRow[];
  interactionRows?: Array<
    GroupInteractionRow & {
      playerId?: string;
      playerName?: string;
    }
  >;
  leaderboardRows?: LeaderboardRow[];
  lineupEffectRows?: LineupEffectRow[];
  playerEfficiencySummaries?: PlayerEfficiencySummary[];
  playerMapMetricRows?: PlayerMapMetricRow[];
  stylePerformanceRows?: Array<
    GroupStylePerformanceRow & {
      playerId?: string;
      playerName?: string;
    }
  >;
  styleAgreementRows?: StyleAgreementRow[];
  trendRows?: TrendRow[];
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatAverage(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function getConfidence(sampleSize: number): InsightConfidence {
  if (sampleSize >= 6) {
    return 'high';
  }

  if (sampleSize >= 3) {
    return 'medium';
  }

  return 'low';
}

function humanizeStyleCode(styleCode: string) {
  return styleCode
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function humanizeInteractionType(interactionType: GroupInteractionRow['interactionType']) {
  if (interactionType === 'corporation_prelude_pair') {
    return 'corporation and prelude pairing';
  }

  return 'map and expansion mix';
}

function getPlayerLabel(
  playerId: string,
  focusPlayerName: string | null,
  leaderboardRows: LeaderboardRow[],
) {
  return (
    focusPlayerName ??
    leaderboardRows.find((row) => row.playerId === playerId)?.playerName ??
    playerId
  );
}

function getMapLabel(row: PlayerMapMetricRow | GlobalMapMetricRow) {
  return 'mapName' in row && row.mapName ? row.mapName : row.mapId;
}

function getMostCommonStyle(rows: TrendRow[]) {
  const counts = rows.reduce<Record<string, number>>((accumulator, row) => {
    if (!row.inferredPrimaryStyleCode) {
      return accumulator;
    }

    accumulator[row.inferredPrimaryStyleCode] =
      (accumulator[row.inferredPrimaryStyleCode] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )[0]?.[0] ?? null;
}

function normalizeFocusedHeadToHeadRows(
  focusPlayerId: string,
  rows: GroupHeadToHeadRow[],
): FocusedHeadToHeadRow[] {
  return rows
    .map((row) => {
      if (row.leftPlayerId === focusPlayerId) {
        return {
          opponentName: row.rightPlayerName,
          gamesPlayed: row.gamesPlayed,
          wins: row.leftWins,
          losses: row.rightWins,
          ties: row.ties,
          averageScoreDifferential: row.averageScoreDifferential,
        };
      }

      if (row.rightPlayerId === focusPlayerId) {
        return {
          opponentName: row.leftPlayerName,
          gamesPlayed: row.gamesPlayed,
          wins: row.rightWins,
          losses: row.leftWins,
          ties: row.ties,
          averageScoreDifferential: row.averageScoreDifferential * -1,
        };
      }

      return null;
    })
    .filter((row): row is FocusedHeadToHeadRow => Boolean(row))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        Math.abs(right.averageScoreDifferential) -
          Math.abs(left.averageScoreDifferential) ||
        left.opponentName.localeCompare(right.opponentName),
    );
}

export function buildInsightCards({
  coverage = null,
  focusPlayerId = null,
  focusPlayerName = null,
  globalMapMetricRows = [],
  headToHeadRows = [],
  interactionRows = [],
  leaderboardRows = [],
  lineupEffectRows = [],
  playerEfficiencySummaries = [],
  playerMapMetricRows = [],
  stylePerformanceRows = [],
  styleAgreementRows = [],
  trendRows = [],
}: BuildInsightCardsInput): InsightCard[] {
  const cards: InsightCard[] = [];

  const focusPerformance = focusPlayerId
    ? leaderboardRows.find((row) => row.playerId === focusPlayerId) ?? null
    : leaderboardRows[0] ?? null;

  if (focusPerformance) {
    const isFocusedPlayer = focusPlayerId === focusPerformance.playerId;
    cards.push({
      title: isFocusedPlayer ? 'Focused Form' : 'Group Leader',
      tone: 'performance',
      sampleSize: focusPerformance.gamesPlayed,
      confidence: getConfidence(focusPerformance.gamesPlayed),
      body: isFocusedPlayer
        ? `${focusPerformance.playerName} has a ${formatPercent(focusPerformance.winRate)} win rate with a ${formatAverage(focusPerformance.weightedScore)} weighted score and ${formatAverage(focusPerformance.averageScore)} average points across ${focusPerformance.gamesPlayed} finalized games.`
        : `${focusPerformance.playerName} currently leads the group with a ${formatPercent(focusPerformance.winRate)} win rate, ${formatAverage(focusPerformance.weightedScore)} weighted score, and ${formatAverage(focusPerformance.averageScore)} average points over ${focusPerformance.gamesPlayed} finalized games.`,
    });
  }

  if (focusPlayerId && focusPlayerName) {
    const focusedRivalry = normalizeFocusedHeadToHeadRows(focusPlayerId, headToHeadRows)[0];

    if (focusedRivalry) {
      const rivalryDirection =
        focusedRivalry.averageScoreDifferential >= 0 ? 'edge' : 'gap';

      cards.push({
        title: 'Head-to-Head Edge',
        tone: 'rivalry',
        sampleSize: focusedRivalry.gamesPlayed,
        confidence: getConfidence(focusedRivalry.gamesPlayed),
        body: `Against ${focusedRivalry.opponentName}, ${focusPlayerName} is ${focusedRivalry.wins}-${focusedRivalry.losses}-${focusedRivalry.ties} across ${focusedRivalry.gamesPlayed} finalized games with a ${formatAverage(Math.abs(focusedRivalry.averageScoreDifferential))}-point average score ${rivalryDirection}.`,
      });
    }
  } else {
    const rivalry = headToHeadRows[0];

    if (rivalry) {
      cards.push({
        title: 'Top Rivalry',
        tone: 'rivalry',
        sampleSize: rivalry.gamesPlayed,
        confidence: getConfidence(rivalry.gamesPlayed),
        body: `${rivalry.leftPlayerName} vs ${rivalry.rightPlayerName} is the biggest repeated rivalry so far at ${rivalry.gamesPlayed} finalized games, with a ${rivalry.leftWins}-${rivalry.rightWins}-${rivalry.ties} record and a ${formatAverage(Math.abs(rivalry.averageScoreDifferential))}-point average score swing.`,
      });
    }
  }

  const lineupRows = focusPlayerId
    ? lineupEffectRows.filter((row) => row.playerId === focusPlayerId)
    : lineupEffectRows;
  const lineupRow =
    [...lineupRows].sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        right.winRate - left.winRate ||
        right.averageScore - left.averageScore,
    )[0] ?? null;

  if (lineupRow) {
    cards.push({
      title: 'Lineup Effect',
      tone: 'lineup',
      sampleSize: lineupRow.gamesPlayed,
      confidence: getConfidence(lineupRow.gamesPlayed),
      body: `${lineupRow.playerName} is strongest into the ${lineupRow.lineupLabel} lineup, winning ${formatPercent(lineupRow.winRate)} of ${lineupRow.gamesPlayed} finalized games and averaging ${formatAverage(lineupRow.averageScore)} points.`,
    });
  }

  const interactionRow = [...interactionRows].sort(
    (left, right) =>
      right.winRate - left.winRate ||
      right.gamesPlayed - left.gamesPlayed ||
      left.averagePlacement - right.averagePlacement ||
      left.label.localeCompare(right.label),
  )[0];

  if (interactionRow) {
    const interactionLabel = humanizeInteractionType(interactionRow.interactionType);
    cards.push({
      title: 'Interaction Edge',
      tone: 'interaction',
      sampleSize: interactionRow.gamesPlayed,
      confidence: getConfidence(interactionRow.gamesPlayed),
      body: focusPlayerName
        ? `${focusPlayerName} performs best with the ${interactionRow.label} ${interactionLabel}, winning ${formatPercent(interactionRow.winRate)} of ${interactionRow.gamesPlayed} finalized results and averaging ${formatAverage(interactionRow.averageScore)} points.`
        : `${interactionRow.label} is the strongest current ${interactionLabel} in the group, producing a ${formatPercent(interactionRow.winRate)} win rate across ${interactionRow.gamesPlayed} finalized results with ${formatAverage(interactionRow.averageScore)} average points.`,
    });
  }

  const styleRow = focusPlayerId
    ? styleAgreementRows.find((row) => row.playerId === focusPlayerId) ?? null
    : styleAgreementRows[0] ?? null;

  if (styleRow) {
    cards.push({
      title: 'Style Agreement',
      tone: 'style',
      sampleSize: styleRow.comparedGames,
      confidence: getConfidence(styleRow.comparedGames),
      body: `${styleRow.playerName} has exact declared-versus-inferred style agreement in ${formatPercent(styleRow.exactMatchRate)} of ${styleRow.comparedGames} tagged finalized games, with ${formatPercent(styleRow.partialMatchRate)} partial matches.`,
    });
  }

  const bestStyleRow = [...stylePerformanceRows].sort(
    (left, right) =>
      right.winRate - left.winRate ||
      right.gamesPlayed - left.gamesPlayed ||
      left.averagePlacement - right.averagePlacement ||
      left.styleCode.localeCompare(right.styleCode),
  )[0];

  if (bestStyleRow) {
    const styleLabel = humanizeStyleCode(bestStyleRow.styleCode);
    cards.push({
      title: 'Best Style',
      tone: 'style',
      sampleSize: bestStyleRow.gamesPlayed,
      confidence: getConfidence(bestStyleRow.gamesPlayed),
      body: focusPlayerName
        ? `${focusPlayerName}'s strongest current inferred lane is ${styleLabel}, with a ${formatPercent(bestStyleRow.winRate)} win rate across ${bestStyleRow.gamesPlayed} finalized games and ${formatAverage(bestStyleRow.averageScore)} average points.`
        : `${styleLabel} is the group's strongest current inferred style, winning ${formatPercent(bestStyleRow.winRate)} of ${bestStyleRow.gamesPlayed} finalized results with ${formatAverage(bestStyleRow.averageScore)} average points.`,
    });
  }

  const efficiencyRows = focusPlayerId
    ? playerEfficiencySummaries.filter((row) => row.playerId === focusPlayerId)
    : playerEfficiencySummaries;
  const efficiencyRow =
    [...efficiencyRows].sort(
      (left, right) =>
        right.averagePointsPerGeneration - left.averagePointsPerGeneration ||
        right.gamesPlayed - left.gamesPlayed ||
        left.playerId.localeCompare(right.playerId),
    )[0] ?? null;

  if (efficiencyRow) {
    const playerLabel = getPlayerLabel(
      efficiencyRow.playerId,
      focusPlayerId === efficiencyRow.playerId ? focusPlayerName : null,
      leaderboardRows,
    );

    cards.push({
      title: 'Efficiency Signal',
      tone: 'performance',
      sampleSize: efficiencyRow.gamesPlayed,
      confidence: getConfidence(efficiencyRow.gamesPlayed),
      body: `${playerLabel} has the strongest persisted efficiency profile at ${formatAverage(efficiencyRow.averagePointsPerGeneration)} pts/gen across ${efficiencyRow.gamesPlayed} Supabase summary games${efficiencyRow.averageExpectedScore !== null ? `, with expected baseline ${formatAverage(efficiencyRow.averageExpectedScore)}` : ''}.`,
    });
  } else {
    const mapRows = focusPlayerId
      ? playerMapMetricRows.filter((row) => row.playerId === focusPlayerId)
      : playerMapMetricRows;
    const mapRow =
      [...mapRows].sort(
        (left, right) =>
          right.averagePointsPerGeneration - left.averagePointsPerGeneration ||
          right.gamesPlayed - left.gamesPlayed ||
          left.mapId.localeCompare(right.mapId),
      )[0] ?? null;

    if (mapRow) {
      cards.push({
        title: 'Persisted Map Edge',
        tone: 'performance',
        sampleSize: mapRow.gamesPlayed,
        confidence: getConfidence(mapRow.gamesPlayed),
        body: `${getMapLabel(mapRow)} is the strongest persisted map row at ${formatAverage(mapRow.averagePointsPerGeneration)} pts/gen across ${mapRow.gamesPlayed} Supabase summary games.`,
      });
    } else {
      const globalMapRow =
        [...globalMapMetricRows].sort(
          (left, right) =>
            right.gamesPlayed - left.gamesPlayed ||
            right.averagePointsPerGeneration - left.averagePointsPerGeneration ||
            left.mapId.localeCompare(right.mapId),
        )[0] ?? null;

      if (globalMapRow) {
        cards.push({
          title: 'Global Map Baseline',
          tone: 'performance',
          sampleSize: globalMapRow.gamesPlayed,
          confidence: getConfidence(globalMapRow.gamesPlayed),
          body: `${getMapLabel(globalMapRow)} leads the opted-in global map summaries at ${formatAverage(globalMapRow.averagePointsPerGeneration)} pts/gen across ${globalMapRow.gamesPlayed} games and ${globalMapRow.playerCount} players${globalMapRow.expectedScoreBaseline !== null ? `, baseline ${formatAverage(globalMapRow.expectedScoreBaseline)}` : ''}.`,
        });
      }
    }
  }

  const relevantTrendRows = sortTrendRowsForInsights(
    focusPlayerId ? trendRows.filter((row) => row.playerId === focusPlayerId) : trendRows,
  );
  if (relevantTrendRows.length >= 4) {
    const splitIndex = Math.floor(relevantTrendRows.length / 2);
    const earlyRows = relevantTrendRows.slice(0, splitIndex);
    const recentRows = relevantTrendRows.slice(-splitIndex);
    const earlyAverageScore = average(earlyRows.map((row) => row.totalPoints));
    const recentAverageScore = average(recentRows.map((row) => row.totalPoints));
    const earlyWinRate = average(earlyRows.map((row) => (row.isWinner ? 1 : 0)));
    const recentWinRate = average(recentRows.map((row) => (row.isWinner ? 1 : 0)));
    const recentStyle = getMostCommonStyle(recentRows);
    const styleFragment = recentStyle
      ? `, with ${humanizeStyleCode(recentStyle)} showing up most often in the recent half`
      : '';

    cards.push({
      title: 'Recent Trend',
      tone: 'trend',
      sampleSize: relevantTrendRows.length,
      confidence: getConfidence(relevantTrendRows.length),
      body: focusPlayerName
        ? `In recent finalized games, ${focusPlayerName} moved from ${formatPercent(earlyWinRate)} to ${formatPercent(recentWinRate)} wins and from ${formatAverage(earlyAverageScore)} to ${formatAverage(recentAverageScore)} average points${styleFragment}.`
        : `Across recent finalized group results, win rate moved from ${formatPercent(earlyWinRate)} to ${formatPercent(recentWinRate)} and average points moved from ${formatAverage(earlyAverageScore)} to ${formatAverage(recentAverageScore)}${styleFragment}.`,
    });
  } else if (coverage) {
    cards.push({
      title: 'Coverage Snapshot',
      tone: 'coverage',
      sampleSize: coverage.finalizedPlayerResults,
      confidence: getConfidence(coverage.finalizedGames),
      body: `${coverage.finalizedPlayerResults} finalized player results are on file, and ${formatPercent(coverage.cardBreakdownCoverage)} include full microbe, animal, and Jovian card breakdowns for richer style reads.`,
    });
  }

  return cards.slice(0, 7);
}

function sortTrendRowsForInsights(rows: TrendRow[]) {
  return [...rows].sort(
    (left, right) =>
      left.playedOn.localeCompare(right.playedOn) ||
      left.playerName.localeCompare(right.playerName),
  );
}
