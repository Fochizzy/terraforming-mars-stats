import { describe, expect, it } from 'vitest';
import type { TagOutcomeRow } from '@/lib/db/extended-analytics-repo';
import {
  buildCorporationTagData,
  buildTagCountDistributionData,
  buildTagOutcomeNarratives,
  buildTagWinRateData,
} from './tag-outcomes-section';

function buildRow(overrides: Partial<TagOutcomeRow>): TagOutcomeRow {
  return {
    corporationId: 'corp-arklight',
    corporationName: 'Arklight',
    gameId: 'game-1',
    groupId: 'group-1',
    isWinner: true,
    playedOn: '2026-07-09',
    playerId: 'player-1',
    playerName: 'Izzy',
    tagCode: 'building',
    tagCount: 5,
    totalPoints: 80,
    ...overrides,
  };
}

// analytics.player_tag_outcomes emits one row per corporation, so a player who
// took a second corporation via the Merger prelude appears twice for the same
// tag result.
const mergerPlayerRows = [
  buildRow({}),
  buildRow({ corporationId: 'corp-vitor', corporationName: 'Vitor' }),
];

const opponentRow = buildRow({
  corporationId: 'corp-viron',
  corporationName: 'Viron',
  gameId: 'game-2',
  isWinner: false,
  playerId: 'player-2',
  playerName: 'James',
  tagCount: 3,
});

const rows = [...mergerPlayerRows, opponentRow];

describe('buildTagWinRateData', () => {
  it('counts a multi-corporation player once per tag result', () => {
    expect(buildTagWinRateData(rows, null)).toEqual([
      {
        averageTagCount: 4,
        maxTagCount: 5,
        results: 2,
        tagCode: 'building',
        winRate: 50,
        wins: 1,
      },
    ]);
  });
});

describe('buildTagCountDistributionData', () => {
  it('does not inflate result share for a multi-corporation player', () => {
    expect(buildTagCountDistributionData(rows, 'building', null)).toEqual([
      {
        countLabel: '3',
        resultShare: 50,
        results: 1,
        tagCount: 3,
        winRate: 0,
        wins: 0,
      },
      {
        countLabel: '5',
        resultShare: 50,
        results: 1,
        tagCount: 5,
        winRate: 100,
        wins: 1,
      },
    ]);
  });
});

describe('buildCorporationTagData', () => {
  it('still credits every corporation the player controlled', () => {
    expect(
      buildCorporationTagData(rows, 'building', null).map(
        (entry) => entry.corporationName,
      ),
    ).toEqual(['Arklight', 'Vitor', 'Viron']);
  });
});

describe('buildTagOutcomeNarratives', () => {
  it('explains the strongest, weakest, and deepest tag signals in sentences', () => {
    const narrativeRows = [
      buildRow({ gameId: 'g1', tagCode: 'science', tagCount: 7 }),
      buildRow({ gameId: 'g2', isWinner: true, tagCode: 'science', tagCount: 5 }),
      buildRow({ gameId: 'g5', isWinner: true, tagCode: 'science', tagCount: 4 }),
      buildRow({ gameId: 'g3', isWinner: false, tagCode: 'animal', tagCount: 1 }),
      buildRow({ gameId: 'g4', isWinner: false, tagCode: 'animal', tagCount: 2 }),
      buildRow({ gameId: 'g1', tagCode: 'building', tagCount: 14 }),
      buildRow({ gameId: 'g2', isWinner: true, tagCode: 'building', tagCount: 10 }),
    ];

    expect(buildTagOutcomeNarratives(narrativeRows, 'player-1')).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Science is your strongest context-adjusted tag signal/i),
        expect.stringMatching(/Animal is your clearest loss-correlated tag/i),
        expect.stringMatching(/Building was your deepest tag engine/i),
      ]),
    );
  });
});
