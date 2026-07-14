import { describe, expect, it } from 'vitest';
import { buildLeaderboardHeatNarratives, type EloLeaderboardRow } from '../elo-leaderboard-model';
import { mergeEloRowsByUsername } from './elo-leaderboard-repo';

function row(overrides: Partial<EloLeaderboardRow>): EloLeaderboardRow {
  return { averageWinMargin: 4, eloRating: 1500, gamesPlayed: 10, lastChange: 0, playerId: 'p', playerName: 'Player', winRate: 0.5, wins: 5, ...overrides };
}

describe('buildLeaderboardHeatNarratives', () => {
  it('describes the leader, hottest player, and rating spread', () => {
    const statements = buildLeaderboardHeatNarratives([
      row({ eloRating: 1620, playerId: 'a', playerName: 'Ares' }),
      row({ eloRating: 1580, lastChange: 12.5, playerId: 'b', playerName: 'Helios' }),
    ]);
    expect(statements.join(' ')).toMatch(/Ares controls the summit at 1620 Elo/);
    expect(statements.join(' ')).toMatch(/Helios carries the most heat/);
    expect(statements.join(' ')).toMatch(/spans 40 Elo points/);
  });
});

describe('mergeEloRowsByUsername', () => {
  it('collapses legacy per-group rows into one username entry', () => {
    const merged = mergeEloRowsByUsername([
      row({
        averageWinMargin: 10,
        eloRating: 1537,
        gamesPlayed: 6,
        lastChange: -10.3,
        playerId: 'james-a',
        playerName: 'RevLoki',
        winRate: 0.5,
        wins: 3,
      }),
      row({
        averageWinMargin: 32.2,
        eloRating: 1518,
        gamesPlayed: 8,
        lastChange: -23.7,
        playerId: 'james-b',
        playerName: 'revloki',
        winRate: 0.625,
        wins: 5,
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      eloRating: 1555,
      gamesPlayed: 14,
      playerName: 'RevLoki',
      wins: 8,
    });
    expect(merged[0].winRate).toBeCloseTo(8 / 14, 5);
  });
});
