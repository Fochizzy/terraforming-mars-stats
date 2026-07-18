/**
 * Client-safe analytics repository contracts (Phase 2, Step 2.5).
 *
 * These contracts separate URL/filter state, repository execution, normalized
 * source records, calculation utilities, and presentation. They intentionally
 * contain no Supabase, React, route, or display-formatting dependency.
 */

import type {
  AnalyticsCapabilityResult,
  NonExecutableAnalyticsCapability,
} from './capabilities';
import type { AnalyticsCoverage } from './coverage';
import type { AnalyticsEvidence } from './evidence';
import type { AnalyticsFilterKey, AnalyticsFilterState } from './filters';
import type { AnalyticsSampleSelectionContext } from './sample';
import type { AnalyticsScope, AnalyticsScopeType } from './scopes';

export const ANALYTICS_REPOSITORY_OPERATION_IDS = [
  'finalized-game-results.list',
  'finalized-game-result.get',
] as const;

export type AnalyticsRepositoryOperationId =
  (typeof ANALYTICS_REPOSITORY_OPERATION_IDS)[number];

export const ANALYTICS_REPOSITORY_RESULT_STATUSES = [
  'ready',
  'empty',
  'partial',
  'unavailable',
  'error',
] as const;

export type AnalyticsRepositoryResultStatus =
  (typeof ANALYTICS_REPOSITORY_RESULT_STATUSES)[number];

export const ANALYTICS_REPOSITORY_ERROR_CATEGORIES = [
  'invalid-input',
  'unsupported-scope',
  'unsupported-filter',
  'unavailable-capability',
  'unauthorized',
  'forbidden',
  'not-found',
  'stale-identity',
  'query-failure',
  'timeout',
  'aborted-request',
  'mapping-failure',
  'unexpected-persistence-response',
] as const;

export type AnalyticsRepositoryErrorCategory =
  (typeof ANALYTICS_REPOSITORY_ERROR_CATEGORIES)[number];

export type AnalyticsRepositoryError = {
  category: AnalyticsRepositoryErrorCategory;
  /** Stable user-safe message. Raw database errors never cross this boundary. */
  message: string;
  retryable: boolean;
};

export type AnalyticsRepositoryWarning = {
  code:
    | 'duplicate-filter-value'
    | 'partial-records'
    | 'unverified-production-population';
  message: string;
  filter?: AnalyticsFilterKey;
};

export const ANALYTICS_REPOSITORY_ORDER_DIRECTIONS = ['asc', 'desc'] as const;

export type AnalyticsRepositoryOrderDirection =
  (typeof ANALYTICS_REPOSITORY_ORDER_DIRECTIONS)[number];

export type AnalyticsRepositoryOrdering<TField extends string = string> = {
  field: TField;
  direction: AnalyticsRepositoryOrderDirection;
  /** Stable technical tie-breakers, never display labels. */
  tieBreakers: readonly string[];
};

export type AnalyticsRepositoryOffsetPaginationInput = {
  kind: 'offset';
  offset: number;
  limit: number;
};

export type AnalyticsRepositoryOffsetPage =
  AnalyticsRepositoryOffsetPaginationInput & {
    returned: number;
    hasMore: boolean;
  };

export type AnalyticsRepositoryNoPagination = { kind: 'none' };

export type AnalyticsRepositoryPaginationInput =
  | AnalyticsRepositoryOffsetPaginationInput
  | AnalyticsRepositoryNoPagination;

export type AnalyticsRepositoryPagination =
  | AnalyticsRepositoryOffsetPage
  | AnalyticsRepositoryNoPagination;

export type AnalyticsRepositoryAuthorizationContext =
  | {
      kind: 'current-user';
      requiredAccess: 'group-member';
    }
  | {
      kind: 'current-user';
      requiredAccess: 'readable-game';
    };

export type AnalyticsRepositoryOperationDeclaration = {
  id: AnalyticsRepositoryOperationId;
  supportedScopes: readonly AnalyticsScopeType[];
  supportedFilters: readonly AnalyticsFilterKey[];
  requiredCapabilityKeys: readonly string[];
  optionalCapabilityKeys?: readonly string[];
  authorization: AnalyticsRepositoryAuthorizationContext['requiredAccess'];
  pagination:
    | { kind: 'none' }
    | { kind: 'offset'; defaultLimit: number; maxLimit: number };
  ordering: readonly AnalyticsRepositoryOrdering[];
};

export type AnalyticsRepositoryQueryMetadata = {
  operationId: AnalyticsRepositoryOperationId;
  scope: AnalyticsScope;
  /** Canonical Step 2.2 sample filters actually used for this query. */
  filters: AnalyticsFilterState;
  /** Comparison/highlight/focus context; never sample membership. */
  selectionContext?: AnalyticsSampleSelectionContext;
  appliedFilters: readonly AnalyticsFilterKey[];
  ordering: AnalyticsRepositoryOrdering;
  pagination: AnalyticsRepositoryPagination;
  authorizationBoundary: 'current-user-rls';
};

export type AnalyticsRepositoryData<TRecord> = {
  records: readonly TRecord[];
  coverage: AnalyticsCoverage;
  evidence: AnalyticsEvidence;
};

type AnalyticsRepositoryDataResultBase<TRecord> = {
  query: AnalyticsRepositoryQueryMetadata;
  data: AnalyticsRepositoryData<TRecord>;
  warnings: readonly AnalyticsRepositoryWarning[];
};

