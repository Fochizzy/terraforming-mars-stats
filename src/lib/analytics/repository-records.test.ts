import { describe, expect, it } from 'vitest';
import { calculateWinPointDifferential } from './calculations';
import {
  mapFinalizedGameSourceRecords,
} from '@/lib/db/analytics/finalized-game-results-repo';
import {
  buildFinalizedGameResultsCoverage,
  buildFinalizedGameResultsEvidence,
  toWinPointDifferentialInputs,
} from './repository-records';

const IDS = {
  game: '00000000-0000-4000-8000-000000000001',
  group: '00000000-0000-4000-8000-000000000002',
  playerOne: '00000000-0000-4000-8000-000000000003',
  playerTwo: '00000000-0000-4000-8000-000000000004',
  gamePlayerOne: '00000000-0000-4000-8000-000000000005',
  gamePlayerTwo: '00000000-0000-4000-8000-000000000006',
  import: '00000000-0000-4000-8000-000000000007',
};

function game() {
  return {
    id: IDS.game,
    group_id: IDS.group,
    played_on: '2026-07-01',
    map_id: null,
    player_count: 2,
    generation_count: 10,
    status: 'finalized',
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-02T12:00:00.000Z',
  };
}

function players(input?: {
  tied?: boolean;
  winnerPoints?: number | null;
  loserPoints?: number | null;
  winnerFlag?: boolean | null;
}) {
  const winnerPoints =
    input?.winnerPoints === undefined ? 10 : input.winnerPoints;
  const loserPoints = input?.loserPoints === undefined ? 0 : input.loserPoints;
  const winnerFlag =
    input?.winnerFlag === undefined ? true : input.winnerFlag;
  return [
    {
      id: IDS.gamePlayerOne,
      game_id: IDS.game,
      player_id: IDS.playerOne,
      placement: 1,
      is_winner: winnerFlag,
      total_points: winnerPoints,
    },
    {
      id: IDS.gamePlayerTwo,
      game_id: IDS.game,
      player_id: IDS.playerTwo,
      placement: input?.tied ? 1 : 2,
      is_winner: input?.tied ?? false,
      total_points: loserPoints,
    },
  ];
}

describe('normalized finalized-game source records', () => {
  it('preserves explicit zero, identity, ordering, and native provenance', () => {
    const [record] = mapFinalizedGameSourceRecords({
      games: [game()],
      players: players(),
      imports: [],
    });

    expect(record).toMatchObject({
      gameId: IDS.game,
      groupId: IDS.group,
      provenance: { kind: 'native' },
      completeness: 'complete',
      players: [
        { gamePlayerId: IDS.gamePlayerOne, totalPoints: 10 },
        { gamePlayerId: IDS.gamePlayerTwo, totalPoints: 0 },
      ],
    });
    expect(record.missingFields).toEqual([]);
  });

  it('feeds complete sole-winner observations into the Step 2.4 utility', () => {
    const [record] = mapFinalizedGameSourceRecords({
      games: [game()],
      players: players(),
      imports: [],
    });
    const mappings = toWinPointDifferentialInputs(record);
    const winner = mappings.find(
      (mapping) => mapping.gamePlayerId === IDS.gamePlayerOne,
    );

    expect(winner?.status).toBe('mapped');
    if (winner?.status !== 'mapped') return;
    expect(calculateWinPointDifferential(winner.input)).toMatchObject({
      outcome: 'winner',
      value: { kind: 'observed', value: 10 },
    });
  });

  it('preserves tied-first as indeterminate instead of fabricating zero', () => {
    const [record] = mapFinalizedGameSourceRecords({
      games: [game()],
      players: players({ tied: true, winnerPoints: 10, loserPoints: 10 }),
      imports: [],
    });
    const [first] = toWinPointDifferentialInputs(record);

    expect(first.status).toBe('mapped');
    if (first.status !== 'mapped') return;
    expect(calculateWinPointDifferential(first.input)).toMatchObject({
      outcome: 'tied-first',
      value: { kind: 'unavailable' },
      eligibility: {
        status: 'indeterminate',
        reasons: [{ code: 'tied-first-policy-unresolved' }],
      },
    });
  });

  it('marks missing scores as partial without coercing them to zero', () => {
    const [record] = mapFinalizedGameSourceRecords({
      games: [game()],
      players: players({ winnerPoints: null }),
      imports: [],
    });
    const coverage = buildFinalizedGameResultsCoverage([record]);
    const winner = toWinPointDifferentialInputs(record)[0];

    expect(record).toMatchObject({
      completeness: 'partial',
      missingFields: ['total-points'],
      players: [{ totalPoints: null }, { totalPoints: 0 }],
    });
    expect(coverage).toMatchObject({
      eligibleRecords: 1,
      recordsWithRequiredData: 0,
      recordsMissingRequiredData: 1,
    });
    expect(winner.status).toBe('mapped');
    if (winner.status !== 'mapped') return;
    expect(calculateWinPointDifferential(winner.input).value.kind).toBe(
      'missing',
    );
  });

  it('reports missing winner status as unavailable source input', () => {
    const [record] = mapFinalizedGameSourceRecords({
      games: [game()],
      players: players({ winnerFlag: null }),
      imports: [],
    });

    expect(toWinPointDifferentialInputs(record)).toEqual([
      expect.objectContaining({
        status: 'unavailable',
        reason: { code: 'missing-winner-status', explanation: expect.any(String) },
      }),
      expect.objectContaining({
        status: 'unavailable',
        reason: { code: 'missing-winner-status', explanation: expect.any(String) },
      }),
    ]);
  });

  it('selects the newest linked import and reports unverified population evidence', () => {
    const [record] = mapFinalizedGameSourceRecords({
      games: [game()],
      players: players(),
      imports: [
        {
          id: '00000000-0000-4000-8000-000000000008',
          game_id: IDS.game,
          parse_status: 'saved_as_draft',
          created_at: '2026-07-01T12:00:00.000Z',
        },
        {
          id: IDS.import,
          game_id: IDS.game,
          parse_status: 'finalized',
          created_at: '2026-07-03T12:00:00.000Z',
        },
      ],
    });
    const evidence = buildFinalizedGameResultsEvidence([record]);

    expect(record.provenance).toEqual({
      kind: 'imported',
      importId: IDS.import,
      importStatus: 'finalized',
      importedAt: '2026-07-03T12:00:00.000Z',
    });
    expect(evidence).toMatchObject({
      qualifyingGameCount: 1,
      gameIds: [IDS.game],
      dataUpdatedAt: '2026-07-02T12:00:00.000Z',
    });
    expect(
      evidence.sources.every(
        (source) => source.verification?.populationVerified === false,
      ),
    ).toBe(true);
  });

  it('rejects display labels where persisted stable identity is required', () => {
    expect(() =>
      mapFinalizedGameSourceRecords({
        games: [game()],
        players: [
          { ...players()[0], player_id: 'Friday Mars' },
          players()[1],
        ],
        imports: [],
      }),
    ).toThrow('game_players.player_id');
  });
});
