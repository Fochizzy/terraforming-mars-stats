import type {
  CoverageRow,
  CrossGroupFocusPerson,
  GroupAnalytics,
  GroupHeadToHeadRow,
  GroupStylePerformanceRow,
  LeaderboardRow,
  LineupEffectRow,
  PlayerScoreSourceAverages,
  PlayerStylePerformanceRow,
  ScoreSourceAverages,
  SharedGameResultRow,
  StyleAgreementRow,
  TrendRow,
} from '@/lib/db/analytics-repo';
import type {
  ExtendedGroupAnalytics,
  GameLengthBucket,
  GameLengthPerformanceRow,
  GenerationDistributionRow,
  GroupMapPerformanceRow,
  PlacementDistributionRow,
  PlayerCountPerformanceRow,
  PlayerMapPerformanceRow,
} from '@/lib/db/extended-analytics-repo';
import type { MapAwardGroup } from '@/lib/db/reference-repo';

const COMBINATION_GROUP_ID = 'player-combination';

const scoreAverageKeys = [
  'averageAnimalPoints',
  'averageAwardPoints',
  'averageCardPoints',
  'averageCitiesPoints',
  'averageGreeneryPoints',
  'averageJovianPoints',
  'averageMicrobePoints',
  'averageMilestonePoints',
  'averageOtherCardPoints',
  'averageTrPoints',
] as const satisfies ReadonlyArray<keyof ScoreSourceAverages>;

export type PlayerCombinationOption = {
  canonicalId: string;
  displayName: string;
  gamesPlayed: number;
  playerIds: string[];
};

export type PlayerCombinationAnalytics = {
  analytics: GroupAnalytics;
  extended: ExtendedGroupAnalytics;
  matchingGameCount: number;
  matchingResultCount: number;
  selectedPlayerNames: string[];
};

type PlayerIdentity = {
  canonicalId: string;
  displayName: string;
};

type NormalizedResultRow = SharedGameResultRow;

type WeightedNumber = {
  value: number;
  weight: number;
};

function buildEmptyAnalytics(): GroupAnalytics {
  return {
    coverage: null,
    groupInteractionRows: [],
    groupStylePerformanceRows: [],
    headToHeadRows: [],
    importCoverageRows: [],
    leaderboardRows: [],
    lineupEffectRows: [],
    playerCoverages: [],
    playerInteractionRows: [],
    playerScoreAverages: [],
    playerStylePerformanceRows: [],
    playerTrendRows: [],
    scoreAverages: null,
    styleAgreementRows: [],
  };
}

function buildEmptyExtendedAnalytics(): ExtendedGroupAnalytics {
  return {
    awardFunderWinnerRows: [],
    awardOutcomeRows: [],
    cardOutcomeRows: [],
    gameLengthPerformanceRows: [],
    generationDistributionRows: [],
    generationPaceRows: [],
    groupMapPerformanceRows: [],
    milestoneEconomicsRows: [],
    placementDistributionRows: [],
    playerCountPerformanceRows: [],
    playerMapPerformanceRows: [],
    playerMilestoneClaimRows: [],
    tagOutcomeRows: [],
    tilePlacementRows: [],
  };
}

function roundNumber(value: number, digits = 3) {
  return Number(value.toFixed(digits));
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageNullable(values: Array<null | number>) {
  return average(values.filter((value): value is number => value !== null));
}

function weightedAverage(entries: WeightedNumber[]) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  return (
    entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
    totalWeight
  );
}

