import type {
  GroupInteractionRow,
  GroupStylePerformanceRow,
  LineupEffectRow,
  PlayerInteractionRow,
  PlayerStylePerformanceRow,
  StyleAgreementRow,
} from '@/lib/db/analytics-repo';
import type {
  AwardFunderWinnerRow,
  AwardOutcomeRow,
  CardOutcomeRow,
  GameLengthPerformanceRow,
  GenerationDistributionRow,
  GenerationPaceRow,
  GroupMapPerformanceRow,
  MilestoneEconomicsRow,
  PlacementDistributionRow,
  PlayerCountPerformanceRow,
  PlayerMapPerformanceRow,
  PlayerMilestoneClaimRow,
  TagOutcomeRow,
  TilePlacementRow,
} from '@/lib/db/extended-analytics-repo';

/**
 * Pure cross-group aggregation helpers for the Insights "Overall" scope.
 *
 * The group-split migration gives every person a distinct player row per group,
 * so combining several groups' analytics requires collapsing those rows to one
 * canonical person. Each helper takes rows drawn from a set of groups and an
 * {@link IdentityLookup} that maps a per-group player id to a stable canonical
 * identity, then re-aggregates to canonical grain: count columns are summed,
 * averages are re-weighted by their row's sample size, and rates are recomputed
 * from the summed numerator/denominator. Group-level rows collapse to a single
 * synthetic "overall" bucket. Row-level rows (one per game) only need their
 * player id remapped, since each game belongs to exactly one group.
 */

export const OVERALL_GROUP_ID = 'overall';

export type CanonicalIdentity = {
  canonicalId: string;
  displayName: string;
};

export type IdentityLookup = (playerId: string, fallbackName: string) => CanonicalIdentity;

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function weightedMean(
  entries: Array<{ value: number; weight: number }>,
  digits = 2,
): number {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  const weighted = entries.reduce(
    (sum, entry) => sum + entry.value * entry.weight,
    0,
  );

  return roundTo(weighted / totalWeight, digits);
}

function rate(numerator: number, denominator: number, digits = 4): number {
  if (denominator <= 0) {
    return 0;
  }

  return roundTo(numerator / denominator, digits);
}

// Accumulates weighted-average and rate inputs for a single merged bucket.
type Accumulator = {
  averages: Map<string, Array<{ value: number; weight: number }>>;
  counts: Map<string, number>;
};

function emptyAccumulator(): Accumulator {
  return { averages: new Map(), counts: new Map() };
}

function addCount(acc: Accumulator, key: string, value: number) {
  acc.counts.set(key, (acc.counts.get(key) ?? 0) + value);
}

function addWeighted(acc: Accumulator, key: string, value: number, weight: number) {
  const existing = acc.averages.get(key) ?? [];
  existing.push({ value, weight });
  acc.averages.set(key, existing);
}

function readCount(acc: Accumulator, key: string) {
  return acc.counts.get(key) ?? 0;
}

function readMean(acc: Accumulator, key: string, digits = 2) {
  return weightedMean(acc.averages.get(key) ?? [], digits);
}

// ---------------------------------------------------------------------------
// Extended analytics — player-keyed views (merge by canonical person + dimension)
// ---------------------------------------------------------------------------

export function mergePlacementDistribution(
  rows: PlacementDistributionRow[],
  lookup: IdentityLookup,
): PlacementDistributionRow[] {
  const merged = new Map<string, PlacementDistributionRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.placement}`;
    const existing = merged.get(key);

    if (existing) {
      existing.gamesPlayed += row.gamesPlayed;
    } else {
      merged.set(key, {
        gamesPlayed: row.gamesPlayed,
        groupId: OVERALL_GROUP_ID,
        placement: row.placement,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
      });
    }
  }

  return [...merged.values()];
}

export function mergePlayerCountPerformance(
  rows: PlayerCountPerformanceRow[],
  lookup: IdentityLookup,
): PlayerCountPerformanceRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, PlayerCountPerformanceRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.playerCount}`;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addCount(acc, `${key}|wins`, row.wins);
    addWeighted(acc, `${key}|placement`, row.averagePlacement, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averagePlacement: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        playerCount: row.playerCount,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
        winRate: 0,
        wins: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const games = readCount(acc, `${key}|games`);
    const wins = readCount(acc, `${key}|wins`);

    return {
      ...row,
      averagePlacement: readMean(acc, `${key}|placement`),
      averageScore: readMean(acc, `${key}|score`, 1),
      gamesPlayed: games,
      winRate: rate(wins, games, 3),
      wins,
    };
  });
}