export type ReadyAnalyticsRepositoryResult<TRecord> =
  AnalyticsRepositoryDataResultBase<TRecord> & {
    status: 'ready';
  };

export type EmptyAnalyticsRepositoryResult<TRecord> =
  AnalyticsRepositoryDataResultBase<TRecord> & {
    status: 'empty';
    data: AnalyticsRepositoryData<TRecord> & { records: readonly [] };
  };

export type PartialAnalyticsRepositoryResult<TRecord> =
  AnalyticsRepositoryDataResultBase<TRecord> & {
    status: 'partial';
  };

export type UnavailableAnalyticsRepositoryResult = {
  status: 'unavailable';
  query: Omit<AnalyticsRepositoryQueryMetadata, 'pagination'> & {
    pagination: AnalyticsRepositoryPaginationInput;
  };
  capability: NonExecutableAnalyticsCapability;
  warnings: readonly AnalyticsRepositoryWarning[];
};

export type ErrorAnalyticsRepositoryResult = {
  status: 'error';
  operationId: AnalyticsRepositoryOperationId;
  error: AnalyticsRepositoryError;
};

export type AnalyticsRepositoryResult<TRecord> =
  | ReadyAnalyticsRepositoryResult<TRecord>
  | EmptyAnalyticsRepositoryResult<TRecord>
  | PartialAnalyticsRepositoryResult<TRecord>
  | UnavailableAnalyticsRepositoryResult
  | ErrorAnalyticsRepositoryResult;

export type AnalyticsRepositoryDiagnosticStage =
  | 'input-validation'
  | 'authentication'
  | 'authorization'
  | 'identity-validation'
  | 'source-query'
  | 'mapping';

export type AnalyticsRepositoryDiagnostic = {
  operationId: AnalyticsRepositoryOperationId;
  stage: AnalyticsRepositoryDiagnosticStage;
  category: AnalyticsRepositoryErrorCategory;
  requestId?: string;
  /** Internal cause for server logging/tests only; never copied into a result. */
  cause?: unknown;
};

/** Execution-only metadata. It is not serializable repository identity. */
export type AnalyticsRepositoryExecutionContext = {
  signal?: AbortSignal;
  requestId?: string;
  onDiagnostic?: (diagnostic: AnalyticsRepositoryDiagnostic) => void;
};

export function getActiveAnalyticsFilterKeys(
  filters: AnalyticsFilterState,
): readonly AnalyticsFilterKey[] {
  const active: AnalyticsFilterKey[] = [];

  if (filters.playerId !== null) active.push('player');
  if (filters.groupId !== null) active.push('group');
  if (filters.from !== null || filters.to !== null) active.push('date-range');
  if (filters.mapIds.length > 0) active.push('map');
  if (filters.playerCounts.length > 0) active.push('player-count');
  if (filters.generationCounts.length > 0) active.push('generation-count');
  if (filters.gameLengthCodes.length > 0) active.push('game-length');
  if (filters.corporationIds.length > 0) active.push('corporation');
  if (filters.preludeIds.length > 0) active.push('prelude');
  if (filters.corporationPreludePairs.length > 0) {
    active.push('corporation-prelude-pairing');
  }
  if (filters.cardIds.length > 0) active.push('card');
  if (filters.tagCodes.length > 0) active.push('tag');
  if (filters.scoreSourceKeys.length > 0) active.push('score-source');
  if (filters.styleCodes.length > 0) active.push('style');
  if (filters.status !== 'finalized') active.push('game-status');
  if (filters.minSample !== null) active.push('minimum-sample');

  return active;
}

export function createAnalyticsRepositoryError(input: {
  operationId: AnalyticsRepositoryOperationId;
  category: AnalyticsRepositoryErrorCategory;
  message: string;
  retryable?: boolean;
}): ErrorAnalyticsRepositoryResult {
  return {
    status: 'error',
    operationId: input.operationId,
    error: {
      category: input.category,
      message: input.message,
      retryable: input.retryable ?? false,
    },
  };
}

export function createAnalyticsRepositoryUnavailable(input: {
  query: UnavailableAnalyticsRepositoryResult['query'];
  capability: AnalyticsCapabilityResult;
  warnings?: readonly AnalyticsRepositoryWarning[];
}): UnavailableAnalyticsRepositoryResult {
  if (
    input.capability.status === 'supported' ||
    input.capability.status === 'partially-supported'
  ) {
    throw new Error('Executable capability cannot create an unavailable result');
  }

  return {
    status: 'unavailable',
    query: input.query,
    capability: input.capability,
    warnings: input.warnings ?? [],
  };
}

export function createAnalyticsRepositoryDataResult<TRecord>(input: {
  query: AnalyticsRepositoryQueryMetadata;
  data: AnalyticsRepositoryData<TRecord>;
  partial: boolean;
  warnings?: readonly AnalyticsRepositoryWarning[];
}): AnalyticsRepositoryResult<TRecord> {
  const warnings = input.warnings ?? [];

  if (input.data.records.length === 0) {
    return {
      status: 'empty',
      query: input.query,
      data: { ...input.data, records: [] },
      warnings,
    };
  }

  if (input.partial) {
    return {
      status: 'partial',
      query: input.query,
      data: input.data,
      warnings,
    };
  }

  return {
    status: 'ready',
    query: input.query,
    data: input.data,
    warnings,
  };
}
