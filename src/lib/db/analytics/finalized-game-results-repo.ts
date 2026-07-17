import {
  canonicalIsoDate,
  canonicalUuid,
  normalizeAnalyticsFilterState,
  normalizeAnalyticsSelectionState,
  type AnalyticsFilterIssue,
} from '@/lib/analytics/filter-normalization';
import {
  createDefaultAnalyticsFilterState,
  type AnalyticsFilterKey,
  type AnalyticsFilterState,
} from '@/lib/analytics/filters';
import {
  createAnalyticsRepositoryDataResult,
  createAnalyticsRepositoryError,
  getActiveAnalyticsFilterKeys,
  type AnalyticsRepositoryErrorCategory,
  type AnalyticsRepositoryExecutionContext,
  type AnalyticsRepositoryOffsetPaginationInput,
  type AnalyticsRepositoryOrdering,
  type AnalyticsRepositoryQueryMetadata,
  type AnalyticsRepositoryResult,
  type AnalyticsRepositoryWarning,
} from '@/lib/analytics/repository-contracts';
import {
  buildFinalizedGameResultsCoverage,
  buildFinalizedGameResultsEvidence,
  FINALIZED_GAME_RESULTS_DEFAULT_PAGE_SIZE,
  FINALIZED_GAME_RESULTS_MAX_MULTI_SELECT_VALUES,
  FINALIZED_GAME_RESULTS_MAX_PAGE_SIZE,
  FINALIZED_GAME_RESULTS_ORDERING,
  FINALIZED_GAME_RESULTS_SUPPORTED_FILTERS,
  type FinalizedGamePlayerSourceRecord,
  type FinalizedGameSourceMissingField,
  type FinalizedGameSourceProvenance,
  type FinalizedGameSourceRecord,
} from '@/lib/analytics/repository-records';
import type { AnalyticsSampleSelectionContext } from '@/lib/analytics/sample';
import type {
  GameAnalyticsScope,
  GroupAnalyticsScope,
} from '@/lib/analytics/scopes';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type FinalizedGameResultsOrdering = AnalyticsRepositoryOrdering<'played-on'>;

export type ListFinalizedGameResultsInput = {
  scope: GroupAnalyticsScope;
  filters: AnalyticsFilterState;
  selectionContext?: AnalyticsSampleSelectionContext;
  pagination?: AnalyticsRepositoryOffsetPaginationInput;
  ordering?: FinalizedGameResultsOrdering;
  authorization: {
    kind: 'current-user';
    requiredAccess: 'group-member';
  };
  execution?: AnalyticsRepositoryExecutionContext;
};

export type GetFinalizedGameResultInput = {
  scope: GameAnalyticsScope;
  selectionContext?: AnalyticsSampleSelectionContext;
  authorization: {
    kind: 'current-user';
    requiredAccess: 'readable-game';
  };
  execution?: AnalyticsRepositoryExecutionContext;
};

type RawGameRow = {
  id: unknown;
  group_id: unknown;
  played_on: unknown;
  map_id: unknown;
  player_count: unknown;
  generation_count: unknown;
  status: unknown;
  created_at: unknown;
  updated_at: unknown;
};

type RawGamePlayerRow = {
  id: unknown;
  game_id: unknown;
  player_id: unknown;
  placement: unknown;
  is_winner: unknown;
  total_points: unknown;
};

type RawGameImportRow = {
  id: unknown;
  game_id: unknown;
  parse_status: unknown;
  created_at: unknown;
};

type ValidatedListInput = {
  scope: GroupAnalyticsScope;
  filters: AnalyticsFilterState;
  selectionContext?: AnalyticsSampleSelectionContext;
  pagination: AnalyticsRepositoryOffsetPaginationInput;
  ordering: FinalizedGameResultsOrdering;
  warnings: readonly AnalyticsRepositoryWarning[];
};

type ValidationResult<T> =
  | { valid: true; value: T }
  | {
      valid: false;
      category: Extract<
        AnalyticsRepositoryErrorCategory,
        'invalid-input' | 'unsupported-filter' | 'unsupported-scope'
      >;
      message: string;
    };

const GAME_COLUMNS = [
  'id',
  'group_id',
  'played_on',
  'map_id',
  'player_count',
  'generation_count',
  'status',
  'created_at',
  'updated_at',
].join(', ');

