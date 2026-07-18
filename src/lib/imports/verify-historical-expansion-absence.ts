import {
  buildGameExpansionFactInput,
  parseTerraformingMarsExpansionMechanics,
  type ExpansionPlayerResolution,
} from './parse-terraforming-mars-expansion-mechanics';

export const HISTORICAL_EXPANSION_BACKFILL_VERSION =
  'phase-04-step-03b-owner-confirmed-absence-v1' as const;
export const HISTORICAL_EXPANSION_CUTOFF =
  '2026-07-18T00:00:00.000Z' as const;

export type HistoricalExpansionGame = {
  gameId: string;
  hasExistingFacts: boolean;
  playerResolutions?: ExpansionPlayerResolution[];
  sourceGameLogImportId: string | null;
  sourceLogText: string | null;
};

export type HistoricalExpansionFactRow = {
  backfill_version: typeof HISTORICAL_EXPANSION_BACKFILL_VERSION;
  backfilled_at: string;
  colonies_state:
    | 'historical_owner_confirmed_absent'
    | 'historical_parser_verified_owner_confirmed_absent';
  colony_built_count: 0;
  colony_trade_count: 0;
  detection_provenance: Record<string, unknown>;
  final_venus_scale: null;
  game_id: string;
  parser_version: string | null;
  source_coverage: Record<string, unknown>;
  source_game_log_import_id: string | null;
  venus_event_count: 0;
  venus_next_state:
    | 'historical_owner_confirmed_absent'
    | 'historical_parser_verified_owner_confirmed_absent';
};

export type HistoricalExpansionVerificationReport = {
  alreadyPopulated: number;
  backfillVersion: typeof HISTORICAL_EXPANSION_BACKFILL_VERSION;
  cutoff: typeof HISTORICAL_EXPANSION_CUTOFF;
  duplicateEvents: number;
  eligibleGames: number;
  excludedGames: number;
  exactUpdateConditions: string[];
  gamesRequiringReview: string[];
  gamesWithRetainedParseableLogs: number;
  gamesWithoutRetainedLogs: number;
  incompleteEvidence: number;
  ownerConfirmedOnly: number;
  parserConfirmedColoniesAbsence: number;
  parserConfirmedVenusAbsence: number;
  parserExceptions: number;
  parserVerified: number;
  plannedRows: HistoricalExpansionFactRow[];
  plannedWriteCount: number;
  productionWritePerformed: false;
  totalHistoricalGames: number;
  unexpectedColoniesEvents: number;
  unexpectedColoniesPresence: number;
  unexpectedVenusEvents: number;
  unexpectedVenusPresence: number;
  unresolvedPlayerAssociations: number;
  unsupportedPatterns: number;
  conflictingEvidence: number;
};

function ownerConfirmedOnlyFact(input: {
  backfilledAt: string;
  gameId: string;
}): HistoricalExpansionFactRow {
  return {
    backfill_version: HISTORICAL_EXPANSION_BACKFILL_VERSION,
    backfilled_at: input.backfilledAt,
    colonies_state: 'historical_owner_confirmed_absent',
    colony_built_count: 0,
    colony_trade_count: 0,
    detection_provenance: {
      authority: 'owner_confirmation',
      parser_verified: false,
    },
    final_venus_scale: null,
    game_id: input.gameId,
    parser_version: null,
    source_coverage: {
      complete: false,
      reason: 'no_retained_parseable_log',
    },
    source_game_log_import_id: null,
    venus_event_count: 0,
    venus_next_state: 'historical_owner_confirmed_absent',
  };
}

