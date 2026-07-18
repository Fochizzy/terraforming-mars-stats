import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_EXPANSION_BACKFILL_VERSION,
  verifyHistoricalExpansionBackfillWrite,
  verifyHistoricalExpansionAbsence,
  type HistoricalExpansionGame,
} from './verify-historical-expansion-absence';

const completeNegativeLog = [
  'Good luck Friday!',
  'Generation 1',
  'Friday played Interstellar Colony Ship',
  'Final greenery placement',
  'This game id was historical-negative',
].join('\n');

describe('verifyHistoricalExpansionAbsence', () => {
  it('runs the production parser and plans only verified zero-event absence rows', () => {
    const report = verifyHistoricalExpansionAbsence({
      backfilledAt: '2026-07-18T19:30:00.000Z',
      games: [
        {
          gameId: 'game-with-log',
          hasExistingFacts: false,
          sourceGameLogImportId: 'import-with-log',
          sourceLogText: completeNegativeLog,
        },
      ],
    });

    expect(report).toMatchObject({
      gamesRequiringReview: [],
      gamesWithRetainedParseableLogs: 1,
      parserConfirmedColoniesAbsence: 1,
      parserConfirmedVenusAbsence: 1,
      parserVerified: 1,
      plannedWriteCount: 1,
      productionWritePerformed: false,
      unexpectedColoniesEvents: 0,
      unexpectedVenusEvents: 0,
    });
    expect(report.plannedRows[0]).toMatchObject({
      backfill_version: HISTORICAL_EXPANSION_BACKFILL_VERSION,
      colonies_state: 'historical_parser_verified_owner_confirmed_absent',
      colony_built_count: 0,
      colony_trade_count: 0,
      final_venus_scale: null,
      game_id: 'game-with-log',
      source_game_log_import_id: 'import-with-log',
      venus_event_count: 0,
      venus_next_state: 'historical_parser_verified_owner_confirmed_absent',
    });
  });

  it('uses owner-confirmed-only state when a source log is unavailable', () => {
    const report = verifyHistoricalExpansionAbsence({
      backfilledAt: '2026-07-18T19:30:00.000Z',
      games: [
        {
          gameId: 'game-no-log',
          hasExistingFacts: false,
          sourceGameLogImportId: null,
          sourceLogText: null,
        },
      ],
    });

    expect(report.ownerConfirmedOnly).toBe(1);
    expect(report.plannedRows[0]).toMatchObject({
      colonies_state: 'historical_owner_confirmed_absent',
      parser_version: null,
      source_game_log_import_id: null,
      venus_next_state: 'historical_owner_confirmed_absent',
    });
  });

  it('halts the plan for unexpected evidence instead of writing absence', () => {
    const report = verifyHistoricalExpansionAbsence({
      backfilledAt: '2026-07-18T19:30:00.000Z',
      games: [
        {
          gameId: 'game-unexpected-venus',
          hasExistingFacts: false,
          sourceGameLogImportId: 'import-unexpected-venus',
          sourceLogText: [
            'Generation 1',
            'Friday raised the Venus scale 1 step',
            'Final greenery placement',
            'This game id was unexpected-venus',
          ].join('\n'),
        },
      ],
    });

    expect(report.gamesRequiringReview).toEqual(['game-unexpected-venus']);
    expect(report.conflictingEvidence).toBe(1);
    expect(report.unexpectedVenusEvents).toBe(1);
    expect(report.plannedRows).toEqual([]);
  });

  it('is idempotent and never overwrites future-style facts', () => {
    const games: HistoricalExpansionGame[] = [
      {
        gameId: 'already-populated',
        hasExistingFacts: true,
        sourceGameLogImportId: 'import-existing',
        sourceLogText: completeNegativeLog,
      },
    ];
    const secondRun = verifyHistoricalExpansionAbsence({
      backfilledAt: '2026-07-18T19:30:00.000Z',
      games,
    });

    expect(secondRun.alreadyPopulated).toBe(1);
    expect(secondRun.plannedWriteCount).toBe(0);
    expect(secondRun.plannedRows).toEqual([]);
  });

  it('accepts both a first write and a later zero-change rerun', () => {
    expect(
      verifyHistoricalExpansionBackfillWrite({
        existingBackfillRows: 0,
        persistedBackfillRows: 42,
        plannedWrites: 42,
        secondRunPlannedWrites: 0,
      }),
    ).toMatchObject({ newlyInsertedRows: 42 });
    expect(
      verifyHistoricalExpansionBackfillWrite({
        existingBackfillRows: 42,
        persistedBackfillRows: 42,
        plannedWrites: 0,
        secondRunPlannedWrites: 0,
      }),
    ).toMatchObject({ newlyInsertedRows: 0 });
  });
});