const GAME_PLAYER_COLUMNS = [
  'id',
  'game_id',
  'player_id',
  'placement',
  'is_winner',
  'total_points',
].join(', ');

const GAME_IMPORT_COLUMNS = [
  'id',
  'game_id',
  'parse_status',
  'created_at',
].join(', ');

function emitDiagnostic(
  operationId: 'finalized-game-results.list' | 'finalized-game-result.get',
  execution: AnalyticsRepositoryExecutionContext | undefined,
  stage:
    | 'input-validation'
    | 'authentication'
    | 'authorization'
    | 'identity-validation'
    | 'source-query'
    | 'mapping',
  category: AnalyticsRepositoryErrorCategory,
  cause?: unknown,
): void {
  execution?.onDiagnostic?.({
    operationId,
    stage,
    category,
    ...(execution.requestId === undefined
      ? {}
      : { requestId: execution.requestId }),
    ...(cause === undefined ? {} : { cause }),
  });
}

function errorResult(
  operationId: 'finalized-game-results.list' | 'finalized-game-result.get',
  execution: AnalyticsRepositoryExecutionContext | undefined,
  stage: Parameters<typeof emitDiagnostic>[2],
  category: AnalyticsRepositoryErrorCategory,
  message: string,
  options: { cause?: unknown; retryable?: boolean } = {},
): AnalyticsRepositoryResult<FinalizedGameSourceRecord> {
  emitDiagnostic(operationId, execution, stage, category, options.cause);
  return createAnalyticsRepositoryError({
    operationId,
    category,
    message,
    retryable: options.retryable,
  });
}

function isAborted(
  signal: AbortSignal | undefined,
  error?: unknown,
): boolean {
  return (
    signal?.aborted === true ||
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError')
  );
}

function isTimeout(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'TimeoutError') ||
    (typeof error === 'object' &&
      error !== null &&
      (('name' in error && error.name === 'TimeoutError') ||
        ('code' in error && error.code === '57014')))
  );
}

function sourceFailure(
  operationId: 'finalized-game-results.list' | 'finalized-game-result.get',
  execution: AnalyticsRepositoryExecutionContext | undefined,
  cause: unknown,
): AnalyticsRepositoryResult<FinalizedGameSourceRecord> {
  if (isAborted(execution?.signal, cause)) {
    return errorResult(
      operationId,
      execution,
      'source-query',
      'aborted-request',
      'The analytics request was cancelled.',
      { cause },
    );
  }
  if (isTimeout(cause)) {
    return errorResult(
      operationId,
      execution,
      'source-query',
      'timeout',
      'The analytics request timed out. Please try again.',
      { cause, retryable: true },
    );
  }
  return errorResult(
    operationId,
    execution,
    'source-query',
    'query-failure',
    'Analytics data could not be loaded. Please try again.',
    { cause, retryable: true },
  );
}

function duplicateWarnings(
  issues: readonly AnalyticsFilterIssue[],
): readonly AnalyticsRepositoryWarning[] {
  return issues
    .filter((issue) => issue.code === 'duplicate-value')
    .map((issue) => ({
      code: 'duplicate-filter-value' as const,
      message: issue.message,
      ...(issue.owner === 'selection'
        ? {}
        : { filter: issue.owner as AnalyticsFilterKey }),
    }));
}

function normalizeSelectionContext(
  context: AnalyticsSampleSelectionContext | undefined,
): ValidationResult<AnalyticsSampleSelectionContext | undefined> {
  if (context === undefined) return { valid: true, value: undefined };

  const normalized = normalizeAnalyticsSelectionState(context.state);
  const invalidIssue = normalized.issues.find(
    (issue) => issue.code !== 'duplicate-value',
  );
  if (invalidIssue !== undefined) {
    return {
      valid: false,
      category: 'invalid-input',
      message: 'Selection context contains an invalid technical identity.',
    };
  }
  return {
    valid: true,
    value: { state: normalized.state, role: context.role },
  };
}

