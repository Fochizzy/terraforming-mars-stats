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
  AwardEconomicsSection,
  buildAwardMatrixModel,
  buildMilestoneChartData,
  findAwardLeaders,
} from './milestone-award-section';
import { buildPlacementShareData } from './placement-distribution-chart';
import { buildRadarData } from './score-source-radar';
import { buildTableSizeData } from './table-size-chart';
import {
  buildCorporationTagData,
  buildTagCountDistributionData,
  buildTagWinRateData,
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
        awardId: 'a1',
        awardName: 'Landlord',
        firstPlaceAwards: 2,
        funderPlayerId: 'p1',
        funderPlayerName: 'Ada',
        groupId: 'group-1',
        winnerPlayerId: 'p2',
        winnerPlayerName: 'Brin',
      },
      {
        awardId: 'a2',
        awardName: 'Miner',
        firstPlaceAwards: 1,
        funderPlayerId: 'p1',
        funderPlayerName: 'Ada',
        groupId: 'group-1',
        winnerPlayerId: 'p1',
        winnerPlayerName: 'Ada',
      },
    ]);

    // Both axes are the union of funders and winners, so Brin (a winner who
    // never funded) still appears as a funder row.
    expect(model.funderNames).toEqual(['Ada', 'Brin']);
    expect(model.winnerNames).toEqual(['Ada', 'Brin']);
    expect(model.counts.get('Ada→Brin')).toBe(2);
    expect(model.maxCount).toBe(2);
  });

  it('keeps both axes square when a player only funds or only wins', () => {
    const model = buildAwardMatrixModel([
      {
        awardId: 'a1',
        awardName: 'Landlord',
        firstPlaceAwards: 1,
        funderPlayerId: 'p1',
        funderPlayerName: 'Colette',
        groupId: 'global',
        winnerPlayerId: 'p2',
        winnerPlayerName: 'Jenna',
      },
    ]);

    // Colette only funds, Jenna only wins — both must appear on both axes.
    expect(model.funderNames).toEqual(['Colette', 'Jenna']);
    expect(model.winnerNames).toEqual(['Colette', 'Jenna']);
    expect(model.counts.get('Colette→Jenna')).toBe(1);
    expect(model.counts.get('Jenna→Colette') ?? 0).toBe(0);
  });
});

describe('findAwardLeaders', () => {
  it('picks the top funder and top winner per award', () => {
    const leaders = findAwardLeaders([
      {
        awardId: 'a1',
        awardName: 'Landlord',
        firstPlaceAwards: 2,
        funderPlayerId: 'p1',
        funderPlayerName: 'Ada',
        groupId: 'group-1',
        winnerPlayerId: 'p2',
        winnerPlayerName: 'Brin',
      },
      {
        awardId: 'a1',
        awardName: 'Landlord',
        firstPlaceAwards: 1,
        funderPlayerId: 'p2',
        funderPlayerName: 'Brin',
        groupId: 'group-1',
        winnerPlayerId: 'p2',
        winnerPlayerName: 'Brin',
      },
    ]);

    expect(leaders.get('a1')).toEqual({
      topFunderCount: 2,
      topFunderName: 'Ada',
      topWinnerCount: 3,
      topWinnerName: 'Brin',
    });
  });

  it('breaks ties alphabetically', () => {
    const leaders = findAwardLeaders([
      {
        awardId: 'a1',
        awardName: 'Landlord',
        firstPlaceAwards: 1,
        funderPlayerId: 'p2',
        funderPlayerName: 'Brin',
        groupId: 'group-1',
        winnerPlayerId: 'p1',
        winnerPlayerName: 'Ada',
      },
      {
        awardId: 'a1',
        awardName: 'Landlord',
        firstPlaceAwards: 1,
        funderPlayerId: 'p1',
        funderPlayerName: 'Ada',
        groupId: 'group-1',
        winnerPlayerId: 'p2',
        winnerPlayerName: 'Brin',
      },
    ]);

    expect(leaders.get('a1')).toEqual({
      topFunderCount: 1,
      topFunderName: 'Ada',
      topWinnerCount: 1,
      topWinnerName: 'Ada',
    });
  });
});