function ratio(count: number, total: number) {
  return total > 0 ? roundNumber(count / total, 4) : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function sortByPlayerName<T extends { playerName?: string }>(rows: T[]) {
  return rows.sort((left, right) =>
    (left.playerName ?? '').localeCompare(right.playerName ?? ''),
  );
}

function getLengthBucket(generationCount: number): GameLengthBucket {
  if (generationCount <= 9) {
    return 'short';
  }

  if (generationCount >= 12) {
    return 'long';
  }

  return 'standard';
}

function getUniqueGameRows(rows: NormalizedResultRow[]) {
  const byGame = new Map<string, NormalizedResultRow>();

  for (const row of rows) {
    if (!byGame.has(row.gameId)) {
      byGame.set(row.gameId, row);
    }
  }

  return [...byGame.values()];
}

function buildIdentityByPlayerId(focusPeople: CrossGroupFocusPerson[]) {
  const identityByPlayerId = new Map<string, PlayerIdentity>();

  for (const person of focusPeople) {
    for (const playerId of person.playerIds) {
      identityByPlayerId.set(playerId, {
        canonicalId: person.canonicalId,
        displayName: person.displayName,
      });
    }
  }

  return identityByPlayerId;
}

function normalizeResultRows(
  rows: SharedGameResultRow[],
  identityByPlayerId: Map<string, PlayerIdentity>,
): NormalizedResultRow[] {
  return rows.map((row) => {
    const identity = identityByPlayerId.get(row.playerId);

    return {
      ...row,
      groupId: COMBINATION_GROUP_ID,
      playerId: identity?.canonicalId ?? row.playerId,
      playerName: identity?.displayName ?? row.playerName,
    };
  });
}

export function buildPlayerCombinationOptions(input: {
  currentUserCanonicalId?: string;
  focusPeople: CrossGroupFocusPerson[];
  rows: SharedGameResultRow[];
}): PlayerCombinationOption[] {
  const gameIdsByPlayerId = new Map<string, Set<string>>();

  for (const row of input.rows) {
    const gameIds = gameIdsByPlayerId.get(row.playerId) ?? new Set<string>();
    gameIds.add(row.gameId);
    gameIdsByPlayerId.set(row.playerId, gameIds);
  }

  return input.focusPeople
    .map((person) => {
      const gameIds = new Set<string>();

      for (const playerId of person.playerIds) {
        for (const gameId of gameIdsByPlayerId.get(playerId) ?? []) {
          gameIds.add(gameId);
        }
      }

      const fallbackGamesPlayed =
        person.bundle.performance?.gamesPlayed ??
        new Set(person.bundle.trendRows.map((row) => row.gameId)).size;

      return {
        canonicalId: person.canonicalId,
        displayName: person.displayName,
        gamesPlayed: gameIds.size > 0 ? gameIds.size : fallbackGamesPlayed,
        playerIds: person.playerIds,
      };
    })
    .sort((left, right) => {
      if (left.canonicalId === input.currentUserCanonicalId) return -1;
      if (right.canonicalId === input.currentUserCanonicalId) return 1;
      return right.gamesPlayed - left.gamesPlayed || left.displayName.localeCompare(right.displayName);
    });
}

function findMatchingGameIds(input: {
  options: PlayerCombinationOption[];
  rows: SharedGameResultRow[];
  selectedCanonicalIds: string[];
}) {
  const selectedIds = new Set(input.selectedCanonicalIds);
  const selectedOptions = input.options.filter((option) =>
    selectedIds.has(option.canonicalId),
  );
  const rowsByGame = new Map<string, SharedGameResultRow[]>();

  for (const row of input.rows) {
    const gameRows = rowsByGame.get(row.gameId) ?? [];
    gameRows.push(row);
    rowsByGame.set(row.gameId, gameRows);
  }

  if (selectedOptions.length === 0) {
    return new Set(rowsByGame.keys());
  }

  return new Set(
    [...rowsByGame.entries()].flatMap(([gameId, gameRows]) => {
      const gamePlayerIds = new Set(gameRows.map((row) => row.playerId));
      const hasEverySelectedPlayer = selectedOptions.every((option) =>
        option.playerIds.some((playerId) => gamePlayerIds.has(playerId)),
      );

      return hasEverySelectedPlayer ? [gameId] : [];
    }),
  );
}

function buildScoreAverages(rows: NormalizedResultRow[]): ScoreSourceAverages | null {
  if (rows.length === 0) {
    return null;
  }

  return {
    averageAnimalPoints: roundNumber(
      average(rows.map((row) => row.cardPointsAnimals ?? 0)) ?? 0,
    ),
    averageAwardPoints: roundNumber(
      average(rows.map((row) => row.awardPoints)) ?? 0,
    ),
    averageCardPoints: roundNumber(
      average(rows.map((row) => row.cardPointsTotal)) ?? 0,
    ),
    averageCitiesPoints: roundNumber(
      average(rows.map((row) => row.citiesPoints)) ?? 0,
    ),
    averageGreeneryPoints: roundNumber(
      average(rows.map((row) => row.greeneryPoints)) ?? 0,
    ),
    averageJovianPoints: roundNumber(
      average(rows.map((row) => row.cardPointsJovian ?? 0)) ?? 0,
    ),
    averageMicrobePoints: roundNumber(
      average(rows.map((row) => row.cardPointsMicrobes ?? 0)) ?? 0,
    ),
    averageMilestonePoints: roundNumber(
      average(rows.map((row) => row.milestonePoints)) ?? 0,
    ),
    averageOtherCardPoints: roundNumber(
      average(rows.map((row) => row.otherCardPoints ?? 0)) ?? 0,
    ),
    averageTrPoints: roundNumber(average(rows.map((row) => row.trPoints)) ?? 0),
  };
}

function buildLeaderboardRows(rows: NormalizedResultRow[]): LeaderboardRow[] {
  const rowsByPlayer = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const playerRows = rowsByPlayer.get(row.playerId) ?? [];
    playerRows.push(row);
    rowsByPlayer.set(row.playerId, playerRows);
  }

  return [...rowsByPlayer.entries()]
    .map(([playerId, playerRows]) => {
      const wins = playerRows.filter((row) => row.isWinner).length;
      const winRate = ratio(wins, playerRows.length);
      const placementComponent = roundNumber(
        (average(playerRows.map((row) => row.placementScore)) ?? 0) * 0.3,
        4,
      );
      const winRateComponent = roundNumber(winRate * 0.5, 4);
      const differentialComponent = roundNumber(
        clamp(
          (average(playerRows.map((row) => row.signedDifferentialPoints)) ?? 0) /
            20,
          -1,
          1,
        ) * 0.2,
        4,
      );

      return {
        averageLossGap: averageNullable(
          playerRows.map((row) => row.lossGapPoints),
        ),
        averagePlacement: roundNumber(
          average(playerRows.map((row) => row.placement)) ?? 0,
        ),
        averageScore: roundNumber(
          average(playerRows.map((row) => row.totalPoints)) ?? 0,
        ),
        averageWinMargin: averageNullable(
          playerRows.map((row) => row.winDifferentialPoints),
        ),
        differentialComponent,
        gamesPlayed: playerRows.length,
        groupId: COMBINATION_GROUP_ID,
        placementComponent,
        playerId,
        playerName: playerRows[0]?.playerName ?? 'Unknown player',
        weightedScore: roundNumber(
          winRateComponent + placementComponent + differentialComponent,
          4,
        ),
        winRate,
        winRateComponent,
        wins,
      };
    })
    .sort(
      (left, right) =>
        right.weightedScore - left.weightedScore ||
        right.gamesPlayed - left.gamesPlayed ||
        left.playerName.localeCompare(right.playerName),
    );
}

