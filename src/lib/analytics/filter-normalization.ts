/** Pure normalization and compatibility enforcement for analytics URL state. */

import {
  reconcileDashboardSelection,
  type DashboardSelection,
  type DashboardSelectionAvailability,
  type DashboardSelectionDefaults,
} from '@/lib/dashboard';
import {
  analyticsSubjectKey,
  isAnalyticsScoreSourceKey,
  validateAnalyticsSubjectRef,
  type AnalyticsScoreSourceKey,
  type AnalyticsSubjectRef,
} from './subjects';
import type { AnalyticsScope } from './scopes';
import {
  createDefaultAnalyticsFilterState,
  createEmptyAnalyticsSelectionState,
  getAnalyticsFilterScopeCompatibility,
  isAnalyticsGameStatus,
  type AnalyticsFilterKey,
  type AnalyticsFilterState,
  type AnalyticsIdentityResolution,
  type AnalyticsIdentityResolutionInput,
  type AnalyticsIdentityResolver,
  type AnalyticsSelectionState,
  type CorporationPreludeFilterValue,
} from './filters';

export const ANALYTICS_FILTER_ISSUE_CODES = [
  'empty-value',
  'malformed-value',
  'duplicate-value',
  'conflicting-scalar-value',
  'invalid-range-order',
  'unsupported-filter',
  'unavailable-filter',
  'deferred-filter',
  'not-applicable-filter',
  'unsupported-filter-value',
  'unknown-identifier',
  'stale-identifier',
  'authorization-rejected',
  'metadata-unresolved',
  'metadata-loading',
  'metadata-query-error',
  'alias-used',
  'alias-conflict',
] as const;

export type AnalyticsFilterIssueCode =
  (typeof ANALYTICS_FILTER_ISSUE_CODES)[number];

export type AnalyticsFilterIssue = {
  code: AnalyticsFilterIssueCode;
  owner: AnalyticsFilterKey | 'selection';
  message: string;
  parameter?: string;
  rawValue?: string;
};

export type AnalyticsIdentityState = AnalyticsIdentityResolutionInput & {
  resolution: AnalyticsIdentityResolution;
};

export type AnalyticsFilterNormalizationOptions = {
  scope: AnalyticsScope;
  /**
   * Resolves already-loaded entity metadata. Without a resolver, structurally
   * valid stable identities remain usable but are never treated as authorized.
   */
  resolveIdentity?: AnalyticsIdentityResolver;
};

export type AnalyticsFilterNormalizationResult = {
  /** Canonical URL state. Loading/unresolved identities remain restorable. */
  state: AnalyticsFilterState;
  /** Safe query input. Pending identity metadata is withheld until accepted. */
  applicableState: AnalyticsFilterState;
  issues: readonly AnalyticsFilterIssue[];
  identityStates: readonly AnalyticsIdentityState[];
};