function validateListInput(
  input: ListFinalizedGameResultsInput,
): ValidationResult<ValidatedListInput> {
  const groupId = canonicalUuid(input.scope.groupId);
  if (input.scope.type !== 'group' || groupId === null) {
    return {
      valid: false,
      category: 'unsupported-scope',
      message: 'A canonical group scope is required for this operation.',
    };
  }

  const normalized = normalizeAnalyticsFilterState(input.filters, {
    scope: { type: 'group', groupId },
  });
  const nonDuplicateIssue = normalized.issues.find(
    (issue) => issue.code !== 'duplicate-value',
  );
  if (nonDuplicateIssue !== undefined) {
    return {
      valid: false,
      category:
        nonDuplicateIssue.code.includes('unsupported') ||
        nonDuplicateIssue.code === 'deferred-filter' ||
        nonDuplicateIssue.code === 'unavailable-filter' ||
        nonDuplicateIssue.code === 'not-applicable-filter'
          ? 'unsupported-filter'
          : 'invalid-input',
      message:
        nonDuplicateIssue.owner === 'selection'
          ? 'The analytics query contains invalid selection state.'
          : `The ${nonDuplicateIssue.owner} filter is invalid for this query.`,
    };
  }

  const activeFilters = getActiveAnalyticsFilterKeys(normalized.state);
  const unsupportedFilter = activeFilters.find(
    (key) =>
      !(
        FINALIZED_GAME_RESULTS_SUPPORTED_FILTERS as readonly AnalyticsFilterKey[]
      ).includes(key),
  );
  if (unsupportedFilter !== undefined) {
    return {
      valid: false,
      category: 'unsupported-filter',
      message: `The ${unsupportedFilter} filter is not supported by finalized-game result queries.`,
    };
  }

  if (
    normalized.state.mapIds.length >
      FINALIZED_GAME_RESULTS_MAX_MULTI_SELECT_VALUES ||
    normalized.state.playerCounts.length >
      FINALIZED_GAME_RESULTS_MAX_MULTI_SELECT_VALUES ||
    normalized.state.generationCounts.length >
      FINALIZED_GAME_RESULTS_MAX_MULTI_SELECT_VALUES
  ) {
    return {
      valid: false,
      category: 'invalid-input',
      message: `A multi-select filter cannot contain more than ${FINALIZED_GAME_RESULTS_MAX_MULTI_SELECT_VALUES} values.`,
    };
  }

  const pagination = input.pagination ?? {
    kind: 'offset' as const,
    offset: 0,
    limit: FINALIZED_GAME_RESULTS_DEFAULT_PAGE_SIZE,
  };
  if (
    pagination.kind !== 'offset' ||
    !Number.isSafeInteger(pagination.offset) ||
    pagination.offset < 0 ||
    !Number.isSafeInteger(pagination.limit) ||
    pagination.limit < 1 ||
    pagination.limit > FINALIZED_GAME_RESULTS_MAX_PAGE_SIZE
  ) {
    return {
      valid: false,
      category: 'invalid-input',
      message: `Pagination requires a nonnegative offset and a limit from 1 through ${FINALIZED_GAME_RESULTS_MAX_PAGE_SIZE}.`,
    };
  }

  const ordering = input.ordering ?? FINALIZED_GAME_RESULTS_ORDERING;
  if (
    ordering.field !== 'played-on' ||
    !['asc', 'desc'].includes(ordering.direction) ||
    ordering.tieBreakers.join('|') !== 'created-at|game-id'
  ) {
    return {
      valid: false,
      category: 'invalid-input',
      message:
        'Finalized-game results must use played-on ordering with the registered stable tie-breakers.',
    };
  }

  const selection = normalizeSelectionContext(input.selectionContext);
  if (!selection.valid) return selection;

  return {
    valid: true,
    value: {
      scope: { type: 'group', groupId },
      filters: normalized.state,
      ...(selection.value === undefined
        ? {}
        : { selectionContext: selection.value }),
      pagination,
      ordering,
      warnings: duplicateWarnings(normalized.issues),
    },
  };
}

