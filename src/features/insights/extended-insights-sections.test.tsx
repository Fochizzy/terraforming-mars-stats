import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
  GenerationPaceRow,
  TilePlacementRow,
} from '@/lib/db/extended-analytics-repo';
import {
  aggregateBoardSpaces,
  BoardHeatmapSection,
  buildBoardGrid,
} from './board-heatmap-section';
import {
  buildPaceChartData,
  buildPaceTotals,
  GamePaceSection,
  listPaceGames,
} from './game-pace-section';
import { buildGameLengthBucketData } from './game-length-section';
import { buildMapPerformanceData } from './map-performance-section';
import {
  buildAwardMatrixModel,
  buildMilestoneChartData,
} from './milestone-award-section';
import { buildPlacementShareData } from './placement-distribution-chart';
import { buildRadarData } from './score-source-radar';
import { buildTableSizeData } from './table-size-chart';
import {
  buildTagFingerprintData,
  buildTagScatterData,
} from './tag-outcomes-section';

function buildPaceRow(overrides: Partial<GenerationPaceRow>): GenerationPaceRow {
  return {
    awardsFunded: 0,
    cardsPlayed: 0,
    citiesPlaced: 0,
    gameId: 'g1',
    generationNumber: 1,
    greeneriesPlaced: 0,
    groupId: 'group-1',
    milestonesClaimed: 0,
    playedOn: '2026-06-01',
    playerId: 'p1',
    playerName: 'Ada',
    tilesPlaced: 0,
    ...overrides,
  };
}

function buildTileRow(overrides: Partial<TilePlacementRow>): TilePlacementRow {
  return {
    boardSpace: '21',
    gameId: 'g1',
    groupId: 'group-1',
    mapName: 'Tharsis',
    placements: 1,
    playedOn: '2026-06-01',
    playerId: 'p1',
    playerName: 'Ada',
    tileType: 'greenery',
    ...overrides,
  };
}

describe('buildPlacementShareData', () => {
  it('converts per-placement counts into percentage shares with 4th+ folded together', () => {
    const data = buildPlacementShareData([
      {
        gamesPlayed: 2,
        groupId: 'group-1',
        placement: 1,
        playerId: 'p1',
        playerName: 'Ada',
      },
      {
        gamesPlayed: 1,
        groupId: 'group-1',
        placement: 4,
        playerId: 'p1',
        playerName: 'Ada',
      },
      {
        gamesPlayed: 1,
        groupId: 'group-1',
        placement: 5,
        playerId: 'p1',
        playerName: 'Ada',
      },
    ]);

    expect(data).toEqual([
      {
        first: 50,
        fourthPlus: 50,
        gamesPlayed: 4,
        playerName: 'Ada',
        second: 0,
        third: 0,
      },
    ]);
  });
});

describe('buildTableSizeData', () => {
  const rows = [
    {
      averagePlacement: 1.5,
      averageScore: 80,
      gamesPlayed: 2,
      groupId: 'group-1',
      playerCount: 3,
      playerId: 'p1',
      playerName: 'Ada',
      winRate: 0.5,
      wins: 1,
    },
    {
      averagePlacement: 2,
      averageScore: 60,
      gamesPlayed: 2,
      groupId: 'group-1',
      playerCount: 3,
      playerId: 'p2',
      playerName: 'Brin',
      winRate: 0.5,
      wins: 1,
    },
  ];

  it('reports win rate only when focused on a player', () => {
    expect(buildTableSizeData(rows, null)).toEqual([
      { averageScore: 70, gamesPlayed: 4, tableSize: '3p', winRate: null },
    ]);
    expect(buildTableSizeData(rows, 'p1')).toEqual([
      { averageScore: 80, gamesPlayed: 2, tableSize: '3p', winRate: 50 },
    ]);
  });
});

describe('buildGameLengthBucketData', () => {
  it('orders buckets short → standard → long and weights averages by games', () => {
    const data = buildGameLengthBucketData(
      [
        {
          averagePointsPerGeneration: 8,
          averageScore: 96,
          gamesPlayed: 1,
          groupId: 'group-1',
          lengthBucket: 'long',
          playerId: 'p1',
          playerName: 'Ada',
          winRate: 1,
          wins: 1,
        },
        {
          averagePointsPerGeneration: 9,
          averageScore: 81,
          gamesPlayed: 2,
          groupId: 'group-1',
          lengthBucket: 'short',
          playerId: 'p1',
          playerName: 'Ada',
          winRate: 0,
          wins: 0,
        },
      ],
      'p1',
    );

    expect(data.map((entry) => entry.bucketLabel)).toEqual([
      'Short (≤9 gens)',
      'Long (12+ gens)',
    ]);
    expect(data[0]).toMatchObject({ gamesPlayed: 2, winRate: 0 });
    expect(data[1]).toMatchObject({ gamesPlayed: 1, winRate: 100 });
  });
});