export function mergeGameLengthPerformance(
  rows: GameLengthPerformanceRow[],
  lookup: IdentityLookup,
): GameLengthPerformanceRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, GameLengthPerformanceRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.lengthBucket}`;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addCount(acc, `${key}|wins`, row.wins);
    addWeighted(acc, `${key}|pace`, row.averagePointsPerGeneration, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averagePointsPerGeneration: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        lengthBucket: row.lengthBucket,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
        winRate: 0,
        wins: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const games = readCount(acc, `${key}|games`);
    const wins = readCount(acc, `${key}|wins`);

    return {
      ...row,
      averagePointsPerGeneration: readMean(acc, `${key}|pace`, 1),
      averageScore: readMean(acc, `${key}|score`, 1),
      gamesPlayed: games,
      winRate: rate(wins, games, 3),
      wins,
    };
  });
}

export function mergePlayerMapPerformance(
  rows: PlayerMapPerformanceRow[],
  lookup: IdentityLookup,
): PlayerMapPerformanceRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, PlayerMapPerformanceRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.mapId ?? row.mapName}`;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addCount(acc, `${key}|wins`, row.wins);
    addWeighted(acc, `${key}|placement`, row.averagePlacement, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averagePlacement: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        mapId: row.mapId,
        mapName: row.mapName,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
        winRate: 0,
        wins: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const games = readCount(acc, `${key}|games`);
    const wins = readCount(acc, `${key}|wins`);

    return {
      ...row,
      averagePlacement: readMean(acc, `${key}|placement`),
      averageScore: readMean(acc, `${key}|score`, 1),
      gamesPlayed: games,
      winRate: rate(wins, games, 3),
      wins,
    };
  });
}

