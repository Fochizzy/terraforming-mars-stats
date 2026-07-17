/**
 * Normalized analytics source records (Phase 2, Step 2.5).
 *
 * Repository records preserve identity, missingness, provenance, and source
 * completeness. They do not calculate metrics or contain presentation copy.
 */

import { missingMetric, observedMetric } from '@/lib/metrics/metric-value';
import { evaluateAnalyticsCoverage, type AnalyticsCoverage } from './coverage';
import type { AnalyticsEvidence } from './evidence';
import type { AnalyticsEligibilityResult } from './eligibility';
import type { AnalyticsGameStatus } from './filters';
import type {
  WinPointDifferentialInput,
} from './calculations/win-point-differential';
import type {
  AnalyticsRepositoryOperationDeclaration,
  AnalyticsRepositoryOrdering,
} from './repository-contracts';

export const FINALIZED_GAME_RESULTS_MAX_PAGE_SIZE = 100;
export const FINALIZED_GAME_RESULTS_DEFAULT_PAGE_SIZE = 25;
export const FINALIZED_GAME_RESULTS_MAX_MULTI_SELECT_VALUES = 50;

export const FINALIZED_GAME_RESULTS_SUPPORTED_FILTERS = [
  'date-range',
  'map',
  'player-count',
  'generation-count',
  'game-status',
] as const;

export const FINALIZED_GAME_RESULTS_ORDERING: AnalyticsRepositoryOrdering<'played-on'> = {
  field: 'played-on',
  direction: 'desc',
  tieBreakers: ['created-at', 'game-id'],
};

export const FINALIZED_GAME_RESULT_OPERATION_DECLARATIONS = [
  {
    id: 'finalized-game-results.list',
    supportedScopes: ['group'],
    supportedFilters: FINALIZED_GAME_RESULTS_SUPPORTED_FILTERS,
    requiredCapabilityKeys: ['placement-and-winners'],
    optionalCapabilityKeys: ['canonical-win-point-differential'],
    authorization: 'group-member',
    pagination: {
      kind: 'offset',
      defaultLimit: FINALIZED_GAME_RESULTS_DEFAULT_PAGE_SIZE,
      maxLimit: FINALIZED_GAME_RESULTS_MAX_PAGE_SIZE,
    },
    ordering: [
      FINALIZED_GAME_RESULTS_ORDERING,
      { ...FINALIZED_GAME_RESULTS_ORDERING, direction: 'asc' },
    ],
  },
  {
    id: 'finalized-game-result.get',
    supportedScopes: ['game'],
    supportedFilters: [],
    requiredCapabilityKeys: ['placement-and-winners'],
    optionalCapabilityKeys: ['canonical-win-point-differential'],
    authorization: 'readable-game',
    pagination: { kind: 'none' },
    ordering: [FINALIZED_GAME_RESULTS_ORDERING],
  },
] as const satisfies readonly AnalyticsRepositoryOperationDeclaration[];

export const FINALIZED_GAME_SOURCE_MISSING_FIELDS = [
  'player-results',
  'player-id',
  'placement',
  'winner-status',
  'total-points',
] as const;

export type FinalizedGameSourceMissingField =
  (typeof FINALIZED_GAME_SOURCE_MISSING_FIELDS)[number];

export type FinalizedGamePlayerSourceRecord = {
  gamePlayerId: string;
  playerId: string | null;
  placement: number | null;
  isWinner: boolean | null;
  /** Null means missing; observed zero remains numeric zero. */
  totalPoints: number | null;
  missingFields: readonly FinalizedGameSourceMissingField[];
};

export type FinalizedGameSourceProvenance =
  | { kind: 'native' }
  | {
      kind: 'imported';
      importId: string;
      importStatus: string;
      importedAt: string;
    };

export type FinalizedGameSourceRecord = {
  gameId: string;
  groupId: string;
  playedOn: string;
  mapId: string | null;
  playerCount: number;
  generationCount: number;
  status: Extract<AnalyticsGameStatus, 'finalized'>;
  createdAt: string;
  updatedAt: string;
  players: readonly FinalizedGamePlayerSourceRecord[];
  provenance: FinalizedGameSourceProvenance;
  completeness: 'complete' | 'partial';
  missingFields: readonly FinalizedGameSourceMissingField[];
};