function validateGetInput(
  input: GetFinalizedGameResultInput,
): ValidationResult<{
  scope: GameAnalyticsScope;
  filters: AnalyticsFilterState;
  selectionContext?: AnalyticsSampleSelectionContext;
}> {
  const gameId = canonicalUuid(input.scope.gameId);
  if (input.scope.type !== 'game' || gameId === null) {
    return {
      valid: false,
      category: 'unsupported-scope',
      message: 'A canonical game scope is required for this operation.',
    };
  }
  const selection = normalizeSelectionContext(input.selectionContext);
  if (!selection.valid) return selection;
  return {
    valid: true,
    value: {
      scope: { type: 'game', gameId },
      filters: createDefaultAnalyticsFilterState(),
      ...(selection.value === undefined
        ? {}
        : { selectionContext: selection.value }),
    },
  };
}

function requiredUuid(value: unknown, field: string): string {
  const parsed = canonicalUuid(value);
  if (parsed === null) throw new Error(`Invalid persisted ${field}`);
  return parsed;
}

function nullableUuid(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requiredUuid(value, field);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid persisted ${field}`);
  }
  return value;
}

function requiredTimestamp(value: unknown, field: string): string {
  const parsed = requiredString(value, field);
  if (Number.isNaN(Date.parse(parsed))) {
    throw new Error(`Invalid persisted ${field}`);
  }
  return parsed;
}

function requiredPositiveInteger(value: unknown, field: string): number {
  const parsed = optionalInteger(value, field);
  if (parsed === null || parsed < 1) {
    throw new Error(`Invalid persisted ${field}`);
  }
  return parsed;
}

function optionalInteger(value: unknown, field: string): number | null {
  if (value === null) return null;
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^-?\d+$/.test(value.trim())
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`Invalid persisted ${field}`);
  }
  return parsed;
}

function optionalBoolean(value: unknown, field: string): boolean | null {
  if (value === null) return null;
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid persisted ${field}`);
  }
  return value;
}

function uniqueMissingFields(
  fields: readonly FinalizedGameSourceMissingField[],
): readonly FinalizedGameSourceMissingField[] {
  return [...new Set(fields)];
}

function mapPlayerRow(row: RawGamePlayerRow): {
  gameId: string;
  player: FinalizedGamePlayerSourceRecord;
} {
  const playerId = nullableUuid(row.player_id, 'game_players.player_id');
  const placement = optionalInteger(row.placement, 'game_players.placement');
  const isWinner = optionalBoolean(row.is_winner, 'game_players.is_winner');
  const totalPoints = optionalInteger(
    row.total_points,
    'game_players.total_points',
  );
  const missingFields: FinalizedGameSourceMissingField[] = [];
  if (playerId === null) missingFields.push('player-id');
  if (placement === null) missingFields.push('placement');
  if (isWinner === null) missingFields.push('winner-status');
  if (totalPoints === null) missingFields.push('total-points');

  return {
    gameId: requiredUuid(row.game_id, 'game_players.game_id'),
    player: {
      gamePlayerId: requiredUuid(row.id, 'game_players.id'),
      playerId,
      placement,
      isWinner,
      totalPoints,
      missingFields,
    },
  };
}

function playerOrder(
  left: FinalizedGamePlayerSourceRecord,
  right: FinalizedGamePlayerSourceRecord,
): number {
  const leftPlacement = left.placement ?? Number.MAX_SAFE_INTEGER;
  const rightPlacement = right.placement ?? Number.MAX_SAFE_INTEGER;
  return (
    leftPlacement - rightPlacement ||
    (left.playerId ?? '').localeCompare(right.playerId ?? '') ||
    left.gamePlayerId.localeCompare(right.gamePlayerId)
  );
}

function mapImportRows(
  rows: readonly RawGameImportRow[],
): ReadonlyMap<string, FinalizedGameSourceProvenance> {
  const importIds = new Set<string>();
  const candidates = rows.map((row) => {
    const importId = requiredUuid(row.id, 'game_log_imports.id');
    if (importIds.has(importId)) {
      throw new Error('Duplicate persisted game_log_imports.id');
    }
    importIds.add(importId);
    return {
      gameId: requiredUuid(row.game_id, 'game_log_imports.game_id'),
      importId,
      importStatus: requiredString(
        row.parse_status,
        'game_log_imports.parse_status',
      ),
      importedAt: requiredTimestamp(
        row.created_at,
        'game_log_imports.created_at',
      ),
    };
  });
  candidates.sort(
    (left, right) =>
      Date.parse(right.importedAt) - Date.parse(left.importedAt) ||
      left.importId.localeCompare(right.importId),
  );

  const provenance = new Map<string, FinalizedGameSourceProvenance>();
  for (const candidate of candidates) {
    if (!provenance.has(candidate.gameId)) {
      provenance.set(candidate.gameId, {
        kind: 'imported',
        importId: candidate.importId,
        importStatus: candidate.importStatus,
        importedAt: candidate.importedAt,
      });
    }
  }
  return provenance;
}