function buildPlayerScoreAverages(
  rows: NormalizedResultRow[],
): PlayerScoreSourceAverages[] {
  const rowsByPlayer = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const playerRows = rowsByPlayer.get(row.playerId) ?? [];
    playerRows.push(row);
    rowsByPlayer.set(row.playerId, playerRows);
  }

  return sortByPlayerName(
    [...rowsByPlayer.entries()].flatMap(([playerId, playerRows]) => {
      const averages = buildScoreAverages(playerRows);

      if (!averages) {
        return [];
      }

      return [
        {
          ...averages,
          groupId: COMBINATION_GROUP_ID,
          playerId,
          playerName: playerRows[0]?.playerName ?? 'Unknown player',
        },
      ];
    }),
  );
}

function buildCoverage(
  rows: NormalizedResultRow[],
  player?: { id: string; name: string },
): CoverageRow | null {
  if (rows.length === 0) {
    return null;
  }

  return {
    animalCoverage: ratio(
      rows.filter((row) => row.cardPointsAnimals !== null).length,
      rows.length,
    ),
    cardBreakdownCoverage: ratio(
      rows.filter((row) => row.hasFullCardBreakdown).length,
      rows.length,
    ),
    declaredStyleCoverage: ratio(
      rows.filter((row) => row.declaredPrimaryStyleCode !== null).length,
      rows.length,
    ),
    finalizedGames: new Set(rows.map((row) => row.gameId)).size,
    finalizedPlayerResults: rows.length,
    groupId: COMBINATION_GROUP_ID,
    jovianCoverage: ratio(
      rows.filter((row) => row.cardPointsJovian !== null).length,
      rows.length,
    ),
    keyCardCoverage: ratio(
      rows.filter((row) => row.keyCardCount > 0).length,
      rows.length,
    ),
    microbeCoverage: ratio(
      rows.filter((row) => row.cardPointsMicrobes !== null).length,
      rows.length,
    ),
    playerId: player?.id,
    playerName: player?.name,
  };
}

