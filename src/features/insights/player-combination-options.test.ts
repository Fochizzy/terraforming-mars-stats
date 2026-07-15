import { describe, expect, it } from 'vitest';
import type { CrossGroupFocusPerson } from '@/lib/db/analytics-repo';
import { buildPlayerCombinationOptions } from './player-combination-analytics';

function person(input: {
  canonicalId: string;
  displayName: string;
  gamesPlayed: number;
  playerId: string;
}): CrossGroupFocusPerson {
  return {
    activeGroupPlayerId: input.playerId,
    bundle: {
      coverage: null,
      headToHeadRows: [],
      performance: {
        averageLossGap: null,
        averagePlacement: 2,
        averageScore: 80,
        averageWinMargin: null,
        differentialComponent: 0,
        gamesPlayed: input.gamesPlayed,
        groupId: 'group-1',
        placementComponent: 0,
        playerId: input.playerId,
        playerName: input.displayName,
        weightedScore: 0,
        winRate: 0,
        winRateComponent: 0,
        wins: 0,
      },
      scoreAverages: null,
      trendRows: [],
    },
    canonicalId: input.canonicalId,
    displayName: input.displayName,
    inActiveGroup: true,
    playerIds: [input.playerId],
  };
}

describe('buildPlayerCombinationOptions', () => {
  it('keeps yourself and played opponents available when detailed rows are empty', () => {
    const options = buildPlayerCombinationOptions({
      currentUserCanonicalId: 'user:me',
      focusPeople: [
        person({
          canonicalId: 'name:opponent',
          displayName: 'Opponent',
          gamesPlayed: 3,
          playerId: 'opponent-1',
        }),
        person({
          canonicalId: 'user:me',
          displayName: 'Me',
          gamesPlayed: 5,
          playerId: 'me-1',
        }),
      ],
      rows: [],
    });

    expect(options).toEqual([
      {
        canonicalId: 'user:me',
        displayName: 'Me',
        gamesPlayed: 5,
        playerIds: ['me-1'],
      },
      {
        canonicalId: 'name:opponent',
        displayName: 'Opponent',
        gamesPlayed: 3,
        playerIds: ['opponent-1'],
      },
    ]);
  });
});