export type AnalyticsSelectionNormalizationResult = {
  state: AnalyticsSelectionState;
  applicableState: AnalyticsSelectionState;
  issues: readonly AnalyticsFilterIssue[];
  identityStates: readonly AnalyticsIdentityState[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CANONICAL_CODE_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
const SELECTION_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/;

export function canonicalUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

export function canonicalCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return CANONICAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function canonicalSelectionId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return SELECTION_ID_PATTERN.test(normalized) ? normalized : null;
}

export function canonicalNonnegativeInteger(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function canonicalPositiveInteger(value: unknown): number | null {
  const parsed = canonicalNonnegativeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

export function canonicalPlayerCount(value: unknown): number | null {
  const parsed = canonicalPositiveInteger(value);
  return parsed !== null && parsed <= 5 ? parsed : null;
}

export function canonicalScoreSourceKey(
  value: unknown,
): AnalyticsScoreSourceKey | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return isAnalyticsScoreSourceKey(normalized) ? normalized : null;
}

export function canonicalIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (match === null) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? normalized
    : null;
}

export function serializeCorporationPreludeFilterValue(
  value: CorporationPreludeFilterValue,
): string {
  return `${value.corporationId}~${value.preludeId}`;
}

export function canonicalCorporationPreludeFilterValue(
  value: unknown,
): CorporationPreludeFilterValue | null {
  if (typeof value === 'string') {
    const parts = value.trim().split('~');
    if (parts.length !== 2) return null;
    const corporationId = canonicalUuid(parts[0]);
    const preludeId = canonicalUuid(parts[1]);
    return corporationId === null || preludeId === null
      ? null
      : { corporationId, preludeId };
  }
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<CorporationPreludeFilterValue>;
  const corporationId = canonicalUuid(candidate.corporationId);
  const preludeId = canonicalUuid(candidate.preludeId);
  return corporationId === null || preludeId === null
    ? null
    : { corporationId, preludeId };
}

function malformedIssue(
  owner: AnalyticsFilterKey | 'selection',
  rawValue: unknown,
  message: string,
): AnalyticsFilterIssue {
  return {
    code: 'malformed-value',
    owner,
    message,
    ...(typeof rawValue === 'string' ? { rawValue } : {}),
  };
}

function normalizeScalar<T>(
  owner: AnalyticsFilterKey,
  value: unknown,
  parser: (candidate: unknown) => T | null,
  issues: AnalyticsFilterIssue[],
  message: string,
): T | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parser(value);
  if (parsed === null) issues.push(malformedIssue(owner, value, message));
  return parsed;
}

function normalizeList<T>(
  owner: AnalyticsFilterKey,
  values: readonly unknown[] | undefined,
  parser: (candidate: unknown) => T | null,
  keyOf: (value: T) => string,
  compare: (left: T, right: T) => number,
  issues: AnalyticsFilterIssue[],
  message: string,
): readonly T[] {
  if (values === undefined) return [];
  const byKey = new Map<string, T>();
  for (const value of values) {
    const parsed = parser(value);
    if (parsed === null) {
      issues.push(malformedIssue(owner, value, message));
      continue;
    }
    const key = keyOf(parsed);
    if (byKey.has(key)) {
      issues.push({
        code: 'duplicate-value',
        owner,
        message: `Duplicate ${owner} value "${key}" was discarded.`,
        rawValue: key,
      });
      continue;
    }
    byKey.set(key, parsed);
  }
  return [...byKey.values()].sort(compare);
}