function buildPlayerCoverages(rows: NormalizedResultRow[]): CoverageRow[] {
  const rowsByPlayer = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const playerRows = rowsByPlayer.get(row.playerId) ?? [];
    playerRows.push(row);
    rowsByPlayer.set(row.playerId, playerRows);
  }

  return sortByPlayerName(
    [...rowsByPlayer.entries()].flatMap(([playerId, playerRows]) => {
      const coverage = buildCoverage(playerRows, {
        id: playerId,
        name: playerRows[0]?.playerName ?? 'Unknown player',
      });

      return coverage ? [coverage] : [];
    }),
  );
}

function buildStylePerformanceRows(
  rows: NormalizedResultRow[],
): GroupStylePerformanceRow[] {
  const rowsByStyle = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    if (!row.inferredPrimaryStyleCode) {
      continue;
    }

    const styleRows = rowsByStyle.get(row.inferredPrimaryStyleCode) ?? [];
    styleRows.push(row);
    rowsByStyle.set(row.inferredPrimaryStyleCode, styleRows);
  }

  return [...rowsByStyle.entries()]
    .map(([styleCode, styleRows]) => {
      const wins = styleRows.filter((row) => row.isWinner).length;

      return {
        averageGenerationCount: roundNumber(
          average(styleRows.map((row) => row.generationCount)) ?? 0,
        ),
        averagePlacement: roundNumber(
          average(styleRows.map((row) => row.placement)) ?? 0,
        ),
        averageScore: roundNumber(
          average(styleRows.map((row) => row.totalPoints)) ?? 0,
        ),
        gamesPlayed: styleRows.length,
        groupId: COMBINATION_GROUP_ID,
        styleCode,
        winRate: ratio(wins, styleRows.length),
        wins,
      };
    })
    .sort(
      (left, right) =>
        right.winRate - left.winRate ||
        right.gamesPlayed - left.gamesPlayed ||
        left.styleCode.localeCompare(right.styleCode),
    );
}

function buildPlayerStylePerformanceRows(
  rows: NormalizedResultRow[],
): PlayerStylePerformanceRow[] {
  const rowsByPlayerStyle = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    if (!row.inferredPrimaryStyleCode) {
      continue;
    }

    const key = `${row.playerId}::${row.inferredPrimaryStyleCode}`;
    const styleRows = rowsByPlayerStyle.get(key) ?? [];
    styleRows.push(row);
    rowsByPlayerStyle.set(key, styleRows);
  }

  return [...rowsByPlayerStyle.entries()]
    .map(([, styleRows]) => {
      const wins = styleRows.filter((row) => row.isWinner).length;
      const firstRow = styleRows[0];

      return {
        averageGenerationCount: roundNumber(
          average(styleRows.map((row) => row.generationCount)) ?? 0,
        ),
        averagePlacement: roundNumber(
          average(styleRows.map((row) => row.placement)) ?? 0,
        ),
        averageScore: roundNumber(
          average(styleRows.map((row) => row.totalPoints)) ?? 0,
        ),
        gamesPlayed: styleRows.length,
        groupId: COMBINATION_GROUP_ID,
        playerId: firstRow.playerId,
        playerName: firstRow.playerName,
        styleCode: firstRow.inferredPrimaryStyleCode ?? 'unclassified',
        winRate: ratio(wins, styleRows.length),
        wins,
      };
    })
    .sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        right.winRate - left.winRate ||
        right.gamesPlayed - left.gamesPlayed,
    );
}

function buildTrendRows(rows: NormalizedResultRow[]): TrendRow[] {
  return rows
    .map((row) => ({
      gameId: row.gameId,
      generationCount: row.generationCount,
      groupId: COMBINATION_GROUP_ID,
      inferredPrimaryStyleCode: row.inferredPrimaryStyleCode,
      isWinner: row.isWinner,
      placement: row.placement,
      playedOn: row.playedOn,
      playerId: row.playerId,
      playerName: row.playerName,
      totalPoints: row.totalPoints,
    }))
    .sort(
      (left, right) =>
        left.playedOn.localeCompare(right.playedOn) ||
        left.playerName.localeCompare(right.playerName),
    );
}