export function mapFinalizedGameSourceRecords(input: {
  games: readonly RawGameRow[];
  players: readonly RawGamePlayerRow[];
  imports: readonly RawGameImportRow[];
}): readonly FinalizedGameSourceRecord[] {
  const normalizedGameIds = input.games.map((row) =>
    requiredUuid(row.id, 'games.id'),
  );
  const gameIds = new Set(normalizedGameIds);
  if (gameIds.size !== normalizedGameIds.length) {
    throw new Error('Duplicate persisted games.id');
  }
  const playersByGame = new Map<string, FinalizedGamePlayerSourceRecord[]>();
  const playerIds = new Set<string>();
  for (const row of input.players) {
    const mapped = mapPlayerRow(row);
    if (!gameIds.has(mapped.gameId)) {
      throw new Error('Unexpected game_players.game_id');
    }
    if (playerIds.has(mapped.player.gamePlayerId)) {
      throw new Error('Duplicate persisted game_players.id');
    }
    playerIds.add(mapped.player.gamePlayerId);
    const current = playersByGame.get(mapped.gameId) ?? [];
    current.push(mapped.player);
    playersByGame.set(mapped.gameId, current);
  }
  const importByGame = mapImportRows(input.imports);
  for (const importedGameId of importByGame.keys()) {
    if (!gameIds.has(importedGameId)) {
      throw new Error('Unexpected game_log_imports.game_id');
    }
  }

  return input.games.map((row, index) => {
    const gameId = normalizedGameIds[index]!;
    const playedOn = requiredString(row.played_on, 'games.played_on');
    if (canonicalIsoDate(playedOn) === null) {
      throw new Error('Invalid persisted games.played_on');
    }
    if (row.status !== 'finalized') {
      throw new Error('Unexpected non-finalized game result');
    }

    const playerCount = requiredPositiveInteger(
      row.player_count,
      'games.player_count',
    );
    const players = [...(playersByGame.get(gameId) ?? [])].sort(playerOrder);
    const missingFields: FinalizedGameSourceMissingField[] = players.flatMap(
      (player) => player.missingFields,
    );
    if (players.length === 0 || players.length !== playerCount) {
      missingFields.push('player-results');
    }
    if (!players.some((player) => player.isWinner === true)) {
      missingFields.push('winner-status');
    }
    const uniqueMissing = uniqueMissingFields(missingFields);

    return {
      gameId,
      groupId: requiredUuid(row.group_id, 'games.group_id'),
      playedOn,
      mapId: nullableUuid(row.map_id, 'games.map_id'),
      playerCount,
      generationCount: requiredPositiveInteger(
        row.generation_count,
        'games.generation_count',
      ),
      status: 'finalized',
      createdAt: requiredTimestamp(row.created_at, 'games.created_at'),
      updatedAt: requiredTimestamp(row.updated_at, 'games.updated_at'),
      players,
      provenance: importByGame.get(gameId) ?? { kind: 'native' },
      completeness: uniqueMissing.length === 0 ? 'complete' : 'partial',
      missingFields: uniqueMissing,
    } satisfies FinalizedGameSourceRecord;
  });
}

function buildQueryMetadata(input: {
  operationId: 'finalized-game-results.list' | 'finalized-game-result.get';
  scope: GroupAnalyticsScope | GameAnalyticsScope;
  filters: AnalyticsFilterState;
  selectionContext?: AnalyticsSampleSelectionContext;
  appliedFilters: readonly AnalyticsFilterKey[];
  ordering: FinalizedGameResultsOrdering;
  pagination:
    | { kind: 'none' }
    | {
        kind: 'offset';
        offset: number;
        limit: number;
        returned: number;
        hasMore: boolean;
      };
}): AnalyticsRepositoryQueryMetadata {
  return {
    operationId: input.operationId,
    scope: input.scope,
    filters: input.filters,
    ...(input.selectionContext === undefined
      ? {}
      : { selectionContext: input.selectionContext }),
    appliedFilters: input.appliedFilters,
    ordering: input.ordering,
    pagination: input.pagination,
    authorizationBoundary: 'current-user-rls',
  };
}

