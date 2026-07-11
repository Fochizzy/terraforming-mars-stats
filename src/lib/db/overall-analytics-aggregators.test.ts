import { describe, expect, it } from 'vitest';
import type {
  AwardFunderWinnerRow,
  MilestoneEconomicsRow,
  PlayerMapPerformanceRow,
  TilePlacementRow,
} from '@/lib/db/extended-analytics-repo';
import type { StyleAgreementRow } from '@/lib/db/analytics-repo';
import {
  type IdentityLookup,
  mergeAwardFunderWinnerMatrix,
  mergeGenerationDistribution,
  mergeMilestoneEconomics,
  mergePlayerMapPerformance,
  mergeStyleAgreement,
  OVERALL_GROUP_ID,
  remapTilePlacements,
} from '@/lib/db/overall-analytics-aggregators';

// Two per-group player rows for the same canonical person ("Alice"), plus a
// distinct opponent ("Bob"), mirroring the group-split.
const lookup: IdentityLookup = (playerId, fallbackName) => {
  if (playerId === 'alice-g1' || playerId === 'alice-g2') {
    return { canonicalId: 'user:alice', displayName: 'Alice' };
  }

  if (playerId === 'bob-g1' || playerId === 'bob-g2') {
    return { canonicalId: 'name:bob', displayName: 'Bob' };
  }

  return { canonicalId: playerId, displayName: fallbackName };
};

function mapRow(
  overrides: Partial<PlayerMapPerformanceRow> &
    Pick<PlayerMapPerformanceRow, 'groupId' | 'playerId'>,
): PlayerMapPerformanceRow {
  return {
    averagePlacement: 1,
    averageScore: 80,
    gamesPlayed: 1,
    mapId: 'tharsis',
    mapName: 'Tharsis',
    playerName: 'Alice',
    winRate: 1,
    wins: 1,
    ...overrides,
  };
}