export function mergePlayerMilestoneClaims(
  rows: PlayerMilestoneClaimRow[],
  lookup: IdentityLookup,
): PlayerMilestoneClaimRow[] {
  const merged = new Map<string, PlayerMilestoneClaimRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.milestoneId}`;
    const existing = merged.get(key);

    if (existing) {
      existing.claims += row.claims;
      existing.claimerWins += row.claimerWins;
    } else {
      merged.set(key, {
        claimerWins: row.claimerWins,
        claims: row.claims,
        groupId: OVERALL_GROUP_ID,
        milestoneId: row.milestoneId,
        milestoneName: row.milestoneName,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
      });
    }
  }

  return [...merged.values()];
}

// ---------------------------------------------------------------------------
// Extended analytics — group-level views (collapse to one overall bucket)
// ---------------------------------------------------------------------------

export function mergeGenerationDistribution(
  rows: GenerationDistributionRow[],
): GenerationDistributionRow[] {
  const merged = new Map<number, GenerationDistributionRow>();

  for (const row of rows) {
    const existing = merged.get(row.generationCount);

    if (existing) {
      existing.gamesPlayed += row.gamesPlayed;
    } else {
      merged.set(row.generationCount, {
        gamesPlayed: row.gamesPlayed,
        generationCount: row.generationCount,
        groupId: OVERALL_GROUP_ID,
      });
    }
  }

  return [...merged.values()];
}

export function mergeGroupMapPerformance(
  rows: GroupMapPerformanceRow[],
): GroupMapPerformanceRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, GroupMapPerformanceRow>();

  for (const row of rows) {
    const key = row.mapId ?? row.mapName;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addWeighted(acc, `${key}|gens`, row.averageGenerationCount, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averageGenerationCount: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        mapId: row.mapId,
        mapName: row.mapName,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => ({
    ...row,
    averageGenerationCount: readMean(acc, `${key}|gens`, 1),
    averageScore: readMean(acc, `${key}|score`, 1),
    gamesPlayed: readCount(acc, `${key}|games`),
  }));
}

export function mergeMilestoneEconomics(
  rows: MilestoneEconomicsRow[],
  totalFinalizedGames: number,
): MilestoneEconomicsRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, MilestoneEconomicsRow>();

  for (const row of rows) {
    const key = row.milestoneId;

    addCount(acc, `${key}|claims`, row.claims);
    addCount(acc, `${key}|claimerWins`, row.claimerWins);
    addWeighted(acc, `${key}|placement`, row.averageClaimerPlacement, row.claims);

    if (!base.has(key)) {
      base.set(key, {
        averageClaimerPlacement: 0,
        claimRate: 0,
        claimerWinRate: 0,
        claimerWins: 0,
        claims: 0,
        groupId: OVERALL_GROUP_ID,
        milestoneId: row.milestoneId,
        milestoneName: row.milestoneName,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const claims = readCount(acc, `${key}|claims`);
    const claimerWins = readCount(acc, `${key}|claimerWins`);

    return {
      ...row,
      averageClaimerPlacement: readMean(acc, `${key}|placement`),
      claimRate: rate(claims, totalFinalizedGames, 4),
      claimerWinRate: rate(claimerWins, claims, 4),
      claimerWins,
      claims,
    };
  });
}

export function mergeAwardOutcomes(rows: AwardOutcomeRow[]): AwardOutcomeRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, AwardOutcomeRow>();

  for (const row of rows) {
    const key = row.awardId;

    addCount(acc, `${key}|funded`, row.fundedCount);
    addCount(acc, `${key}|funderWon`, row.funderWonCount);
    addCount(acc, `${key}|sniped`, row.snipedCount);

    if (!base.has(key)) {
      base.set(key, {
        awardId: row.awardId,
        awardName: row.awardName,
        fundedCount: 0,
        funderWonCount: 0,
        funderWonRate: 0,
        groupId: OVERALL_GROUP_ID,
        snipedCount: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const fundedCount = readCount(acc, `${key}|funded`);
    const funderWonCount = readCount(acc, `${key}|funderWon`);

    return {
      ...row,
      fundedCount,
      funderWonCount,
      funderWonRate: rate(funderWonCount, fundedCount, 4),
      snipedCount: readCount(acc, `${key}|sniped`),
    };
  });
}

export function mergeAwardFunderWinnerMatrix(
  rows: AwardFunderWinnerRow[],
  lookup: IdentityLookup,
): AwardFunderWinnerRow[] {
  const merged = new Map<string, AwardFunderWinnerRow>();

  for (const row of rows) {
    const funder = lookup(row.funderPlayerId, row.funderPlayerName);
    const winner = lookup(row.winnerPlayerId, row.winnerPlayerName);
    const key = `${funder.canonicalId}|${winner.canonicalId}|${row.awardId}`;
    const existing = merged.get(key);

    if (existing) {
      existing.firstPlaceAwards += row.firstPlaceAwards;
    } else {
      merged.set(key, {
        awardId: row.awardId,
        awardName: row.awardName,
        firstPlaceAwards: row.firstPlaceAwards,
        funderPlayerId: funder.canonicalId,
        funderPlayerName: funder.displayName,
        groupId: OVERALL_GROUP_ID,
        winnerPlayerId: winner.canonicalId,
        winnerPlayerName: winner.displayName,
      });
    }
  }

  return [...merged.values()];
}

// ---------------------------------------------------------------------------
// Extended analytics — row-level views (remap player id; each game is one group)
// ---------------------------------------------------------------------------

export function remapGenerationPace(
  rows: GenerationPaceRow[],
  lookup: IdentityLookup,
): GenerationPaceRow[] {
  return rows.map((row) => {
    const identity = lookup(row.playerId, row.playerName);
    return {
      ...row,
      groupId: OVERALL_GROUP_ID,
      playerId: identity.canonicalId,
      playerName: identity.displayName,
    };
  });
}

export function remapTilePlacements(
  rows: TilePlacementRow[],
  lookup: IdentityLookup,
): TilePlacementRow[] {
  return rows.map((row) => {
    // Neutral tiles carry no player, so leave the identity untouched.
    if (!row.playerId) {
      return { ...row, groupId: OVERALL_GROUP_ID };
    }

    const identity = lookup(row.playerId, row.playerName ?? '');
    return {
      ...row,
      groupId: OVERALL_GROUP_ID,
      playerId: identity.canonicalId,
      playerName: identity.displayName,
    };
  });
}

export function remapTagOutcomes(
  rows: TagOutcomeRow[],
  lookup: IdentityLookup,
): TagOutcomeRow[] {
  return rows.map((row) => {
    const identity = lookup(row.playerId, row.playerName);
    return {
      ...row,
      groupId: OVERALL_GROUP_ID,
      playerId: identity.canonicalId,
      playerName: identity.displayName,
    };
  });
}

export function remapCardOutcomes(
  rows: CardOutcomeRow[],
  lookup: IdentityLookup,
): CardOutcomeRow[] {
  return rows.map((row) => {
    const identity = lookup(row.playerId, row.playerName);
    return {
      ...row,
      groupId: OVERALL_GROUP_ID,
      playerId: identity.canonicalId,
      playerName: identity.displayName,
    };
  });
}

// ---------------------------------------------------------------------------
// Group analytics — style / interaction / lineup views
// ---------------------------------------------------------------------------

export function mergeStyleAgreement(
  rows: StyleAgreementRow[],
  lookup: IdentityLookup,
): StyleAgreementRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, StyleAgreementRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = identity.canonicalId;
    const weight = row.comparedGames;

    addCount(acc, `${key}|games`, row.comparedGames);
    addWeighted(acc, `${key}|exact`, row.exactMatchRate, weight);
    addWeighted(acc, `${key}|partial`, row.partialMatchRate, weight);
    addWeighted(acc, `${key}|mismatch`, row.mismatchRate, weight);

    if (row.averageInferredConfidence !== null) {
      addWeighted(acc, `${key}|confidence`, row.averageInferredConfidence, weight);
    }

    if (!base.has(key)) {
      base.set(key, {
        averageInferredConfidence: row.averageInferredConfidence,
        comparedGames: 0,
        exactMatchRate: 0,
        groupId: OVERALL_GROUP_ID,
        mismatchRate: 0,
        partialMatchRate: 0,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const confidenceEntries = acc.averages.get(`${key}|confidence`) ?? [];

    return {
      ...row,
      averageInferredConfidence:
        confidenceEntries.length > 0 ? readMean(acc, `${key}|confidence`, 3) : null,
      comparedGames: readCount(acc, `${key}|games`),
      exactMatchRate: readMean(acc, `${key}|exact`, 4),
      mismatchRate: readMean(acc, `${key}|mismatch`, 4),
      partialMatchRate: readMean(acc, `${key}|partial`, 4),
    };
  });
}

export function mergeGroupStylePerformance(
  rows: GroupStylePerformanceRow[],
): GroupStylePerformanceRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, GroupStylePerformanceRow>();

  for (const row of rows) {
    const key = row.styleCode;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addCount(acc, `${key}|wins`, row.wins);
    addWeighted(acc, `${key}|placement`, row.averagePlacement, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);
    addWeighted(acc, `${key}|gens`, row.averageGenerationCount, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averageGenerationCount: 0,
        averagePlacement: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        styleCode: row.styleCode,
        winRate: 0,
        wins: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const games = readCount(acc, `${key}|games`);
    const wins = readCount(acc, `${key}|wins`);

    return {
      ...row,
      averageGenerationCount: readMean(acc, `${key}|gens`, 1),
      averagePlacement: readMean(acc, `${key}|placement`),
      averageScore: readMean(acc, `${key}|score`, 1),
      gamesPlayed: games,
      winRate: rate(wins, games, 3),
      wins,
    };
  });
}

export function mergePlayerStylePerformance(
  rows: PlayerStylePerformanceRow[],
  lookup: IdentityLookup,
): PlayerStylePerformanceRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, PlayerStylePerformanceRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.styleCode}`;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addCount(acc, `${key}|wins`, row.wins);
    addWeighted(acc, `${key}|placement`, row.averagePlacement, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);
    addWeighted(acc, `${key}|gens`, row.averageGenerationCount, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averageGenerationCount: 0,
        averagePlacement: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
        styleCode: row.styleCode,
        winRate: 0,
        wins: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const games = readCount(acc, `${key}|games`);
    const wins = readCount(acc, `${key}|wins`);

    return {
      ...row,
      averageGenerationCount: readMean(acc, `${key}|gens`, 1),
      averagePlacement: readMean(acc, `${key}|placement`),
      averageScore: readMean(acc, `${key}|score`, 1),
      gamesPlayed: games,
      winRate: rate(wins, games, 3),
      wins,
    };
  });
}