async function loadRelatedRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  gameIds: readonly string[],
  signal: AbortSignal | undefined,
): Promise<{
  players: readonly RawGamePlayerRow[];
  imports: readonly RawGameImportRow[];
  error: unknown | null;
}> {
  let playerQuery = supabase
    .from('game_players')
    .select(GAME_PLAYER_COLUMNS)
    .in('game_id', [...gameIds])
    .order('game_id', { ascending: true })
    .order('placement', { ascending: true })
    .order('player_id', { ascending: true })
    .order('id', { ascending: true });
  let importQuery = supabase
    .from('game_log_imports')
    .select(GAME_IMPORT_COLUMNS)
    .in('game_id', [...gameIds])
    .order('game_id', { ascending: true })
    .order('created_at', { ascending: false })
    .order('id', { ascending: true });
  if (signal !== undefined) {
    playerQuery = playerQuery.abortSignal(signal);
    importQuery = importQuery.abortSignal(signal);
  }

  const [players, imports] = await Promise.all([playerQuery, importQuery]);
  if (players.error !== null) {
    return { players: [], imports: [], error: players.error };
  }
  if (imports.error !== null) {
    return { players: [], imports: [], error: imports.error };
  }
  return {
    players: (players.data ?? []) as unknown as RawGamePlayerRow[],
    imports: (imports.data ?? []) as unknown as RawGameImportRow[],
    error: null,
  };
}

function resultWarnings(
  records: readonly FinalizedGameSourceRecord[],
  warnings: readonly AnalyticsRepositoryWarning[] = [],
): readonly AnalyticsRepositoryWarning[] {
  return [
    ...warnings,
    ...(records.some((record) => record.completeness === 'partial')
      ? [
          {
            code: 'partial-records' as const,
            message:
              'Some finalized games are missing one or more required player-result observations.',
          },
        ]
      : []),
    {
      code: 'unverified-production-population' as const,
      message:
        'Schema and returned rows are verified, but production-wide population coverage has not been audited.',
    },
  ];
}