function buildHeadToHeadRows(rows: NormalizedResultRow[]): GroupHeadToHeadRow[] {
  const rowsByGame = new Map<string, NormalizedResultRow[]>();
  const pairs = new Map<
    string,
    {
      differentials: number[];
      left: NormalizedResultRow;
      leftWins: number;
      placementEdges: number[];
      right: NormalizedResultRow;
      rightWins: number;
      ties: number;
    }
  >();

  for (const row of rows) {
    const gameRows = rowsByGame.get(row.gameId) ?? [];
    gameRows.push(row);
    rowsByGame.set(row.gameId, gameRows);
  }

  for (const gameRows of rowsByGame.values()) {
    const sortedRows = [...gameRows].sort((left, right) =>
      left.playerId.localeCompare(right.playerId),
    );

    for (let leftIndex = 0; leftIndex < sortedRows.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < sortedRows.length;
        rightIndex += 1
      ) {
        const left = sortedRows[leftIndex];
        const right = sortedRows[rightIndex];
        const key = `${left.playerId}::${right.playerId}`;
        const entry = pairs.get(key) ?? {
          differentials: [],
          left,
          leftWins: 0,
          placementEdges: [],
          right,
          rightWins: 0,
          ties: 0,
        };

        if (left.placement < right.placement) {
          entry.leftWins += 1;
        } else if (right.placement < left.placement) {
          entry.rightWins += 1;
        } else {
          entry.ties += 1;
        }

        entry.differentials.push(left.totalPoints - right.totalPoints);
        entry.placementEdges.push(right.placement - left.placement);
        pairs.set(key, entry);
      }
    }
  }

  return [...pairs.values()]
    .map((entry) => ({
      averagePlacementEdge: roundNumber(average(entry.placementEdges) ?? 0),
      averageScoreDifferential: roundNumber(average(entry.differentials) ?? 0),
      gamesPlayed: entry.differentials.length,
      groupId: COMBINATION_GROUP_ID,
      leftPlayerId: entry.left.playerId,
      leftPlayerName: entry.left.playerName,
      leftWins: entry.leftWins,
      rightPlayerId: entry.right.playerId,
      rightPlayerName: entry.right.playerName,
      rightWins: entry.rightWins,
      ties: entry.ties,
    }))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        Math.abs(right.averageScoreDifferential) -
          Math.abs(left.averageScoreDifferential) ||
        left.leftPlayerName.localeCompare(right.leftPlayerName),
    );
}

function buildLineupEffectRows(rows: NormalizedResultRow[]): LineupEffectRow[] {
  const rowsByGame = new Map<string, NormalizedResultRow[]>();
  const lineupRows = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const gameRows = rowsByGame.get(row.gameId) ?? [];
    gameRows.push(row);
    rowsByGame.set(row.gameId, gameRows);
  }

  for (const gameRows of rowsByGame.values()) {
    for (const row of gameRows) {
      const opponents = gameRows
        .filter((candidate) => candidate.playerId !== row.playerId)
        .sort((left, right) => left.playerName.localeCompare(right.playerName));
      const lineupKey = opponents.map((opponent) => opponent.playerId).join(',');
      const key = `${row.playerId}::${lineupKey}`;
      const existing = lineupRows.get(key) ?? [];
      existing.push(row);
      lineupRows.set(key, existing);
    }
  }

  return [...lineupRows.values()]
    .map((lineup) => {
      const firstRow = lineup[0];
      const wins = lineup.filter((row) => row.isWinner).length;
      const opponents = rowsByGame
        .get(firstRow.gameId)
        ?.filter((candidate) => candidate.playerId !== firstRow.playerId)
        .sort((left, right) => left.playerName.localeCompare(right.playerName));

      return {
        averageGenerationCount: roundNumber(
          average(lineup.map((row) => row.generationCount)) ?? 0,
        ),
        averagePlacement: roundNumber(
          average(lineup.map((row) => row.placement)) ?? 0,
        ),
        averageScore: roundNumber(
          average(lineup.map((row) => row.totalPoints)) ?? 0,
        ),
        gamesPlayed: lineup.length,
        groupId: COMBINATION_GROUP_ID,
        lineupLabel:
          opponents?.map((opponent) => opponent.playerName).join(', ') ||
          'Solo setup',
        playerId: firstRow.playerId,
        playerName: firstRow.playerName,
        winRate: ratio(wins, lineup.length),
      };
    })
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        right.winRate - left.winRate ||
        left.playerName.localeCompare(right.playerName),
    );
}