describe('overall-analytics-aggregators', () => {
  it('collapses a canonical player across groups with weighted averages', () => {
    const merged = mergePlayerMapPerformance(
      [
        mapRow({
          groupId: 'g1',
          playerId: 'alice-g1',
          gamesPlayed: 2,
          wins: 2,
          averageScore: 90,
          averagePlacement: 1,
        }),
        mapRow({
          groupId: 'g2',
          playerId: 'alice-g2',
          gamesPlayed: 3,
          wins: 0,
          averageScore: 60,
          averagePlacement: 3,
        }),
      ],
      lookup,
    );

    expect(merged).toHaveLength(1);
    const [row] = merged;
    expect(row.playerId).toBe('user:alice');
    expect(row.groupId).toBe(OVERALL_GROUP_ID);
    expect(row.gamesPlayed).toBe(5);
    expect(row.wins).toBe(2);
    // (90*2 + 60*3) / 5 = 72
    expect(row.averageScore).toBe(72);
    // (1*2 + 3*3) / 5 = 2.2
    expect(row.averagePlacement).toBe(2.2);
    // 2 wins / 5 games
    expect(row.winRate).toBe(0.4);
  });

  it('keeps distinct maps and distinct people separate', () => {
    const merged = mergePlayerMapPerformance(
      [
        mapRow({ groupId: 'g1', playerId: 'alice-g1', mapName: 'Tharsis', mapId: 'tharsis' }),
        mapRow({ groupId: 'g1', playerId: 'alice-g1', mapName: 'Hellas', mapId: 'hellas' }),
        mapRow({ groupId: 'g1', playerId: 'bob-g1', playerName: 'Bob', mapId: 'tharsis' }),
      ],
      lookup,
    );

    expect(merged).toHaveLength(3);
    expect(new Set(merged.map((row) => row.playerId))).toEqual(
      new Set(['user:alice', 'name:bob']),
    );
  });

  it('canonicalises both funder and winner in the award matrix', () => {
    const rows: AwardFunderWinnerRow[] = [
      {
        awardId: 'landlord',
        awardName: 'Landlord',
        firstPlaceAwards: 1,
        funderPlayerId: 'alice-g1',
        funderPlayerName: 'Alice',
        groupId: 'g1',
        winnerPlayerId: 'bob-g1',
        winnerPlayerName: 'Bob',
      },
      {
        awardId: 'landlord',
        awardName: 'Landlord',
        firstPlaceAwards: 2,
        funderPlayerId: 'alice-g2',
        funderPlayerName: 'Alice',
        groupId: 'g2',
        winnerPlayerId: 'bob-g2',
        winnerPlayerName: 'Bob',
      },
    ];

    const merged = mergeAwardFunderWinnerMatrix(rows, lookup);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      firstPlaceAwards: 3,
      funderPlayerId: 'user:alice',
      winnerPlayerId: 'name:bob',
      groupId: OVERALL_GROUP_ID,
    });
  });

  it('recomputes milestone claim rate against the total finalized games', () => {
    const rows: MilestoneEconomicsRow[] = [
      {
        averageClaimerPlacement: 1,
        claimRate: 0.5,
        claimerWinRate: 1,
        claimerWins: 2,
        claims: 2,
        groupId: 'g1',
        milestoneId: 'gardener',
        milestoneName: 'Gardener',
      },
      {
        averageClaimerPlacement: 2,
        claimRate: 0.25,
        claimerWinRate: 0,
        claimerWins: 0,
        claims: 2,
        groupId: 'g2',
        milestoneId: 'gardener',
        milestoneName: 'Gardener',
      },
    ];

    // 4 games in g1 + 8 games in g2 = 12 finalized games total.
    const merged = mergeMilestoneEconomics(rows, 12);

    expect(merged).toHaveLength(1);
    const [row] = merged;
    expect(row.claims).toBe(4);
    expect(row.claimerWins).toBe(2);
    // 4 claims / 12 games
    expect(row.claimRate).toBe(0.3333);
    // 2 claimer wins / 4 claims
    expect(row.claimerWinRate).toBe(0.5);
    // (1*2 + 2*2) / 4 = 1.5
    expect(row.averageClaimerPlacement).toBe(1.5);
  });

  it('weights style agreement rates by compared games', () => {
    const rows: StyleAgreementRow[] = [
      {
        averageInferredConfidence: 0.8,
        comparedGames: 1,
        exactMatchRate: 1,
        groupId: 'g1',
        mismatchRate: 0,
        partialMatchRate: 0,
        playerId: 'alice-g1',
        playerName: 'Alice',
      },
      {
        averageInferredConfidence: 0.4,
        comparedGames: 3,
        exactMatchRate: 0,
        groupId: 'g2',
        mismatchRate: 1,
        partialMatchRate: 0,
        playerId: 'alice-g2',
        playerName: 'Alice',
      },
    ];

    const merged = mergeStyleAgreement(rows, lookup);

    expect(merged).toHaveLength(1);
    const [row] = merged;
    expect(row.comparedGames).toBe(4);
    // (1*1 + 0*3) / 4 = 0.25
    expect(row.exactMatchRate).toBe(0.25);
    // (0*1 + 1*3) / 4 = 0.75
    expect(row.mismatchRate).toBe(0.75);
    // (0.8*1 + 0.4*3) / 4 = 0.5
    expect(row.averageInferredConfidence).toBe(0.5);
  });

  it('sums generation distribution across groups', () => {
    const merged = mergeGenerationDistribution([
      { gamesPlayed: 2, generationCount: 10, groupId: 'g1' },
      { gamesPlayed: 3, generationCount: 10, groupId: 'g2' },
      { gamesPlayed: 1, generationCount: 11, groupId: 'g2' },
    ]);

    expect(merged).toHaveLength(2);
    expect(merged.find((row) => row.generationCount === 10)?.gamesPlayed).toBe(5);
    expect(merged.find((row) => row.generationCount === 11)?.gamesPlayed).toBe(1);
  });

  it('remaps tile placements but leaves neutral tiles untouched', () => {
    const rows: TilePlacementRow[] = [
      {
        boardSpace: '03',
        gameId: 'game-1',
        groupId: 'g1',
        mapName: 'Tharsis',
        placements: 1,
        playedOn: '2026-01-01',
        playerId: 'alice-g1',
        playerName: 'Alice',
        tileType: 'greenery',
      },
      {
        boardSpace: '10',
        gameId: 'game-1',
        groupId: 'g1',
        mapName: 'Tharsis',
        placements: 1,
        playedOn: '2026-01-01',
        playerId: null,
        playerName: null,
        tileType: 'ocean',
      },
    ];

    const remapped = remapTilePlacements(rows, lookup);

    expect(remapped[0]).toMatchObject({
      groupId: OVERALL_GROUP_ID,
      playerId: 'user:alice',
      playerName: 'Alice',
    });
    expect(remapped[1]).toMatchObject({
      groupId: OVERALL_GROUP_ID,
      playerId: null,
      playerName: null,
    });
  });
});