export function buildFinalizedGameResultsCoverage(
  records: readonly FinalizedGameSourceRecord[],
): AnalyticsCoverage {
  const completeRecords = records.filter(
    (record) => record.completeness === 'complete',
  ).length;
  const missingRecords = records.length - completeRecords;

  return {
    consideredRecords: records.length,
    eligibleRecords: records.length,
    recordsWithRequiredData: completeRecords,
    recordsMissingRequiredData: missingRecords,
    availableRecords: records.length,
    unavailableRecords: 0,
    exclusions: [],
    missingDataReasons:
      missingRecords === 0
        ? []
        : [
            {
              code: 'incomplete-finalized-game-result',
              count: missingRecords,
              description:
                'One or more finalized games are missing required player-result observations.',
            },
          ],
    sourceDimensions: [
      {
        sourceKey: 'final-scores-and-winner-status',
        eligibleRecords: records.length,
        recordsWithRequiredData: completeRecords,
      },
    ],
  };
}

function latestTimestamp(
  records: readonly FinalizedGameSourceRecord[],
): string | undefined {
  return records.reduce<string | undefined>((latest, record) => {
    const currentTime = Date.parse(record.updatedAt);
    if (Number.isNaN(currentTime)) return latest;
    if (latest === undefined || currentTime > Date.parse(latest)) {
      return record.updatedAt;
    }
    return latest;
  }, undefined);
}

export function buildFinalizedGameResultsEvidence(
  records: readonly FinalizedGameSourceRecord[],
  coverage = buildFinalizedGameResultsCoverage(records),
): AnalyticsEvidence {
  const dataUpdatedAt = latestTimestamp(records);

  return {
    sources: [
      {
        kind: 'persisted-table',
        reference: 'games',
        recordGrain: 'game',
        verification: {
          schemaVerified: true,
          populationVerified: false,
          note:
            'The response verifies the returned page only; production-wide population coverage was not audited.',
        },
      },
      {
        kind: 'persisted-table',
        reference: 'game_players',
        recordGrain: 'player-game',
        verification: {
          schemaVerified: true,
          populationVerified: false,
          note:
            'The response verifies the returned page only; production-wide population coverage was not audited.',
        },
      },
      {
        kind: 'import-evidence',
        reference: 'game_log_imports',
        recordGrain: 'game-import',
        verification: {
          schemaVerified: true,
          populationVerified: false,
          note:
            'Import provenance is reported only when a persisted import is linked to a returned game.',
        },
      },
    ],
    qualifyingGameCount: records.length,
    gameIds: records.map((record) => record.gameId),
    ...(dataUpdatedAt === undefined ? {} : { dataUpdatedAt }),
    coverage,
  };
}

export type WinPointDifferentialInputMapping =
  | {
      status: 'mapped';
      gameId: string;
      gamePlayerId: string;
      playerId: string | null;
      input: WinPointDifferentialInput;
    }
  | {
      status: 'unavailable';
      gameId: string;
      gamePlayerId: string;
      playerId: string | null;
      reason: {
        code: 'missing-winner-status';
        explanation: string;
      };
    };

function eligibleSourceRecord(): AnalyticsEligibilityResult {
  return { status: 'eligible' };
}

/**
 * Maps normalized source observations into Step 2.4 inputs. This function does
 * not calculate a differential; it exists only to keep source normalization
 * out of route and presentation code.
 */
export function toWinPointDifferentialInputs(
  record: FinalizedGameSourceRecord,
): readonly WinPointDifferentialInputMapping[] {
  const winnerStatusMissing =
    record.players.some((player) => player.isWinner === null) ||
    !record.players.some((player) => player.isWinner === true);

  if (winnerStatusMissing) {
    return record.players.map((player) => ({
      status: 'unavailable',
      gameId: record.gameId,
      gamePlayerId: player.gamePlayerId,
      playerId: player.playerId,
      reason: {
        code: 'missing-winner-status',
        explanation:
          'Winner status is missing for at least one player result, so winner and tied-first outcomes cannot be determined.',
      },
    }));
  }

  const winners = record.players.filter((player) => player.isWinner === true);
  const nonWinners = record.players.filter(
    (player) => player.isWinner === false,
  );
  const coverage = evaluateAnalyticsCoverage(
    buildFinalizedGameResultsCoverage([record]),
  );

  return record.players.map((player) => {
    const outcome =
      player.isWinner === false
        ? 'non-winner'
        : winners.length > 1
          ? 'tied-first'
          : 'winner';

    return {
      status: 'mapped',
      gameId: record.gameId,
      gamePlayerId: player.gamePlayerId,
      playerId: player.playerId,
      input: {
        outcome,
        winnerScore:
          player.totalPoints === null
            ? missingMetric()
            : observedMetric(player.totalPoints),
        nonWinnerScores: nonWinners.map((candidate) =>
          candidate.totalPoints === null
            ? missingMetric()
            : observedMetric(candidate.totalPoints),
        ),
        eligibility: eligibleSourceRecord(),
        coverage,
      },
    } satisfies WinPointDifferentialInputMapping;
  });
}
