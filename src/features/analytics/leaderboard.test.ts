import { describe, expect, it } from 'vitest';
import * as analyticsRepo from '@/lib/db/analytics-repo';
import { sortLeaderboardRows } from '@/lib/db/analytics-repo';

describe('sortLeaderboardRows', () => {
  it('sorts rows by weighted score descending', () => {
    const rows = sortLeaderboardRows([
      { player_name: 'A', weighted_score: 0.71 },
      { player_name: 'B', weighted_score: 0.84 },
    ]);

    expect(rows[0].player_name).toBe('B');
  });
});

describe('analytics sorting helpers', () => {
  it('sorts head-to-head rows by sample size, then rivalry edge', () => {
    const repo = analyticsRepo as {
      sortHeadToHeadRows?: (
        rows: Array<{
          averageScoreDifferential: number;
          gamesPlayed: number;
          leftPlayerName: string;
        }>,
      ) => Array<{
        averageScoreDifferential: number;
        gamesPlayed: number;
        leftPlayerName: string;
      }>;
    };

    expect(repo.sortHeadToHeadRows).toBeTypeOf('function');
    if (!repo.sortHeadToHeadRows) {
      return;
    }

    const rows = repo.sortHeadToHeadRows([
      {
        leftPlayerName: 'Second Seat',
        gamesPlayed: 3,
        averageScoreDifferential: 2.1,
      },
      {
        leftPlayerName: 'Friday Mars',
        gamesPlayed: 5,
        averageScoreDifferential: 1.2,
      },
      {
        leftPlayerName: 'Third Seat',
        gamesPlayed: 5,
        averageScoreDifferential: 4.6,
      },
    ]);

    expect(rows[0].leftPlayerName).toBe('Third Seat');
  });

  it('sorts lineup-effect rows by sample size and win rate', () => {
    const repo = analyticsRepo as {
      sortLineupEffectRows?: (
        rows: Array<{
          gamesPlayed: number;
          playerName: string;
          winRate: number;
        }>,
      ) => Array<{
        gamesPlayed: number;
        playerName: string;
        winRate: number;
      }>;
    };

    expect(repo.sortLineupEffectRows).toBeTypeOf('function');
    if (!repo.sortLineupEffectRows) {
      return;
    }

    const rows = repo.sortLineupEffectRows([
      { playerName: 'Friday Mars', gamesPlayed: 3, winRate: 0.66 },
      { playerName: 'Second Seat', gamesPlayed: 5, winRate: 0.4 },
      { playerName: 'Third Seat', gamesPlayed: 5, winRate: 0.8 },
    ]);

    expect(rows[0].playerName).toBe('Third Seat');
  });

  it('sorts style-agreement rows by exact agreement rate', () => {
    const repo = analyticsRepo as {
      sortStyleAgreementRows?: (
        rows: Array<{
          comparedGames: number;
          exactMatchRate: number;
          playerName: string;
        }>,
      ) => Array<{
        comparedGames: number;
        exactMatchRate: number;
        playerName: string;
      }>;
    };

    expect(repo.sortStyleAgreementRows).toBeTypeOf('function');
    if (!repo.sortStyleAgreementRows) {
      return;
    }

    const rows = repo.sortStyleAgreementRows([
      { playerName: 'Friday Mars', comparedGames: 4, exactMatchRate: 0.5 },
      { playerName: 'Second Seat', comparedGames: 7, exactMatchRate: 0.43 },
      { playerName: 'Third Seat', comparedGames: 4, exactMatchRate: 0.75 },
    ]);

    expect(rows[0].playerName).toBe('Third Seat');
  });

  it('sorts style-performance rows by win rate, sample size, and placement', () => {
    const repo = analyticsRepo as {
      sortStylePerformanceRows?: (
        rows: Array<{
          averagePlacement: number;
          gamesPlayed: number;
          styleCode: string;
          winRate: number;
        }>,
      ) => Array<{
        averagePlacement: number;
        gamesPlayed: number;
        styleCode: string;
        winRate: number;
      }>;
    };

    expect(repo.sortStylePerformanceRows).toBeTypeOf('function');
    if (!repo.sortStylePerformanceRows) {
      return;
    }

    const rows = repo.sortStylePerformanceRows([
      {
        styleCode: 'board_control',
        gamesPlayed: 5,
        winRate: 0.6,
        averagePlacement: 1.8,
      },
      {
        styleCode: 'jovian_payoff',
        gamesPlayed: 5,
        winRate: 0.8,
        averagePlacement: 1.4,
      },
      {
        styleCode: 'balanced',
        gamesPlayed: 7,
        winRate: 0.8,
        averagePlacement: 2,
      },
    ]);

    expect(rows[0].styleCode).toBe('balanced');
  });

  it('sorts interaction rows by win rate, sample size, and placement', () => {
    const repo = analyticsRepo as {
      sortInteractionRows?: (
        rows: Array<{
          averagePlacement: number;
          gamesPlayed: number;
          label: string;
          winRate: number;
        }>,
      ) => Array<{
        averagePlacement: number;
        gamesPlayed: number;
        label: string;
        winRate: number;
      }>;
    };

    expect(repo.sortInteractionRows).toBeTypeOf('function');
    if (!repo.sortInteractionRows) {
      return;
    }

    const rows = repo.sortInteractionRows([
      {
        label: 'Hellas | Prelude',
        gamesPlayed: 5,
        winRate: 0.6,
        averagePlacement: 1.8,
      },
      {
        label: 'Base | Tharsis Republic',
        gamesPlayed: 5,
        winRate: 0.8,
        averagePlacement: 1.4,
      },
      {
        label: 'Colonies | Elysium',
        gamesPlayed: 7,
        winRate: 0.8,
        averagePlacement: 2,
      },
    ]);

    expect(rows[0].label).toBe('Colonies | Elysium');
  });

  it('builds score-source entries in the expected board-score order', () => {
    const repo = analyticsRepo as {
      buildScoreSourceEntries?: (row: {
        averageAnimalPoints: number;
        averageAwardPoints: number;
        averageCardPoints: number;
        averageCitiesPoints: number;
        averageGreeneryPoints: number;
        averageJovianPoints: number;
        averageMicrobePoints: number;
        averageMilestonePoints: number;
        averageOtherCardPoints: number;
        averageTrPoints: number;
      }) => Array<{ label: string; value: number }>;
    };

    expect(repo.buildScoreSourceEntries).toBeTypeOf('function');
    if (!repo.buildScoreSourceEntries) {
      return;
    }

    const entries = repo.buildScoreSourceEntries({
      averageCitiesPoints: 8,
      averageGreeneryPoints: 12,
      averageCardPoints: 19,
      averageMicrobePoints: 2,
      averageAnimalPoints: 3,
      averageJovianPoints: 4,
      averageOtherCardPoints: 10,
      averageTrPoints: 23,
      averageMilestonePoints: 4,
      averageAwardPoints: 3,
    });

    expect(entries[0]).toEqual({ label: 'Terraform Rating', value: 23 });
    expect(entries.at(-1)).toEqual({ label: 'Animal', value: 3 });
  });
});