describe('AwardEconomicsSection', () => {
  it('shows who funded and who won each award on its card', () => {
    render(
      <AwardEconomicsSection
        focusPlayerId={null}
        focusPlayerName={null}
        matrixRows={[
          {
            awardId: 'a1',
            awardName: 'Excentric',
            firstPlaceAwards: 1,
            funderPlayerId: 'p1',
            funderPlayerName: 'Izzy Hodnett',
            groupId: 'group-1',
            winnerPlayerId: 'p2',
            winnerPlayerName: 'James Hodnett',
          },
        ]}
        outcomeRows={[
          {
            awardId: 'a1',
            awardName: 'Excentric',
            fundedCount: 1,
            funderWonCount: 0,
            funderWonRate: 0,
            groupId: 'group-1',
            snipedCount: 1,
          },
        ]}
      />,
    );

    expect(
      screen.getByText(
        /Most funded by Izzy Hodnett \(1×\) \| most won by James Hodnett \(1×\)/,
      ),
    ).toBeInTheDocument();
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
      corporationId: 'corp-1',
      corporationName: 'Tharsis Republic',
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
      corporationId: 'corp-2',
      corporationName: 'Saturn Systems',
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
    {
      corporationId: 'corp-1',
      corporationName: 'Tharsis Republic',
      gameId: 'g2',
      groupId: 'group-1',
      isWinner: false,
      playedOn: '2026-06-08',
      playerId: 'p1',
      playerName: 'Ada',
      tagCode: 'science',
      tagCount: 0,
      totalPoints: 70,
    },
    {
      corporationId: 'corp-2',
      corporationName: 'Saturn Systems',
      gameId: 'g2',
      groupId: 'group-1',
      isWinner: false,
      playedOn: '2026-06-08',
      playerId: 'p2',
      playerName: 'Brin',
      tagCode: 'building',
      tagCount: 3,
      totalPoints: 70,
    },
  ];

  it('calculates win rate by tag only when the tag was played', () => {
    expect(buildTagWinRateData(rows, null)).toEqual([
      {
        averageTagCount: 4,
        maxTagCount: 6,
        results: 2,
        tagCode: 'science',
        winRate: 50,
        wins: 1,
      },
      {
        averageTagCount: 3,
        maxTagCount: 3,
        results: 1,
        tagCode: 'building',
        winRate: 0,
        wins: 0,
      },
    ]);
  });

  it('builds a frequency distribution for counts of a selected tag', () => {
    expect(buildTagCountDistributionData(rows, 'science', null)).toEqual([
      {
        countLabel: '0',
        resultShare: 33,
        results: 1,
        tagCount: 0,
        winRate: 0,
        wins: 0,
      },
      {
        countLabel: '2',
        resultShare: 33,
        results: 1,
        tagCount: 2,
        winRate: 0,
        wins: 0,
      },
      {
        countLabel: '6',
        resultShare: 33,
        results: 1,
        tagCount: 6,
        winRate: 100,
        wins: 1,
      },
    ]);
  });

  it('scopes tag win rates and distributions to a focused player', () => {
    expect(buildTagWinRateData(rows, 'p1')).toEqual([
      {
        averageTagCount: 6,
        maxTagCount: 6,
        results: 1,
        tagCode: 'science',
        winRate: 100,
        wins: 1,
      },
    ]);
    expect(buildTagCountDistributionData(rows, 'science', 'p1')).toEqual([
      {
        countLabel: '0',
        resultShare: 50,
        results: 1,
        tagCount: 0,
        winRate: 0,
        wins: 0,
      },
      {
        countLabel: '6',
        resultShare: 50,
        results: 1,
        tagCount: 6,
        winRate: 100,
        wins: 1,
      },
    ]);
  });

  it('relates selected tags to corporation choices', () => {
    expect(buildCorporationTagData(rows, 'science', null)).toEqual([
      {
        averageTagCount: 2,
        corporationId: 'corp-2',
        corporationName: 'Saturn Systems',
        results: 1,
        tagUseRate: 100,
        winRate: 0,
        winsWithTag: 0,
        withTagResults: 1,
      },
      {
        averageTagCount: 3,
        corporationId: 'corp-1',
        corporationName: 'Tharsis Republic',
        results: 2,
        tagUseRate: 50,
        winRate: 100,
        winsWithTag: 1,
        withTagResults: 1,
      },
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
  it('builds the official 61-hex staggered planet grid using source space ids', () => {
    const grid = buildBoardGrid();

    // The source app numbers on-planet hexes "03".."63" (ids 01/02 are the
    // off-planet spaces), so the grid starts at 3, not 1.
    expect(grid).toHaveLength(61);
    expect(grid[0].spaceId).toBe('3');
    expect(grid[60].spaceId).toBe('63');
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

  it('matches zero-padded log spaces to their unpadded grid space', () => {
    const model = aggregateBoardSpaces(
      [
        buildTileRow({ boardSpace: '03', tileType: 'ocean' }),
        buildTileRow({ boardSpace: '3', tileType: 'ocean' }),
      ],
      { gameId: null, mapName: 'Tharsis', tileType: null },
    );

    expect(model.countsBySpace.get('3')).toBe(2);
    expect(model.offBoardCounts).toEqual([]);
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