async function listFinalizedGameResultsInternal(
  input: ListFinalizedGameResultsInput,
): Promise<AnalyticsRepositoryResult<FinalizedGameSourceRecord>> {
  const operationId = 'finalized-game-results.list' as const;
  const validated = validateListInput(input);
  if (!validated.valid) {
    return errorResult(
      operationId,
      input.execution,
      'input-validation',
      validated.category,
      validated.message,
    );
  }
  if (input.execution?.signal?.aborted === true) {
    return sourceFailure(operationId, input.execution, new DOMException('Aborted', 'AbortError'));
  }

  const value = validated.value;
  const supabase = await createSupabaseServerClient();
  let authResult;
  try {
    authResult = await supabase.auth.getUser();
  } catch (cause) {
    return sourceFailure(operationId, input.execution, cause);
  }
  if (authResult.error !== null) {
    return errorResult(
      operationId,
      input.execution,
      'authentication',
      'query-failure',
      'The current user could not be authenticated. Please try again.',
      { cause: authResult.error, retryable: true },
    );
  }
  if (authResult.data.user === null) {
    return errorResult(
      operationId,
      input.execution,
      'authentication',
      'unauthorized',
      'Sign in to load analytics.',
    );
  }

  let membershipQuery = supabase
    .from('group_members')
    .select('group_id')
    .eq('group_id', value.scope.groupId)
    .eq('user_id', authResult.data.user.id);
  if (input.execution?.signal !== undefined) {
    membershipQuery = membershipQuery.abortSignal(input.execution.signal);
  }
  const membership = await membershipQuery.maybeSingle();
  if (membership.error !== null) {
    return sourceFailure(operationId, input.execution, membership.error);
  }
  if (membership.data === null) {
    return errorResult(
      operationId,
      input.execution,
      'authorization',
      'forbidden',
      'This group is not available to the current user.',
    );
  }

  if (value.filters.mapIds.length > 0) {
    let mapQuery = supabase
      .from('maps')
      .select('id')
      .in('id', [...value.filters.mapIds]);
    if (input.execution?.signal !== undefined) {
      mapQuery = mapQuery.abortSignal(input.execution.signal);
    }
    const mapResult = await mapQuery;
    if (mapResult.error !== null) {
      return sourceFailure(operationId, input.execution, mapResult.error);
    }
    const availableMapIds = new Set(
      (mapResult.data ?? []).map((row) => row.id),
    );
    if (value.filters.mapIds.some((mapId) => !availableMapIds.has(mapId))) {
      return errorResult(
        operationId,
        input.execution,
        'identity-validation',
        'stale-identity',
        'One or more selected maps are no longer available.',
      );
    }
  }

  let gameQuery = supabase
    .from('games')
    .select(GAME_COLUMNS)
    .eq('group_id', value.scope.groupId)
    .eq('status', 'finalized');
  if (value.filters.from !== null) {
    gameQuery = gameQuery.gte('played_on', value.filters.from);
  }
  if (value.filters.to !== null) {
    gameQuery = gameQuery.lte('played_on', value.filters.to);
  }
  if (value.filters.mapIds.length > 0) {
    gameQuery = gameQuery.in('map_id', [...value.filters.mapIds]);
  }
  if (value.filters.playerCounts.length > 0) {
    gameQuery = gameQuery.in('player_count', [...value.filters.playerCounts]);
  }
  if (value.filters.generationCounts.length > 0) {
    gameQuery = gameQuery.in('generation_count', [
      ...value.filters.generationCounts,
    ]);
  }
  const ascending = value.ordering.direction === 'asc';
  gameQuery = gameQuery
    .order('played_on', { ascending })
    .order('created_at', { ascending })
    .order('id', { ascending: true })
    .range(
      value.pagination.offset,
      value.pagination.offset + value.pagination.limit,
    );
  if (input.execution?.signal !== undefined) {
    gameQuery = gameQuery.abortSignal(input.execution.signal);
  }
  const gamesResult = await gameQuery;
  if (gamesResult.error !== null) {
    return sourceFailure(operationId, input.execution, gamesResult.error);
  }
  const fetchedGames = (gamesResult.data ?? []) as unknown as RawGameRow[];
  const hasMore = fetchedGames.length > value.pagination.limit;
  const games = fetchedGames.slice(0, value.pagination.limit);
  const query = buildQueryMetadata({
    operationId,
    scope: value.scope,
    filters: value.filters,
    ...(value.selectionContext === undefined
      ? {}
      : { selectionContext: value.selectionContext }),
    appliedFilters: getActiveAnalyticsFilterKeys(value.filters),
    ordering: value.ordering,
    pagination: {
      ...value.pagination,
      returned: games.length,
      hasMore,
    },
  });
  if (games.length === 0) {
    return createAnalyticsRepositoryDataResult({
      query,
      data: {
        records: [],
        coverage: buildFinalizedGameResultsCoverage([]),
        evidence: buildFinalizedGameResultsEvidence([]),
      },
      partial: false,
      warnings: resultWarnings([], value.warnings),
    });
  }

  let gameIds: readonly string[];
  try {
    gameIds = games.map((game) => requiredUuid(game.id, 'games.id'));
  } catch (cause) {
    return errorResult(
      operationId,
      input.execution,
      'mapping',
      'mapping-failure',
      'Persisted analytics data did not match the approved source contract.',
      { cause },
    );
  }
  const related = await loadRelatedRows(
    supabase,
    gameIds,
    input.execution?.signal,
  );
  if (related.error !== null) {
    return sourceFailure(operationId, input.execution, related.error);
  }
  let records: readonly FinalizedGameSourceRecord[];
  try {
    records = mapFinalizedGameSourceRecords({
      games,
      players: related.players,
      imports: related.imports,
    });
  } catch (cause) {
    return errorResult(
      operationId,
      input.execution,
      'mapping',
      'mapping-failure',
      'Persisted analytics data did not match the approved source contract.',
      { cause },
    );
  }
  const coverage = buildFinalizedGameResultsCoverage(records);
  return createAnalyticsRepositoryDataResult({
    query,
    data: {
      records,
      coverage,
      evidence: buildFinalizedGameResultsEvidence(records, coverage),
    },
    partial: records.some((record) => record.completeness === 'partial'),
    warnings: resultWarnings(records, value.warnings),
  });
}