describe('buildMapPerformanceData', () => {
  it('uses group rows when unfocused and player rows when focused', () => {
    const groupRows = [
      {
        averageGenerationCount: 11.2,
        averageScore: 74.5,
        gamesPlayed: 6,
        groupId: 'group-1',
        mapId: 'map-1',
        mapName: 'Tharsis',
      },
    ];
    const playerRows = [
      {
        averagePlacement: 1.4,
        averageScore: 82.1,
        gamesPlayed: 4,
        groupId: 'group-1',
        mapId: 'map-1',
        mapName: 'Tharsis',
        playerId: 'p1',
        playerName: 'Ada',
        winRate: 0.75,
        wins: 3,
      },
    ];

    expect(
      buildMapPerformanceData({ focusPlayerId: null, groupRows, playerRows }),
    ).toEqual([
      {
        averageScore: 74.5,
        detail: 'avg 11.2 gens',
        gamesPlayed: 6,
        mapName: 'Tharsis',
        winRate: null,
      },
    ]);
    expect(
      buildMapPerformanceData({ focusPlayerId: 'p1', groupRows, playerRows }),
    ).toEqual([
      {
        averageScore: 82.1,
        detail: 'avg place 1.4',
        gamesPlayed: 4,
        mapName: 'Tharsis',
        winRate: 75,
      },
    ]);
  });
});

describe('buildMilestoneChartData', () => {
  it('derives claimer win rate from player claims when focused', () => {
    const data = buildMilestoneChartData({
      focusPlayerId: 'p1',
      groupRows: [],
      playerRows: [
        {
          claimerWins: 2,
          claims: 3,
          groupId: 'group-1',
          milestoneId: 'm1',
          milestoneName: 'Gardener',
          playerId: 'p1',
          playerName: 'Ada',
        },
      ],
    });

    expect(data).toEqual([
      { claimerWinRate: 67, claims: 3, milestoneName: 'Gardener' },
    ]);
  });
});

describe('buildAwardMatrixModel', () => {
  it('accumulates funder→winner counts and tracks the max cell', () => {
    const model = buildAwardMatrixModel([
      {
        firstPlaceAwards: 2,
        funderPlayerId: 'p1',
        funderPlayerName: 'Ada',
        groupId: 'group-1',
        winnerPlayerId: 'p2',
        winnerPlayerName: 'Brin',
      },
      {
        firstPlaceAwards: 1,
        funderPlayerId: 'p1',
        funderPlayerName: 'Ada',
        groupId: 'group-1',
        winnerPlayerId: 'p1',
        winnerPlayerName: 'Ada',
      },
    ]);

    expect(model.funderNames).toEqual(['Ada']);
    expect(model.winnerNames).toEqual(['Ada', 'Brin']);
    expect(model.counts.get('Ada→Brin')).toBe(2);
    expect(model.maxCount).toBe(2);
  });
});

describe('buildRadarData', () => {
  it('pairs group and player values per score source', () => {
    const averages = {
      averageAnimalPoints: 1,
      averageAwardPoints: 2,
      averageCardPoints: 3,
      averageCitiesPoints: 4,
      averageGreeneryPoints: 5,
      averageJovianPoints: 6,
      averageMicrobePoints: 7,
      averageMilestonePoints: 8,
      averageOtherCardPoints: 9,
      averageTrPoints: 10,
    };
    const data = buildRadarData(averages, null);

    expect(data).toHaveLength(9);
    expect(data[0]).toEqual({ group: 10, player: null, source: 'TR' });
  });
});

describe('tag outcome builders', () => {
  const rows = [
    {
      gameId: 'g1',
      groupId: 'group-1',
      isWinner: true,
      playedOn: '2026-06-01',
      playerId: 'p1',
      playerName: 'Ada',
      tagCode: 'science',
      tagCount: 6,
      totalPoints: 90,
    },
    {
      gameId: 'g1',
      groupId: 'group-1',
      isWinner: false,
      playedOn: '2026-06-01',
      playerId: 'p2',
      playerName: 'Brin',
      tagCode: 'science',
      tagCount: 2,
      totalPoints: 60,
    },
  ];

  it('splits scatter points into wins and losses', () => {
    const scatter = buildTagScatterData(rows, 'science', null);

    expect(scatter.wins).toEqual([
      { playerName: 'Ada', tagCount: 6, totalPoints: 90 },
    ]);
    expect(scatter.losses).toEqual([
      { playerName: 'Brin', tagCount: 2, totalPoints: 60 },
    ]);
  });

  it('compares a focused player fingerprint against the group', () => {
    expect(buildTagFingerprintData(rows, 'p1')).toEqual([
      { groupAverage: 4, playerAverage: 6, tagCode: 'science' },
    ]);
  });
});