function stringsAscending(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function numbersAscending(left: number, right: number): number {
  return left - right;
}

function pairsAscending(
  left: CorporationPreludeFilterValue,
  right: CorporationPreludeFilterValue,
): number {
  return stringsAscending(
    serializeCorporationPreludeFilterValue(left),
    serializeCorporationPreludeFilterValue(right),
  );
}

function copyFilterState(state: AnalyticsFilterState): AnalyticsFilterState {
  return {
    ...state,
    mapIds: [...state.mapIds],
    playerCounts: [...state.playerCounts],
    generationCounts: [...state.generationCounts],
    gameLengthCodes: [...state.gameLengthCodes],
    expansionCodes: [...state.expansionCodes],
    corporationIds: [...state.corporationIds],
    preludeIds: [...state.preludeIds],
    corporationPreludePairs: state.corporationPreludePairs.map((pair) => ({
      ...pair,
    })),
    cardIds: [...state.cardIds],
    tagCodes: [...state.tagCodes],
    scoreSourceKeys: [...state.scoreSourceKeys],
    styleCodes: [...state.styleCodes],
  };
}

function hasActiveFilterValue(
  state: AnalyticsFilterState,
  key: AnalyticsFilterKey,
): boolean {
  switch (key) {
    case 'player':
      return state.playerId !== null;
    case 'group':
      return state.groupId !== null;
    case 'date-range':
      return state.from !== null || state.to !== null;
    case 'game-range':
    case 'data-source':
      return false;
    case 'map':
      return state.mapIds.length > 0;
    case 'player-count':
      return state.playerCounts.length > 0;
    case 'generation-count':
      return state.generationCounts.length > 0;
    case 'game-length':
      return state.gameLengthCodes.length > 0;
    case 'expansion':
      return state.expansionCodes.length > 0;
    case 'corporation':
      return state.corporationIds.length > 0;
    case 'prelude':
      return state.preludeIds.length > 0;
    case 'corporation-prelude-pairing':
      return state.corporationPreludePairs.length > 0;
    case 'card':
      return state.cardIds.length > 0;
    case 'tag':
      return state.tagCodes.length > 0;
    case 'score-source':
      return state.scoreSourceKeys.length > 0;
    case 'style':
      return state.styleCodes.length > 0;
    case 'game-status':
      return state.status !== 'finalized';
    case 'minimum-sample':
      return state.minSample !== null;
  }
}

function clearFilterValue(
  state: AnalyticsFilterState,
  key: AnalyticsFilterKey,
): void {
  switch (key) {
    case 'player':
      state.playerId = null;
      break;
    case 'group':
      state.groupId = null;
      break;
    case 'date-range':
      state.from = null;
      state.to = null;
      break;
    case 'game-range':
    case 'data-source':
      break;
    case 'map':
      state.mapIds = [];
      break;
    case 'player-count':
      state.playerCounts = [];
      break;
    case 'generation-count':
      state.generationCounts = [];
      break;
    case 'game-length':
      state.gameLengthCodes = [];
      break;
    case 'expansion':
      state.expansionCodes = [];
      break;
    case 'corporation':
      state.corporationIds = [];
      break;
    case 'prelude':
      state.preludeIds = [];
      break;
    case 'corporation-prelude-pairing':
      state.corporationPreludePairs = [];
      break;
    case 'card':
      state.cardIds = [];
      break;
    case 'tag':
      state.tagCodes = [];
      break;
    case 'score-source':
      state.scoreSourceKeys = [];
      break;
    case 'style':
      state.styleCodes = [];
      break;
    case 'game-status':
      state.status = 'finalized';
      break;
    case 'minimum-sample':
      state.minSample = null;
      break;
  }
}

function compatibilityIssueCode(
  status: Exclude<
    ReturnType<typeof getAnalyticsFilterScopeCompatibility>['status'],
    'supported'
  >,
): AnalyticsFilterIssueCode {
  switch (status) {
    case 'unsupported':
      return 'unsupported-filter';
    case 'unavailable':
      return 'unavailable-filter';
    case 'deferred':
      return 'deferred-filter';
    case 'not-applicable':
      return 'not-applicable-filter';
  }
}

function identityIssueCode(
  status: Exclude<
    AnalyticsIdentityResolution['status'],
    'accepted'
  >,
): AnalyticsFilterIssueCode {
  switch (status) {
    case 'unknown':
      return 'unknown-identifier';
    case 'stale':
      return 'stale-identifier';
    case 'authorization-rejected':
      return 'authorization-rejected';
    case 'unresolved':
      return 'metadata-unresolved';
    case 'loading':
      return 'metadata-loading';
    case 'query-error':
      return 'metadata-query-error';
  }
}

function resolveIdentity(
  input: AnalyticsIdentityResolutionInput,
  resolver: AnalyticsIdentityResolver | undefined,
  issues: AnalyticsFilterIssue[],
  states: AnalyticsIdentityState[],
): AnalyticsIdentityResolution['status'] {
  if (resolver === undefined) return 'accepted';
  const resolution = resolver(input);
  states.push({ ...input, resolution });
  if (resolution.status !== 'accepted') {
    issues.push({
      code: identityIssueCode(resolution.status),
      owner: input.owner,
      message:
        resolution.explanation ??
        `Identity "${input.canonicalValue}" has status "${resolution.status}".`,
      rawValue: input.canonicalValue,
    });
  }
  return resolution.status;
}

function keepInCanonicalState(
  status: AnalyticsIdentityResolution['status'],
): boolean {
  return (
    status === 'accepted' ||
    status === 'unresolved' ||
    status === 'loading' ||
    status === 'query-error'
  );
}

function keepInApplicableState(
  status: AnalyticsIdentityResolution['status'],
): boolean {
  return status === 'accepted';
}

function resolveScalarIdentity(
  state: AnalyticsFilterState,
  applicable: AnalyticsFilterState,
  field: 'playerId' | 'groupId',
  input: Omit<AnalyticsIdentityResolutionInput, 'canonicalValue'>,
  resolver: AnalyticsIdentityResolver | undefined,
  issues: AnalyticsFilterIssue[],
  states: AnalyticsIdentityState[],
): void {
  const value = state[field];
  if (value === null) return;
  const status = resolveIdentity(
    { ...input, canonicalValue: value },
    resolver,
    issues,
    states,
  );
  if (!keepInCanonicalState(status)) state[field] = null;
  if (!keepInApplicableState(status)) applicable[field] = null;
}

function resolveStringListIdentity(
  state: AnalyticsFilterState,
  applicable: AnalyticsFilterState,
  field:
    | 'mapIds'
    | 'expansionCodes'
    | 'corporationIds'
    | 'preludeIds'
    | 'cardIds'
    | 'tagCodes'
    | 'styleCodes',
  input: Omit<AnalyticsIdentityResolutionInput, 'canonicalValue'>,
  resolver: AnalyticsIdentityResolver | undefined,
  issues: AnalyticsFilterIssue[],
  states: AnalyticsIdentityState[],
): void {
  const canonical: string[] = [];
  const usable: string[] = [];
  for (const value of state[field]) {
    const status = resolveIdentity(
      { ...input, canonicalValue: value },
      resolver,
      issues,
      states,
    );
    if (keepInCanonicalState(status)) canonical.push(value);
    if (keepInApplicableState(status)) usable.push(value);
  }
  state[field] = canonical;
  applicable[field] = usable;
}

/**
 * Normalizes filter values, applies scope compatibility, and separates
 * URL-restorable identities from identities safe to apply to a query.
 */
export function normalizeAnalyticsFilterState(
  input: Partial<AnalyticsFilterState>,
  options: AnalyticsFilterNormalizationOptions,
): AnalyticsFilterNormalizationResult {
  const issues: AnalyticsFilterIssue[] = [];
  const identityStates: AnalyticsIdentityState[] = [];
  const defaults = createDefaultAnalyticsFilterState();

  const state: AnalyticsFilterState = {
    playerId: normalizeScalar(
      'player',
      input.playerId,
      canonicalUuid,
      issues,
      'Player identity must be a canonical UUID.',
    ),
    groupId: normalizeScalar(
      'group',
      input.groupId,
      canonicalUuid,
      issues,
      'Group identity must be a canonical UUID.',
    ),
    from: normalizeScalar(
      'date-range',
      input.from,
      canonicalIsoDate,
      issues,
      'The from date must be a real ISO YYYY-MM-DD date.',
    ),
    to: normalizeScalar(
      'date-range',
      input.to,
      canonicalIsoDate,
      issues,
      'The to date must be a real ISO YYYY-MM-DD date.',
    ),
    mapIds: normalizeList(
      'map',
      input.mapIds,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      'Map identity must be a canonical UUID.',
    ),
    playerCounts: normalizeList(
      'player-count',
      input.playerCounts,
      canonicalPlayerCount,
      String,
      numbersAscending,
      issues,
      'Player count must be an integer from 1 through 5.',
    ),
    generationCounts: normalizeList(
      'generation-count',
      input.generationCounts,
      canonicalPositiveInteger,
      String,
      numbersAscending,
      issues,
      'Generation count must be a positive safe integer.',
    ),
    gameLengthCodes: normalizeList(
      'game-length',
      input.gameLengthCodes,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      'Game-length identity must be a canonical registered code.',
    ),
    expansionCodes: normalizeList(
      'expansion',
      input.expansionCodes,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      'Expansion identity must be a canonical code.',
    ),
    corporationIds: normalizeList(
      'corporation',
      input.corporationIds,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      'Corporation identity must be a canonical UUID.',
    ),
    preludeIds: normalizeList(
      'prelude',
      input.preludeIds,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      'Prelude identity must be a canonical UUID.',
    ),
    corporationPreludePairs: normalizeList(
      'corporation-prelude-pairing',
      input.corporationPreludePairs,
      canonicalCorporationPreludeFilterValue,
      serializeCorporationPreludeFilterValue,
      pairsAscending,
      issues,
      'Corporation–Prelude identity must contain two canonical UUIDs.',
    ),
    cardIds: normalizeList(
      'card',
      input.cardIds,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      'Card identity must be a canonical catalog UUID.',
    ),
    tagCodes: normalizeList(
      'tag',
      input.tagCodes,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      'Tag identity must be a canonical code, not a display label.',
    ),
    scoreSourceKeys: normalizeList(
      'score-source',
      input.scoreSourceKeys,
      canonicalScoreSourceKey,
      String,
      stringsAscending,
      issues,
      'Score-source identity must be a registered score-source key.',
    ),
    styleCodes: normalizeList(
      'style',
      input.styleCodes,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      'Style identity must be a canonical code, not a display label.',
    ),
    minSample: normalizeScalar(
      'minimum-sample',
      input.minSample,
      canonicalNonnegativeInteger,
      issues,
      'Minimum sample must be a nonnegative safe integer.',
    ),
    status: isAnalyticsGameStatus(input.status)
      ? input.status
      : defaults.status,
  };

  if (input.status !== undefined && !isAnalyticsGameStatus(input.status)) {
    issues.push(
      malformedIssue(
        'game-status',
        String(input.status),
        'Game status must be draft or finalized.',
      ),
    );
  }

  if (state.from !== null && state.to !== null && state.from > state.to) {
    issues.push({
      code: 'invalid-range-order',
      owner: 'date-range',
      message:
        'The from date must not be later than the to date; both bounds were cleared.',
    });
    state.from = null;
    state.to = null;
  }

  for (const key of [
    'player',
    'group',
    'date-range',
    'map',
    'player-count',
    'generation-count',
    'game-length',
    'expansion',
    'corporation',
    'prelude',
    'corporation-prelude-pairing',
    'card',
    'tag',
    'score-source',
    'style',
    'game-status',
    'minimum-sample',
  ] as const satisfies readonly AnalyticsFilterKey[]) {
    if (!hasActiveFilterValue(state, key)) continue;
    const compatibility = getAnalyticsFilterScopeCompatibility(
      key,
      options.scope.type,
    );
    if (compatibility.status === 'supported') continue;
    issues.push({
      code: compatibilityIssueCode(compatibility.status),
      owner: key,
      message: compatibility.reason,
    });
    clearFilterValue(state, key);
  }

  // Aggregate analytics presently support finalized games only. The registered
  // draft value remains available for a future explicitly approved contract.
  if (state.status === 'draft' && options.scope.type !== 'game') {
    issues.push({
      code: 'unsupported-filter-value',
      owner: 'game-status',
      message:
        'Draft games are not an approved aggregate analytics population; status reverted to finalized.',
      rawValue: 'draft',
    });
    state.status = 'finalized';
  }

  const applicableState = copyFilterState(state);

  resolveScalarIdentity(
    state,
    applicableState,
    'playerId',
    { owner: 'player', kind: 'player' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveScalarIdentity(
    state,
    applicableState,
    'groupId',
    { owner: 'group', kind: 'group' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveStringListIdentity(
    state,
    applicableState,
    'mapIds',
    { owner: 'map', kind: 'map' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveStringListIdentity(
    state,
    applicableState,
    'expansionCodes',
    { owner: 'expansion', kind: 'expansion' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveStringListIdentity(
    state,
    applicableState,
    'corporationIds',
    { owner: 'corporation', kind: 'corporation' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveStringListIdentity(
    state,
    applicableState,
    'preludeIds',
    { owner: 'prelude', kind: 'prelude' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveStringListIdentity(
    state,
    applicableState,
    'cardIds',
    { owner: 'card', kind: 'card' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveStringListIdentity(
    state,
    applicableState,
    'tagCodes',
    { owner: 'tag', kind: 'tag' },
    options.resolveIdentity,
    issues,
    identityStates,
  );
  resolveStringListIdentity(
    state,
    applicableState,
    'styleCodes',
    { owner: 'style', kind: 'style' },
    options.resolveIdentity,
    issues,
    identityStates,
  );

  const canonicalPairs: CorporationPreludeFilterValue[] = [];
  const usablePairs: CorporationPreludeFilterValue[] = [];
  for (const pair of state.corporationPreludePairs) {
    const canonicalValue = serializeCorporationPreludeFilterValue(pair);
    const status = resolveIdentity(
      {
        owner: 'corporation-prelude-pairing',
        kind: 'corporation-prelude-pairing',
        canonicalValue,
      },
      options.resolveIdentity,
      issues,
      identityStates,
    );
    if (keepInCanonicalState(status)) canonicalPairs.push(pair);
    if (keepInApplicableState(status)) usablePairs.push(pair);
  }
  state.corporationPreludePairs = canonicalPairs;
  applicableState.corporationPreludePairs = usablePairs;

  return { state, applicableState, issues, identityStates };
}

function normalizeSubjectReference(
  subject: AnalyticsSubjectRef,
): AnalyticsSubjectRef | null {
  switch (subject.kind) {
    case 'player': {
      const playerId = canonicalUuid(subject.playerId);
      return playerId === null ? null : { kind: 'player', playerId };
    }
    case 'group': {
      const groupId = canonicalUuid(subject.groupId);
      return groupId === null ? null : { kind: 'group', groupId };
    }
    case 'game': {
      const gameId = canonicalUuid(subject.gameId);
      return gameId === null ? null : { kind: 'game', gameId };
    }
    case 'corporation': {
      const corporationId = canonicalUuid(subject.corporationId);
      return corporationId === null
        ? null
        : { kind: 'corporation', corporationId };
    }
    case 'prelude': {
      const preludeId = canonicalUuid(subject.preludeId);
      return preludeId === null ? null : { kind: 'prelude', preludeId };
    }
    case 'corporation-prelude-pairing': {
      const corporationId = canonicalUuid(subject.corporationId);
      const preludeId = canonicalUuid(subject.preludeId);
      return corporationId === null || preludeId === null
        ? null
        : { kind: 'corporation-prelude-pairing', corporationId, preludeId };
    }
    case 'card': {
      const cardId = canonicalUuid(subject.cardId);
      return cardId === null ? null : { kind: 'card', cardId };
    }
    case 'tag': {
      const tagCode = canonicalCode(subject.tagCode);
      return tagCode === null ? null : { kind: 'tag', tagCode };
    }
    case 'score-source':
      return isAnalyticsScoreSourceKey(subject.scoreSourceKey)
        ? subject
        : null;
    case 'style': {
      const styleCode = canonicalCode(subject.styleCode);
      return styleCode === null ? null : { kind: 'style', styleCode };
    }
    case 'map': {
      const mapId = canonicalUuid(subject.mapId);
      return mapId === null ? null : { kind: 'map', mapId };
    }
    case 'milestone': {
      const milestoneId = canonicalUuid(subject.milestoneId);
      return milestoneId === null
        ? null
        : { kind: 'milestone', milestoneId };
    }
    case 'award': {
      const awardId = canonicalUuid(subject.awardId);
      return awardId === null ? null : { kind: 'award', awardId };
    }
  }
}

function normalizeSelectionScalar(
  value: unknown,
  issues: AnalyticsFilterIssue[],
  field: 'metric' | 'point' | 'series' | 'detail',
): string | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = canonicalSelectionId(value);
  if (normalized === null) {
    issues.push(
      malformedIssue(
        'selection',
        value,
        `${field} selection must be a registered technical ID, not display text.`,
      ),
    );
  }
  return normalized;
}

/** Normalize durable selection independently of sample filters. */
export function normalizeAnalyticsSelectionState(
  input: Partial<AnalyticsSelectionState>,
  identityResolver?: AnalyticsIdentityResolver,
): AnalyticsSelectionNormalizationResult {
  const issues: AnalyticsFilterIssue[] = [];
  const identityStates: AnalyticsIdentityState[] = [];
  const defaultState = createEmptyAnalyticsSelectionState();
  const canonicalEntities: AnalyticsSubjectRef[] = [];
  const applicableEntities: AnalyticsSubjectRef[] = [];
  const seen = new Set<string>();
  let primaryIdentityRemoved = false;
  let primaryApplicableRemoved = false;

  (input.entities ?? []).forEach((subject, index) => {
    const normalized = normalizeSubjectReference(subject);
    if (
      normalized === null ||
      validateAnalyticsSubjectRef(normalized).length > 0
    ) {
      issues.push(
        malformedIssue(
          'selection',
          JSON.stringify(subject),
          'Comparison/highlight entity must use a canonical stable subject identity.',
        ),
      );
      if (index === 0) {
        primaryIdentityRemoved = true;
        primaryApplicableRemoved = true;
      }
      return;
    }
    const key = analyticsSubjectKey(normalized);
    if (seen.has(key)) {
      issues.push({
        code: 'duplicate-value',
        owner: 'selection',
        message: `Duplicate selected entity "${key}" was discarded.`,
        rawValue: key,
      });
      return;
    }
    seen.add(key);
    const status = resolveIdentity(
      { owner: 'selection', kind: normalized.kind, canonicalValue: key },
      identityResolver,
      issues,
      identityStates,
    );
    if (keepInCanonicalState(status)) canonicalEntities.push(normalized);
    if (keepInApplicableState(status)) applicableEntities.push(normalized);
    if (index === 0 && !keepInCanonicalState(status)) {
      primaryIdentityRemoved = true;
    }
    if (index === 0 && !keepInApplicableState(status)) {
      primaryApplicableRemoved = true;
    }
  });

  canonicalEntities.sort((left, right) =>
    stringsAscending(analyticsSubjectKey(left), analyticsSubjectKey(right)),
  );
  applicableEntities.sort((left, right) =>
    stringsAscending(analyticsSubjectKey(left), analyticsSubjectKey(right)),
  );

  const state: AnalyticsSelectionState = {
    entities: canonicalEntities,
    metricId: normalizeSelectionScalar(
      input.metricId ?? defaultState.metricId,
      issues,
      'metric',
    ),
    pointId: normalizeSelectionScalar(
      input.pointId ?? defaultState.pointId,
      issues,
      'point',
    ),
    seriesId: normalizeSelectionScalar(
      input.seriesId ?? defaultState.seriesId,
      issues,
      'series',
    ),
    detailId: normalizeSelectionScalar(
      input.detailId ?? defaultState.detailId,
      issues,
      'detail',
    ),
  };

  if (primaryIdentityRemoved) {
    state.pointId = null;
    state.seriesId = null;
    state.detailId = null;
  }

  const applicableState: AnalyticsSelectionState = {
    ...state,
    entities: applicableEntities,
  };
  if (primaryApplicableRemoved) {
    applicableState.pointId = null;
    applicableState.seriesId = null;
    applicableState.detailId = null;
  }

  return { state, applicableState, issues, identityStates };
}

/** Maps the durable analytics selection onto the Phase 1 coordination model. */
export function analyticsSelectionToDashboardSelection(
  selection: AnalyticsSelectionState,
): DashboardSelection {
  return {
    selectedEntityId:
      selection.entities[0] === undefined
        ? null
        : analyticsSubjectKey(selection.entities[0]),
    selectedMetricId: selection.metricId,
    selectedDataPointId: selection.pointId,
    hoveredDataPointId: null,
    activeTableRowId: selection.pointId,
    activeLegendItemId: selection.seriesId,
    openDetailItemId: selection.detailId,
  };
}

export type AnalyticsSelectionAvailability = Omit<
  DashboardSelectionAvailability,
  'entityIds'
> & {
  entities?: readonly AnalyticsSubjectRef[];
};

export type AnalyticsSelectionDefaults = Partial<AnalyticsSelectionState>;

/**
 * Applies Phase 1 availability reconciliation after filter changes. Compatible
 * entity/metric/point/series/detail selections survive; stale dependent state
 * is cleared deterministically, preventing URL/render synchronization loops.
 */
export function reconcileAnalyticsSelectionState(
  selection: AnalyticsSelectionState,
  availability: AnalyticsSelectionAvailability,
  defaults: AnalyticsSelectionDefaults = {},
): AnalyticsSelectionState {
  const knownSubjects = new Map<string, AnalyticsSubjectRef>();
  for (const subject of [
    ...selection.entities,
    ...(defaults.entities ?? []),
    ...(availability.entities ?? []),
  ]) {
    knownSubjects.set(analyticsSubjectKey(subject), subject);
  }

  const dashboardAvailability: DashboardSelectionAvailability = {
    ...availability,
    ...(availability.entities === undefined
      ? {}
      : { entityIds: availability.entities.map(analyticsSubjectKey) }),
  };
  const defaultEntity = defaults.entities?.[0];
  const dashboardDefaults: DashboardSelectionDefaults = {
    ...(defaultEntity === undefined
      ? {}
      : { selectedEntityId: analyticsSubjectKey(defaultEntity) }),
    ...(defaults.metricId === undefined
      ? {}
      : { selectedMetricId: defaults.metricId }),
    ...(defaults.pointId === undefined
      ? {}
      : {
          selectedDataPointId: defaults.pointId,
          activeTableRowId: defaults.pointId,
        }),
    ...(defaults.seriesId === undefined
      ? {}
      : { activeLegendItemId: defaults.seriesId }),
    ...(defaults.detailId === undefined
      ? {}
      : { openDetailItemId: defaults.detailId }),
  };
  const reconciled = reconcileDashboardSelection(
    analyticsSelectionToDashboardSelection(selection),
    dashboardAvailability,
    dashboardDefaults,
  );

  const primaryKey = reconciled.selectedEntityId;
  let entities: AnalyticsSubjectRef[] = [];
  if (primaryKey !== null) {
    const primary = knownSubjects.get(primaryKey);
    if (primary !== undefined) {
      const availableKeys =
        availability.entities === undefined
          ? null
          : new Set(availability.entities.map(analyticsSubjectKey));
      const secondary = selection.entities.filter((subject, index) => {
        const key = analyticsSubjectKey(subject);
        return (
          index > 0 &&
          key !== primaryKey &&
          (availableKeys === null || availableKeys.has(key))
        );
      });
      entities = [primary, ...secondary];
    }
  }

  return {
    entities,
    metricId: reconciled.selectedMetricId,
    pointId: reconciled.selectedDataPointId,
    seriesId: reconciled.activeLegendItemId,
    detailId: reconciled.openDetailItemId,
  };
}