function buildStyleAgreementRows(rows: NormalizedResultRow[]): StyleAgreementRow[] {
  const rowsByPlayer = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const playerRows = rowsByPlayer.get(row.playerId) ?? [];
    playerRows.push(row);
    rowsByPlayer.set(row.playerId, playerRows);
  }

  return sortByPlayerName(
    [...rowsByPlayer.entries()].flatMap(([playerId, playerRows]) => {
      const comparedRows = playerRows.filter(
        (row) =>
          row.declaredPrimaryStyleCode !== null &&
          row.inferredPrimaryStyleCode !== null,
      );

      if (comparedRows.length === 0) {
        return [];
      }

      const exactMatches = comparedRows.filter(
        (row) => row.declaredPrimaryStyleCode === row.inferredPrimaryStyleCode,
      ).length;
      const partialMatches = comparedRows.filter(
        (row) =>
          row.declaredPrimaryStyleCode !== row.inferredPrimaryStyleCode &&
          row.inferredPrimaryStyleCode !== null &&
          row.declaredModifierStyleCodes.includes(row.inferredPrimaryStyleCode),
      ).length;
      const mismatches = comparedRows.length - exactMatches - partialMatches;

      return [
        {
          averageInferredConfidence: averageNullable(
            comparedRows.map((row) => row.inferredStyleConfidence),
          ),
          comparedGames: comparedRows.length,
          exactMatchRate: ratio(exactMatches, comparedRows.length),
          groupId: COMBINATION_GROUP_ID,
          mismatchRate: ratio(mismatches, comparedRows.length),
          partialMatchRate: ratio(partialMatches, comparedRows.length),
          playerId,
          playerName: playerRows[0]?.playerName ?? 'Unknown player',
        },
      ];
    }),
  );
}

function buildGenerationDistributionRows(
  rows: NormalizedResultRow[],
): GenerationDistributionRow[] {
  const counts = new Map<number, number>();

  for (const row of getUniqueGameRows(rows)) {
    counts.set(row.generationCount, (counts.get(row.generationCount) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([generationCount, gamesPlayed]) => ({
      gamesPlayed,
      generationCount,
      groupId: COMBINATION_GROUP_ID,
    }));
}

function buildPlacementDistributionRows(
  rows: NormalizedResultRow[],
): PlacementDistributionRow[] {
  const rowsByPlayerPlacement = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const key = `${row.playerId}::${row.placement}`;
    const placementRows = rowsByPlayerPlacement.get(key) ?? [];
    placementRows.push(row);
    rowsByPlayerPlacement.set(key, placementRows);
  }

  return [...rowsByPlayerPlacement.values()]
    .map((placementRows) => {
      const firstRow = placementRows[0];

      return {
        gamesPlayed: placementRows.length,
        groupId: COMBINATION_GROUP_ID,
        placement: firstRow.placement,
        playerId: firstRow.playerId,
        playerName: firstRow.playerName,
      };
    })
    .sort(
      (left, right) =>
        left.placement - right.placement ||
        left.playerName.localeCompare(right.playerName),
    );
}

function buildPlayerCountPerformanceRows(
  rows: NormalizedResultRow[],
): PlayerCountPerformanceRow[] {
  const rowsByPlayerCount = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const key = `${row.playerId}::${row.playerCount}`;
    const countRows = rowsByPlayerCount.get(key) ?? [];
    countRows.push(row);
    rowsByPlayerCount.set(key, countRows);
  }

  return [...rowsByPlayerCount.values()]
    .map((countRows) => {
      const firstRow = countRows[0];
      const wins = countRows.filter((row) => row.isWinner).length;

      return {
        averagePlacement: roundNumber(
          average(countRows.map((row) => row.placement)) ?? 0,
        ),
        averageScore: roundNumber(
          average(countRows.map((row) => row.totalPoints)) ?? 0,
        ),
        gamesPlayed: countRows.length,
        groupId: COMBINATION_GROUP_ID,
        playerCount: firstRow.playerCount,
        playerId: firstRow.playerId,
        playerName: firstRow.playerName,
        winRate: ratio(wins, countRows.length),
        wins,
      };
    })
    .sort(
      (left, right) =>
        left.playerCount - right.playerCount ||
        left.playerName.localeCompare(right.playerName),
    );
}