describe('game pace builders', () => {
  const rows = [
    buildPaceRow({ cardsPlayed: 2, generationNumber: 1 }),
    buildPaceRow({ cardsPlayed: 3, generationNumber: 3 }),
    buildPaceRow({
      cardsPlayed: 1,
      generationNumber: 2,
      playerId: 'p2',
      playerName: 'Brin',
    }),
  ];

  it('lists games newest first with player labels', () => {
    expect(listPaceGames(rows)).toEqual([
      { gameId: 'g1', label: '2026-06-01 — Ada, Brin' },
    ]);
  });

  it('builds cumulative per-generation series with gap fill', () => {
    const model = buildPaceChartData(rows, 'g1');

    expect(model.playerNames).toEqual(['Ada', 'Brin']);
    expect(model.points).toEqual([
      { Ada: 2, Brin: 0, generation: 1 },
      { Ada: 2, Brin: 1, generation: 2 },
      { Ada: 5, Brin: 1, generation: 3 },
    ]);
  });

  it('totals per-player activity for the selected game', () => {
    expect(buildPaceTotals(rows, 'g1')[0]).toMatchObject({
      cardsPlayed: 5,
      playerName: 'Ada',
    });
  });
});

describe('board heatmap helpers', () => {
  it('builds the official 61-hex staggered planet grid', () => {
    const grid = buildBoardGrid();

    expect(grid).toHaveLength(61);
    expect(grid[0].spaceId).toBe('1');
    expect(grid[60].spaceId).toBe('61');
  });

  it('aggregates placements per space and separates off-board spaces', () => {
    const model = aggregateBoardSpaces(
      [
        buildTileRow({ boardSpace: '21', placements: 2 }),
        buildTileRow({ boardSpace: '21', gameId: 'g2', playedOn: '2026-06-08' }),
        buildTileRow({ boardSpace: 'Ganymede', tileType: 'city' }),
      ],
      { gameId: null, mapName: 'Tharsis', tileType: null },
    );

    expect(model.countsBySpace.get('21')).toBe(3);
    expect(model.maxCount).toBe(3);
    expect(model.offBoardCounts).toEqual([{ count: 1, spaceId: 'Ganymede' }]);
  });

  it('applies tile type and game filters', () => {
    const model = aggregateBoardSpaces(
      [
        buildTileRow({ boardSpace: '21', placements: 2, tileType: 'greenery' }),
        buildTileRow({ boardSpace: '30', tileType: 'city' }),
      ],
      { gameId: 'g1', mapName: 'Tharsis', tileType: 'city' },
    );

    expect(model.countsBySpace.get('21')).toBeUndefined();
    expect(model.countsBySpace.get('30')).toBe(1);
  });
});

describe('GamePaceSection', () => {
  it('renders the game selector and per-player totals', () => {
    render(
      <GamePaceSection
        rows={[
          buildPaceRow({ cardsPlayed: 4, generationNumber: 1, greeneriesPlaced: 2 }),
          buildPaceRow({
            cardsPlayed: 2,
            generationNumber: 1,
            playerId: 'p2',
            playerName: 'Brin',
          }),
        ]}
      />,
    );

    expect(screen.getByLabelText(/game/i)).toBeInTheDocument();
    expect(screen.getByText('4 cards')).toBeInTheDocument();
    expect(screen.getByText(/2 greeneries/i)).toBeInTheDocument();
  });

  it('shows the unlock hint without imported logs', () => {
    render(<GamePaceSection rows={[]} />);

    expect(
      screen.getByText(/Pace replays unlock for finalized games imported/i),
    ).toBeInTheDocument();
  });
});

describe('BoardHeatmapSection', () => {
  it('renders hex cells with placement counts', () => {
    render(
      <BoardHeatmapSection
        rows={[buildTileRow({ boardSpace: '21', placements: 3 })]}
      />,
    );

    expect(screen.getByLabelText(/tile type/i)).toBeInTheDocument();
    expect(
      screen.getByText('Space 21: 3 placements'),
    ).toBeInTheDocument();
  });
});