async function getFinalizedGameResultInternal(
  input: GetFinalizedGameResultInput,
): Promise<AnalyticsRepositoryResult<FinalizedGameSourceRecord>> {
  const operationId = 'finalized-game-result.get' as const;
  const validated = validateGetInput(input);
  if (!validated.valid) {
    return errorResult(
      operationId,
      input.execution,
      'input-validation',
      validated.category,
      validated.message,
    );
  }
  if (input.execution?.signal?.aborted === true) {
    return sourceFailure(operationId, input.execution, new DOMException('Aborted', 'AbortError'));
  }

  const supabase = await createSupabaseServerClient();
  let authResult;
  try {
    authResult = await supabase.auth.getUser();
  } catch (cause) {
    return sourceFailure(operationId, input.execution, cause);
  }
  if (authResult.error !== null) {
    return errorResult(
      operationId,
      input.execution,
      'authentication',
      'query-failure',
      'The current user could not be authenticated. Please try again.',
      { cause: authResult.error, retryable: true },
    );
  }
  if (authResult.data.user === null) {
    return errorResult(
      operationId,
      input.execution,
      'authentication',
      'unauthorized',
      'Sign in to load analytics.',
    );
  }

  let gameQuery = supabase
    .from('games')
    .select(GAME_COLUMNS)
    .eq('id', validated.value.scope.gameId)
    .eq('status', 'finalized');
  if (input.execution?.signal !== undefined) {
    gameQuery = gameQuery.abortSignal(input.execution.signal);
  }
  const gameResult = await gameQuery.maybeSingle();
  if (gameResult.error !== null) {
    return sourceFailure(operationId, input.execution, gameResult.error);
  }
  if (gameResult.data === null) {
    return errorResult(
      operationId,
      input.execution,
      'authorization',
      'not-found',
      'The finalized game is unavailable to the current user.',
    );
  }

  const games = [gameResult.data as unknown as RawGameRow];
  const related = await loadRelatedRows(
    supabase,
    [validated.value.scope.gameId],
    input.execution?.signal,
  );
  if (related.error !== null) {
    return sourceFailure(operationId, input.execution, related.error);
  }
  let records: readonly FinalizedGameSourceRecord[];
  try {
    records = mapFinalizedGameSourceRecords({
      games,
      players: related.players,
      imports: related.imports,
    });
  } catch (cause) {
    return errorResult(
      operationId,
      input.execution,
      'mapping',
      'mapping-failure',
      'Persisted analytics data did not match the approved source contract.',
      { cause },
    );
  }
  const coverage = buildFinalizedGameResultsCoverage(records);
  const query = buildQueryMetadata({
    operationId,
    scope: validated.value.scope,
    filters: validated.value.filters,
    ...(validated.value.selectionContext === undefined
      ? {}
      : { selectionContext: validated.value.selectionContext }),
    appliedFilters: [],
    ordering: FINALIZED_GAME_RESULTS_ORDERING,
    pagination: { kind: 'none' },
  });
  return createAnalyticsRepositoryDataResult({
    query,
    data: {
      records,
      coverage,
      evidence: buildFinalizedGameResultsEvidence(records, coverage),
    },
    partial: records.some((record) => record.completeness === 'partial'),
    warnings: resultWarnings(records),
  });
}

export async function listFinalizedGameResults(
  input: ListFinalizedGameResultsInput,
): Promise<AnalyticsRepositoryResult<FinalizedGameSourceRecord>> {
  try {
    return await listFinalizedGameResultsInternal(input);
  } catch (cause) {
    return sourceFailure('finalized-game-results.list', input.execution, cause);
  }
}

export async function getFinalizedGameResult(
  input: GetFinalizedGameResultInput,
): Promise<AnalyticsRepositoryResult<FinalizedGameSourceRecord>> {
  try {
    return await getFinalizedGameResultInternal(input);
  } catch (cause) {
    return sourceFailure('finalized-game-result.get', input.execution, cause);
  }
}