function buildGameLengthPerformanceRows(
  rows: NormalizedResultRow[],
): GameLengthPerformanceRow[] {
  const rowsByPlayerBucket = new Map<string, NormalizedResultRow[]>();

  for (const row of rows) {
    const bucket = getLengthBucket(row.generationCount);
    const key = `${row.playerId}::${bucket}`;
    const bucketRows = rowsByPlayerBucket.get(key) ?? [];
    bucketRows.push(row);
    rowsByPlayerBucket.set(key, bucketRows);
  }

  return [...rowsByPlayerBucket.values()]
    .map((bucketRows) => {
      const firstRow = bucketRows[0];
      const wins = bucketRows.filter((row) => row.isWinner).length;

      return {
        averagePointsPerGeneration: roundNumber(
          average(
            bucketRows.map((row) => row.totalPoints / row.generationCount),
          ) ?? 0,
        ),
        averageScore: roundNumber(
          average(bucketRows.map((row) => row.totalPoints)) ?? 0,
        ),
        gamesPlayed: bucketRows.length,
        groupId: COMBINATION_GROUP_ID,
        lengthBucket: getLengthBucket(firstRow.generationCount),
        playerId: firstRow.playerId,
        playerName: firstRow.playerName,
        winRate: ratio(wins, bucketRows.length),
        wins,
      };
    })
    .sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        left.lengthBucket.localeCompare(right.lengthBucket),
    );
}

function buildMapPerformanceRows(input: {
  mapAwardGroups?: MapAwardGroup[];
  rows: NormalizedResultRow[];
}) {
  const mapNameById = new Map(
    (input.mapAwardGroups ?? []).map((mapGroup) => [
      mapGroup.mapId,
      mapGroup.mapName,
    ]),
  );
  const rowsByMap = new Map<string, NormalizedResultRow[]>();
  const rowsByPlayerMap = new Map<string, NormalizedResultRow[]>();

  for (const row of input.rows) {
    const mapKey = row.mapId ?? 'unknown-map';
    const mapRows = rowsByMap.get(mapKey) ?? [];
    mapRows.push(row);
    rowsByMap.set(mapKey, mapRows);

    const playerMapKey = `${row.playerId}::${mapKey}`;
    const playerMapRows = rowsByPlayerMap.get(playerMapKey) ?? [];
    playerMapRows.push(row);
    rowsByPlayerMap.set(playerMapKey, playerMapRows);
  }

  const groupRows: GroupMapPerformanceRow[] = [...rowsByMap.entries()]
    .map(([mapId, mapRows]) => ({
      averageGenerationCount: roundNumber(
        average(mapRows.map((row) => row.generationCount)) ?? 0,
      ),
      averageScore: roundNumber(
        average(mapRows.map((row) => row.totalPoints)) ?? 0,
      ),
      gamesPlayed: new Set(mapRows.map((row) => row.gameId)).size,
      groupId: COMBINATION_GROUP_ID,
      mapId: mapId === 'unknown-map' ? null : mapId,
      mapName:
        mapId === 'unknown-map'
          ? 'Unknown Map'
          : mapNameById.get(mapId) ?? 'Unknown Map',
    }))
    .sort(
      (left, right) =>
        right.gamesPlayed - left.gamesPlayed ||
        left.mapName.localeCompare(right.mapName),
    );

  const playerRows: PlayerMapPerformanceRow[] = [...rowsByPlayerMap.entries()]
    .map(([, mapRows]) => {
      const firstRow = mapRows[0];
      const wins = mapRows.filter((row) => row.isWinner).length;

      return {
        averagePlacement: roundNumber(
          average(mapRows.map((row) => row.placement)) ?? 0,
        ),
        averageScore: roundNumber(
          average(mapRows.map((row) => row.totalPoints)) ?? 0,
        ),
        gamesPlayed: mapRows.length,
        groupId: COMBINATION_GROUP_ID,
        mapId: firstRow.mapId,
        mapName: firstRow.mapId
          ? mapNameById.get(firstRow.mapId) ?? 'Unknown Map'
          : 'Unknown Map',
        playerId: firstRow.playerId,
        playerName: firstRow.playerName,
        winRate: ratio(wins, mapRows.length),
        wins,
      };
    })
    .sort(
      (left, right) =>
        left.playerName.localeCompare(right.playerName) ||
        right.gamesPlayed - left.gamesPlayed ||
        left.mapName.localeCompare(right.mapName),
    );

  return { groupRows, playerRows };
}

function filterRowLevelExtendedData(
  source: ExtendedGroupAnalytics,
  matchingGameIds: Set<string>,
  selectedPlayerIds: Set<string>,
): Partial<ExtendedGroupAnalytics> {
  const isSelectedRow = (row: { gameId: string; playerId: string | null }) =>
    matchingGameIds.has(row.gameId) &&
    (selectedPlayerIds.size === 0 ||
      (row.playerId !== null && selectedPlayerIds.has(row.playerId)));

  return {
    cardOutcomeRows: source.cardOutcomeRows.filter(isSelectedRow),
    generationPaceRows: source.generationPaceRows.filter(isSelectedRow),
    tagOutcomeRows: source.tagOutcomeRows.filter(isSelectedRow),
    tilePlacementRows: source.tilePlacementRows.filter(isSelectedRow),
  };
}