export function verifyHistoricalExpansionAbsence(input: {
  backfilledAt: string;
  games: HistoricalExpansionGame[];
}): HistoricalExpansionVerificationReport {
  const report: HistoricalExpansionVerificationReport = {
    alreadyPopulated: 0,
    backfillVersion: HISTORICAL_EXPANSION_BACKFILL_VERSION,
    conflictingEvidence: 0,
    cutoff: HISTORICAL_EXPANSION_CUTOFF,
    duplicateEvents: 0,
    eligibleGames: input.games.length,
    exactUpdateConditions: [
      `games.created_at < ${HISTORICAL_EXPANSION_CUTOFF}`,
      'no existing public.game_expansion_facts row for the game',
      'same production parser reports the expected owner-confirmed absence state',
      'no unsupported, conflicting, incomplete, unexpected, duplicate, or unresolved parser result',
    ],
    excludedGames: 0,
    gamesRequiringReview: [],
    gamesWithRetainedParseableLogs: 0,
    gamesWithoutRetainedLogs: 0,
    incompleteEvidence: 0,
    ownerConfirmedOnly: 0,
    parserConfirmedColoniesAbsence: 0,
    parserConfirmedVenusAbsence: 0,
    parserExceptions: 0,
    parserVerified: 0,
    plannedRows: [],
    plannedWriteCount: 0,
    productionWritePerformed: false,
    totalHistoricalGames: input.games.length,
    unexpectedColoniesEvents: 0,
    unexpectedColoniesPresence: 0,
    unexpectedVenusEvents: 0,
    unexpectedVenusPresence: 0,
    unresolvedPlayerAssociations: 0,
    unsupportedPatterns: 0,
  };

  for (const game of input.games) {
    if (game.hasExistingFacts) {
      report.alreadyPopulated += 1;
      continue;
    }

    if (!game.sourceGameLogImportId || !game.sourceLogText?.trim()) {
      report.gamesWithoutRetainedLogs += 1;
      report.ownerConfirmedOnly += 1;
      report.plannedRows.push(
        ownerConfirmedOnlyFact({
          backfilledAt: input.backfilledAt,
          gameId: game.gameId,
        }),
      );
      continue;
    }

    report.gamesWithRetainedParseableLogs += 1;
    try {
      const parsed = parseTerraformingMarsExpansionMechanics({
        exportedLogText: game.sourceLogText,
        historicalOwnerConfirmedAbsent: true,
        playerResolutions: game.playerResolutions,
      });
      const facts = buildGameExpansionFactInput(parsed);
      const venusEvents = parsed.events.filter((event) =>
        event.eventType.startsWith('venus_'),
      ).length;
      const coloniesEvents = parsed.events.filter((event) =>
        event.eventType.startsWith('colony_'),
      ).length;
      const expectedState =
        'historical_parser_verified_owner_confirmed_absent';

      report.duplicateEvents += parsed.duplicateEventCount;
      report.unresolvedPlayerAssociations +=
        parsed.unresolvedPlayerAssociations.length;
      report.unexpectedVenusEvents += venusEvents;
      report.unexpectedColoniesEvents += coloniesEvents;
      report.unexpectedVenusPresence +=
        parsed.venusNext.state === 'confirmed_present' ? 1 : 0;
      report.unexpectedColoniesPresence +=
        parsed.colonies.state === 'confirmed_present' ? 1 : 0;
      report.incompleteEvidence +=
        parsed.venusNext.state === 'incomplete_evidence' ||
        parsed.colonies.state === 'incomplete_evidence'
          ? 1
          : 0;
      report.unsupportedPatterns +=
        parsed.venusNext.state === 'unsupported_log_pattern' ||
        parsed.colonies.state === 'unsupported_log_pattern'
          ? 1
          : 0;
      report.conflictingEvidence +=
        parsed.venusNext.state === 'conflicting_evidence' ||
        parsed.colonies.state === 'conflicting_evidence'
          ? 1
          : 0;

      const requiresReview =
        parsed.venusNext.state !== expectedState ||
        parsed.colonies.state !== expectedState ||
        parsed.events.length > 0 ||
        parsed.duplicateEventCount > 0 ||
        parsed.unresolvedPlayerAssociations.length > 0;

      if (requiresReview) {
        report.gamesRequiringReview.push(game.gameId);
        continue;
      }

      report.parserVerified += 1;
      report.parserConfirmedVenusAbsence += 1;
      report.parserConfirmedColoniesAbsence += 1;
      report.plannedRows.push({
        backfill_version: HISTORICAL_EXPANSION_BACKFILL_VERSION,
        backfilled_at: input.backfilledAt,
        colonies_state: expectedState,
        colony_built_count: 0,
        colony_trade_count: 0,
        detection_provenance: {
          ...facts.detectionProvenance,
          authority: 'owner_confirmation_and_parser',
          parser_verified: true,
        },
        final_venus_scale: null,
        game_id: game.gameId,
        parser_version: facts.parserVersion,
        source_coverage: facts.sourceCoverage,
        source_game_log_import_id: game.sourceGameLogImportId,
        venus_event_count: 0,
        venus_next_state: expectedState,
      });
    } catch {
      report.parserExceptions += 1;
      report.gamesRequiringReview.push(game.gameId);
    }
  }

  report.gamesRequiringReview = [...new Set(report.gamesRequiringReview)].sort();
  report.plannedWriteCount = report.plannedRows.length;
  return report;
}