export function mergeGroupInteractions(
  rows: GroupInteractionRow[],
): GroupInteractionRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, GroupInteractionRow>();

  for (const row of rows) {
    const key = `${row.interactionType}|${row.label}`;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addCount(acc, `${key}|wins`, row.wins);
    addWeighted(acc, `${key}|placement`, row.averagePlacement, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averagePlacement: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        interactionType: row.interactionType,
        label: row.label,
        winRate: 0,
        wins: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const games = readCount(acc, `${key}|games`);
    const wins = readCount(acc, `${key}|wins`);

    return {
      ...row,
      averagePlacement: readMean(acc, `${key}|placement`),
      averageScore: readMean(acc, `${key}|score`, 1),
      gamesPlayed: games,
      winRate: rate(wins, games, 3),
      wins,
    };
  });
}

export function mergePlayerInteractions(
  rows: PlayerInteractionRow[],
  lookup: IdentityLookup,
): PlayerInteractionRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, PlayerInteractionRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.interactionType}|${row.label}`;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addCount(acc, `${key}|wins`, row.wins);
    addWeighted(acc, `${key}|placement`, row.averagePlacement, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averagePlacement: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        interactionType: row.interactionType,
        label: row.label,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
        winRate: 0,
        wins: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => {
    const games = readCount(acc, `${key}|games`);
    const wins = readCount(acc, `${key}|wins`);

    return {
      ...row,
      averagePlacement: readMean(acc, `${key}|placement`),
      averageScore: readMean(acc, `${key}|score`, 1),
      gamesPlayed: games,
      winRate: rate(wins, games, 3),
      wins,
    };
  });
}

export function mergeLineupEffects(
  rows: LineupEffectRow[],
  lookup: IdentityLookup,
): LineupEffectRow[] {
  const acc = emptyAccumulator();
  const base = new Map<string, LineupEffectRow>();

  for (const row of rows) {
    const identity = lookup(row.playerId, row.playerName);
    const key = `${identity.canonicalId}|${row.lineupLabel}`;

    addCount(acc, `${key}|games`, row.gamesPlayed);
    addWeighted(acc, `${key}|placement`, row.averagePlacement, row.gamesPlayed);
    addWeighted(acc, `${key}|score`, row.averageScore, row.gamesPlayed);
    addWeighted(acc, `${key}|gens`, row.averageGenerationCount, row.gamesPlayed);
    // LineupEffectRow exposes no win count, so win rate is re-weighted by games.
    addWeighted(acc, `${key}|winRate`, row.winRate, row.gamesPlayed);

    if (!base.has(key)) {
      base.set(key, {
        averageGenerationCount: 0,
        averagePlacement: 0,
        averageScore: 0,
        gamesPlayed: 0,
        groupId: OVERALL_GROUP_ID,
        lineupLabel: row.lineupLabel,
        playerId: identity.canonicalId,
        playerName: identity.displayName,
        winRate: 0,
      });
    }
  }

  return [...base.entries()].map(([key, row]) => ({
    ...row,
    averageGenerationCount: readMean(acc, `${key}|gens`, 1),
    averagePlacement: readMean(acc, `${key}|placement`),
    averageScore: readMean(acc, `${key}|score`, 1),
    gamesPlayed: readCount(acc, `${key}|games`),
    winRate: readMean(acc, `${key}|winRate`, 3),
  }));
}