function weightedScoreAverages(
  rows: PlayerScoreSourceAverages[],
): ScoreSourceAverages | null {
  if (rows.length === 0) {
    return null;
  }

  return scoreAverageKeys.reduce((averages, key) => {
    averages[key] = roundNumber(
      weightedAverage(
        rows.map((row) => ({
          value: row[key],
          weight: 1,
        })),
      ) ?? 0,
    );

    return averages;
  }, {} as ScoreSourceAverages);
}

export function buildPlayerCombinationAnalytics(input: {
  currentUserCanonicalId?: string;
  focusPeople: CrossGroupFocusPerson[];
  mapAwardGroups?: MapAwardGroup[];
  rows: SharedGameResultRow[];
  selectedCanonicalIds: string[];
  sourceExtended?: ExtendedGroupAnalytics;
}): PlayerCombinationAnalytics {
  const options = buildPlayerCombinationOptions({
    currentUserCanonicalId: input.currentUserCanonicalId,
    focusPeople: input.focusPeople,
    rows: input.rows,
  });
  const selectedIdSet = new Set(input.selectedCanonicalIds);
  const selectedPlayerNames = options
    .filter((option) => selectedIdSet.has(option.canonicalId))
    .map((option) => option.displayName);
  const matchingGameIds = findMatchingGameIds({
    options,
    rows: input.rows,
    selectedCanonicalIds: input.selectedCanonicalIds,
  });
  const identityByPlayerId = buildIdentityByPlayerId(input.focusPeople);
  const matchingGameRows = normalizeResultRows(
    input.rows.filter((row) => matchingGameIds.has(row.gameId)),
    identityByPlayerId,
  );
  // A combination first finds games containing every checked player, then
  // limits every downstream player-level dataset to those checked players.
  // Without this second boundary, an unchecked seat from a matching game could
  // still appear in the leaderboard, trend, map, card, or tag charts.
  const matchingRows =
    selectedIdSet.size === 0
      ? matchingGameRows
      : matchingGameRows.filter((row) => selectedIdSet.has(row.playerId));
  const selectedPlayerIds = new Set<string>(input.selectedCanonicalIds);

  for (const option of options) {
    if (!selectedIdSet.has(option.canonicalId)) {
      continue;
    }

    for (const playerId of option.playerIds) {
      selectedPlayerIds.add(playerId);
    }
  }

  const playerScoreAverages = buildPlayerScoreAverages(matchingRows);
  const mapRows = buildMapPerformanceRows({
    mapAwardGroups: input.mapAwardGroups,
    rows: matchingRows,
  });
  const filteredExtended = input.sourceExtended
    ? filterRowLevelExtendedData(
        input.sourceExtended,
        matchingGameIds,
        selectedPlayerIds,
      )
    : {};
  const extended: ExtendedGroupAnalytics = {
    ...buildEmptyExtendedAnalytics(),
    ...filteredExtended,
    gameLengthPerformanceRows: buildGameLengthPerformanceRows(matchingRows),
    generationDistributionRows: buildGenerationDistributionRows(matchingRows),
    groupMapPerformanceRows: mapRows.groupRows,
    placementDistributionRows: buildPlacementDistributionRows(matchingRows),
    playerCountPerformanceRows: buildPlayerCountPerformanceRows(matchingRows),
    playerMapPerformanceRows: mapRows.playerRows,
  };

  return {
    analytics: {
      ...buildEmptyAnalytics(),
      coverage: buildCoverage(matchingRows),
      groupStylePerformanceRows: buildStylePerformanceRows(matchingRows),
      headToHeadRows: buildHeadToHeadRows(matchingRows),
      leaderboardRows: buildLeaderboardRows(matchingRows),
      lineupEffectRows: buildLineupEffectRows(matchingRows),
      playerCoverages: buildPlayerCoverages(matchingRows),
      playerScoreAverages,
      playerStylePerformanceRows: buildPlayerStylePerformanceRows(matchingRows),
      playerTrendRows: buildTrendRows(matchingRows),
      scoreAverages:
        buildScoreAverages(matchingRows) ?? weightedScoreAverages(playerScoreAverages),
      styleAgreementRows: buildStyleAgreementRows(matchingRows),
    },
    extended,
    matchingGameCount: matchingGameIds.size,
    matchingResultCount: matchingRows.length,
    selectedPlayerNames,
  };
}
