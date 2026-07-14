import { describe, expect, it } from 'vitest';
import { buildLeaderboardHeatNarratives, type EloLeaderboardRow } from '../elo-leaderboard-model';

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
