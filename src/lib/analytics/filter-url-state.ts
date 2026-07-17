/** Canonical URL parsing and serialization for analytics filter/view state. */

import {
  analyticsSubjectKey,
  isAnalyticsScoreSourceKey,
  type AnalyticsSubjectRef,
} from './subjects';
import type { AnalyticsScope } from './scopes';
import {
  ANALYTICS_FILTER_QUERY_PARAMETER_ORDER,
  ANALYTICS_FILTER_REGISTRY,
  ANALYTICS_QUERY_PARAMETER_ORDER,
  ANALYTICS_SELECTION_QUERY_PARAMETER_ORDER,
  createDefaultAnalyticsFilterState,
  createEmptyAnalyticsSelectionState,
  getAnalyticsFilterDefinition,
  isAnalyticsGameStatus,
  type AnalyticsCanonicalQueryParameter,
  type AnalyticsFilterKey,
  type AnalyticsFilterState,
  type AnalyticsIdentityResolver,
  type AnalyticsSelectionQueryParameter,
  type AnalyticsSelectionState,
  type AnalyticsUrlAddressableState,
} from './filters';
import {
  analyticsSelectionToDashboardSelection,
  canonicalCode,
  canonicalCorporationPreludeFilterValue,
  canonicalIsoDate,
  canonicalNonnegativeInteger,
  canonicalPlayerCount,
  canonicalPositiveInteger,
  canonicalSelectionId,
  canonicalUuid,
  normalizeAnalyticsFilterState,
  normalizeAnalyticsSelectionState,
  serializeCorporationPreludeFilterValue,
  type AnalyticsFilterIssue,
  type AnalyticsIdentityState,
} from './filter-normalization';

export const ANALYTICS_PROHIBITED_QUERY_PARAMETERS = [
  'access_token',
  'refresh_token',
  'token',
  'apikey',
  'authorization',
  'error',
  'error_code',
  'error_description',
  'queryError',
] as const;

export type AnalyticsUrlAliasMap = Partial<
  Record<AnalyticsCanonicalQueryParameter, readonly string[]>
>;

export const ANALYTICS_URL_INPUT_STATES = [
  'omitted-default',
  'explicit-empty',
  'accepted',
  'rejected',
] as const;

export type AnalyticsUrlInputStatus =
  (typeof ANALYTICS_URL_INPUT_STATES)[number];

/**
 * Raw-input provenance preserves the distinction between omitted defaults,
 * explicit empty selections, accepted values, and rejected serialized input.
 */
export type AnalyticsUrlInputState = {
  status: AnalyticsUrlInputStatus;
  sourceParameter: string;
  rawValues: readonly string[];
  canonicalValues: readonly string[];
};

export type AnalyticsUrlParseResult = {
  state: AnalyticsUrlAddressableState;
  inputStates: Readonly<
    Record<AnalyticsCanonicalQueryParameter, AnalyticsUrlInputState>
  >;
  issues: readonly AnalyticsFilterIssue[];
};

export type AnalyticsUrlNormalizationOptions = {
  scope: AnalyticsScope;
  resolveIdentity?: AnalyticsIdentityResolver;
};

export type AnalyticsUrlNormalizationResult = {
  state: AnalyticsUrlAddressableState;
  applicableState: AnalyticsUrlAddressableState;
  inputStates: AnalyticsUrlParseResult['inputStates'];
  issues: readonly AnalyticsFilterIssue[];
  identityStates: readonly AnalyticsIdentityState[];
};

export type AnalyticsUrlSerializationOptions = AnalyticsUrlNormalizationOptions & {
  aliases?: AnalyticsUrlAliasMap;
};

export type AnalyticsUrlSerializationResult = {
  searchParams: URLSearchParams;
  normalizedState: AnalyticsUrlAddressableState;
  issues: readonly AnalyticsFilterIssue[];
  identityStates: readonly AnalyticsIdentityState[];
};

type RawParameterRead = {
  sourceParameter: string;
  values: readonly string[];
};

function assertValidAliasMap(aliases: AnalyticsUrlAliasMap | undefined): void {
  if (aliases === undefined) return;
  const canonicalNames = new Set<string>(ANALYTICS_QUERY_PARAMETER_ORDER);
  const claimed = new Map<string, AnalyticsCanonicalQueryParameter>();

  for (const canonical of ANALYTICS_QUERY_PARAMETER_ORDER) {
    for (const alias of aliases[canonical] ?? []) {
      if (alias.trim() === '') {
        throw new Error('Analytics URL aliases must not be blank');
      }
      if (canonicalNames.has(alias)) {
        throw new Error(
          `Analytics URL alias "${alias}" conflicts with a canonical parameter`,
        );
      }
      const prior = claimed.get(alias);
      if (prior !== undefined && prior !== canonical) {
        throw new Error(
          `Analytics URL alias "${alias}" is assigned to both "${prior}" and "${canonical}"`,
        );
      }
      claimed.set(alias, canonical);
    }
  }
}

function ownerForParameter(
  parameter: AnalyticsCanonicalQueryParameter,
): AnalyticsFilterKey | 'selection' {
  switch (parameter) {
    case 'player':
      return 'player';
    case 'group':
      return 'group';
    case 'from':
    case 'to':
      return 'date-range';
    case 'map':
      return 'map';
    case 'playerCount':
      return 'player-count';
    case 'generationCount':
      return 'generation-count';
    case 'gameLength':
      return 'game-length';
    case 'expansion':
      return 'expansion';
    case 'corporation':
      return 'corporation';
    case 'prelude':
      return 'prelude';
    case 'corporationPrelude':
      return 'corporation-prelude-pairing';
    case 'card':
      return 'card';
    case 'tag':
      return 'tag';
    case 'scoreSource':
      return 'score-source';
    case 'style':
      return 'style';
    case 'status':
      return 'game-status';
    case 'minSample':
      return 'minimum-sample';
    case 'entity':
    case 'metric':
    case 'point':
    case 'series':
    case 'detail':
      return 'selection';
  }
}

function readParameter(
  searchParams: URLSearchParams,
  parameter: AnalyticsCanonicalQueryParameter,
  aliases: AnalyticsUrlAliasMap | undefined,
  issues: AnalyticsFilterIssue[],
): RawParameterRead {
  const canonicalValues = searchParams.getAll(parameter);
  const populatedAliases = (aliases?.[parameter] ?? []).filter((alias) =>
    searchParams.has(alias),
  );

  if (canonicalValues.length > 0) {
    if (populatedAliases.length > 0) {
      issues.push({
        code: 'alias-conflict',
        owner: ownerForParameter(parameter),
        parameter,
        message: `Canonical parameter "${parameter}" takes precedence over alias parameter(s): ${populatedAliases.join(', ')}.`,
      });
    }
    return { sourceParameter: parameter, values: canonicalValues };
  }

  const selectedAlias = populatedAliases[0];
  if (selectedAlias === undefined) {
    return { sourceParameter: parameter, values: [] };
  }
  issues.push({
    code: 'alias-used',
    owner: ownerForParameter(parameter),
    parameter: selectedAlias,
    message: `Legacy alias "${selectedAlias}" was accepted and will serialize as "${parameter}".`,
  });
  if (populatedAliases.length > 1) {
    issues.push({
      code: 'alias-conflict',
      owner: ownerForParameter(parameter),
      parameter: selectedAlias,
      message: `Only the first configured alias for "${parameter}" was used; additional aliases were discarded.`,
    });
  }
  return {
    sourceParameter: selectedAlias,
    values: searchParams.getAll(selectedAlias),
  };
}

function createInputStates(): Record<
  AnalyticsCanonicalQueryParameter,
  AnalyticsUrlInputState
> {
  return Object.fromEntries(
    ANALYTICS_QUERY_PARAMETER_ORDER.map((parameter) => [
      parameter,
      {
        status: 'omitted-default',
        sourceParameter: parameter,
        rawValues: [],
        canonicalValues: [],
      },
    ]),
  ) as unknown as Record<
    AnalyticsCanonicalQueryParameter,
    AnalyticsUrlInputState
  >;
}

function setInputState(
  states: Record<AnalyticsCanonicalQueryParameter, AnalyticsUrlInputState>,
  parameter: AnalyticsCanonicalQueryParameter,
  read: RawParameterRead,
  canonicalValues: readonly string[],
): void {
  const allEmpty =
    read.values.length > 0 && read.values.every((value) => value.trim() === '');
  states[parameter] = {
    status:
      read.values.length === 0
        ? 'omitted-default'
        : allEmpty
          ? 'explicit-empty'
          : canonicalValues.length > 0
            ? 'accepted'
            : 'rejected',
    sourceParameter: read.sourceParameter,
    rawValues: [...read.values],
    canonicalValues: [...canonicalValues],
  };
}

function parseScalar<T>(
  parameter: AnalyticsCanonicalQueryParameter,
  read: RawParameterRead,
  parser: (value: string) => T | null,
  serialize: (value: T) => string,
  issues: AnalyticsFilterIssue[],
  inputStates: Record<
    AnalyticsCanonicalQueryParameter,
    AnalyticsUrlInputState
  >,
  malformedMessage: string,
): T | null {
  let selected: T | null = null;
  let selectedKey: string | null = null;
  const accepted: string[] = [];

  for (const rawValue of read.values) {
    if (rawValue.trim() === '') {
      issues.push({
        code: 'empty-value',
        owner: ownerForParameter(parameter),
        parameter: read.sourceParameter,
        rawValue,
        message: `Empty "${read.sourceParameter}" input applies the default and is omitted from the canonical URL.`,
      });
      continue;
    }
    const parsed = parser(rawValue);
    if (parsed === null) {
      issues.push({
        code: 'malformed-value',
        owner: ownerForParameter(parameter),
        parameter: read.sourceParameter,
        rawValue,
        message: malformedMessage,
      });
      continue;
    }
    const key = serialize(parsed);
    accepted.push(key);
    if (selected === null) {
      selected = parsed;
      selectedKey = key;
      continue;
    }
    issues.push({
      code: key === selectedKey ? 'duplicate-value' : 'conflicting-scalar-value',
      owner: ownerForParameter(parameter),
      parameter: read.sourceParameter,
      rawValue,
      message:
        key === selectedKey
          ? `Duplicate scalar value "${key}" was discarded.`
          : `Conflicting scalar value "${key}" was discarded; the first valid value "${selectedKey}" wins.`,
    });
  }

  setInputState(inputStates, parameter, read, accepted);
  return selected;
}

function parseMulti<T>(
  parameter: AnalyticsCanonicalQueryParameter,
  read: RawParameterRead,
  parser: (value: string) => T | null,
  serialize: (value: T) => string,
  compare: (left: T, right: T) => number,
  issues: AnalyticsFilterIssue[],
  inputStates: Record<
    AnalyticsCanonicalQueryParameter,
    AnalyticsUrlInputState
  >,
  malformedMessage: string,
): readonly T[] {
  const byKey = new Map<string, T>();
  const accepted: string[] = [];

  for (const rawValue of read.values) {
    if (rawValue.trim() === '') {
      issues.push({
        code: 'empty-value',
        owner: ownerForParameter(parameter),
        parameter: read.sourceParameter,
        rawValue,
        message: `Empty "${read.sourceParameter}" input means no restriction and is omitted from the canonical URL.`,
      });
      continue;
    }
    const parsed = parser(rawValue);
    if (parsed === null) {
      issues.push({
        code: 'malformed-value',
        owner: ownerForParameter(parameter),
        parameter: read.sourceParameter,
        rawValue,
        message: malformedMessage,
      });
      continue;
    }
    const key = serialize(parsed);
    accepted.push(key);
    if (byKey.has(key)) {
      issues.push({
        code: 'duplicate-value',
        owner: ownerForParameter(parameter),
        parameter: read.sourceParameter,
        rawValue,
        message: `Duplicate repeated value "${key}" was discarded.`,
      });
      continue;
    }
    byKey.set(key, parsed);
  }

  setInputState(inputStates, parameter, read, accepted);
  return [...byKey.values()].sort(compare);
}

function stringsAscending(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function numbersAscending(left: number, right: number): number {
  return left - right;
}

function parseSubjectToken(value: string): AnalyticsSubjectRef | null {
  const parts = value.trim().split(':');
  const kind = parts[0];

  switch (kind) {
    case 'player': {
      const playerId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return playerId === null ? null : { kind, playerId };
    }
    case 'group': {
      const groupId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return groupId === null ? null : { kind, groupId };
    }
    case 'game': {
      const gameId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return gameId === null ? null : { kind, gameId };
    }
    case 'corporation': {
      const corporationId =
        parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return corporationId === null ? null : { kind, corporationId };
    }
    case 'prelude': {
      const preludeId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return preludeId === null ? null : { kind, preludeId };
    }
    case 'corporation-prelude-pairing': {
      const corporationId =
        parts.length === 3 ? canonicalUuid(parts[1]) : null;
      const preludeId = parts.length === 3 ? canonicalUuid(parts[2]) : null;
      return corporationId === null || preludeId === null
        ? null
        : { kind, corporationId, preludeId };
    }
    case 'card': {
      const cardId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return cardId === null ? null : { kind, cardId };
    }
    case 'tag': {
      const tagCode = parts.length === 2 ? canonicalCode(parts[1]) : null;
      return tagCode === null ? null : { kind, tagCode };
    }
    case 'score-source': {
      const scoreSourceKey = parts.length === 2 ? parts[1] : null;
      return scoreSourceKey !== null &&
        isAnalyticsScoreSourceKey(scoreSourceKey)
        ? { kind, scoreSourceKey }
        : null;
    }
    case 'style': {
      const styleCode = parts.length === 2 ? canonicalCode(parts[1]) : null;
      return styleCode === null ? null : { kind, styleCode };
    }
    case 'map': {
      const mapId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return mapId === null ? null : { kind, mapId };
    }
    case 'milestone': {
      const milestoneId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return milestoneId === null ? null : { kind, milestoneId };
    }
    case 'award': {
      const awardId = parts.length === 2 ? canonicalUuid(parts[1]) : null;
      return awardId === null ? null : { kind, awardId };
    }
    default:
      return null;
  }
}

export function serializeAnalyticsSubjectToken(
  subject: AnalyticsSubjectRef,
): string {
  return analyticsSubjectKey(subject);
}

/**
 * Structural parser only. Scope compatibility and loaded-identity resolution
 * are intentionally handled by {@link normalizeAnalyticsUrlState}.
 */
export function parseAnalyticsUrlState(
  searchParams: URLSearchParams,
  options: { aliases?: AnalyticsUrlAliasMap } = {},
): AnalyticsUrlParseResult {
  assertValidAliasMap(options.aliases);
  const issues: AnalyticsFilterIssue[] = [];
  const inputStates = createInputStates();
  const reads = Object.fromEntries(
    ANALYTICS_QUERY_PARAMETER_ORDER.map((parameter) => [
      parameter,
      readParameter(searchParams, parameter, options.aliases, issues),
    ]),
  ) as Record<AnalyticsCanonicalQueryParameter, RawParameterRead>;

  const filters: AnalyticsFilterState = {
    ...createDefaultAnalyticsFilterState(),
    playerId: parseScalar(
      'player',
      reads.player,
      canonicalUuid,
      String,
      issues,
      inputStates,
      'Player must be a canonical UUID, not a display label.',
    ),
    groupId: parseScalar(
      'group',
      reads.group,
      canonicalUuid,
      String,
      issues,
      inputStates,
      'Group must be a canonical UUID, not a display label.',
    ),
    from: parseScalar(
      'from',
      reads.from,
      canonicalIsoDate,
      String,
      issues,
      inputStates,
      'from must be a real ISO YYYY-MM-DD date.',
    ),
    to: parseScalar(
      'to',
      reads.to,
      canonicalIsoDate,
      String,
      issues,
      inputStates,
      'to must be a real ISO YYYY-MM-DD date.',
    ),
    mapIds: parseMulti(
      'map',
      reads.map,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      inputStates,
      'map values must be canonical UUIDs, not names.',
    ),
    playerCounts: parseMulti(
      'playerCount',
      reads.playerCount,
      canonicalPlayerCount,
      String,
      numbersAscending,
      issues,
      inputStates,
      'playerCount values must be integers from 1 through 5.',
    ),
    generationCounts: parseMulti(
      'generationCount',
      reads.generationCount,
      canonicalPositiveInteger,
      String,
      numbersAscending,
      issues,
      inputStates,
      'generationCount values must be positive safe integers.',
    ),
    gameLengthCodes: parseMulti(
      'gameLength',
      reads.gameLength,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      inputStates,
      'gameLength values must be canonical registered codes.',
    ),
    expansionCodes: parseMulti(
      'expansion',
      reads.expansion,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      inputStates,
      'expansion values must be canonical codes.',
    ),
    corporationIds: parseMulti(
      'corporation',
      reads.corporation,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      inputStates,
      'corporation values must be canonical UUIDs, not names or logo paths.',
    ),
    preludeIds: parseMulti(
      'prelude',
      reads.prelude,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      inputStates,
      'prelude values must be canonical UUIDs, not names.',
    ),
    corporationPreludePairs: parseMulti(
      'corporationPrelude',
      reads.corporationPrelude,
      canonicalCorporationPreludeFilterValue,
      serializeCorporationPreludeFilterValue,
      (left, right) =>
        stringsAscending(
          serializeCorporationPreludeFilterValue(left),
          serializeCorporationPreludeFilterValue(right),
        ),
      issues,
      inputStates,
      'corporationPrelude values must contain a corporation UUID and Prelude UUID separated by ~.',
    ),
    cardIds: parseMulti(
      'card',
      reads.card,
      canonicalUuid,
      String,
      stringsAscending,
      issues,
      inputStates,
      'card values must be canonical catalog UUIDs, not card names.',
    ),
    tagCodes: parseMulti(
      'tag',
      reads.tag,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      inputStates,
      'tag values must be canonical codes, not translated labels.',
    ),
    scoreSourceKeys: parseMulti(
      'scoreSource',
      reads.scoreSource,
      (value) => {
        const normalized = value.trim().toLowerCase();
        return isAnalyticsScoreSourceKey(normalized) ? normalized : null;
      },
      String,
      stringsAscending,
      issues,
      inputStates,
      'scoreSource values must be registered score-source keys.',
    ),
    styleCodes: parseMulti(
      'style',
      reads.style,
      canonicalCode,
      String,
      stringsAscending,
      issues,
      inputStates,
      'style values must be canonical codes, not labels.',
    ),
    status:
      parseScalar(
        'status',
        reads.status,
        (value) => {
          const normalized = value.trim().toLowerCase();
          return isAnalyticsGameStatus(normalized) ? normalized : null;
        },
        String,
        issues,
        inputStates,
        'status must be draft or finalized.',
      ) ?? 'finalized',
    minSample: parseScalar(
      'minSample',
      reads.minSample,
      canonicalNonnegativeInteger,
      String,
      issues,
      inputStates,
      'minSample must be a nonnegative safe integer.',
    ),
  };

  const selection: AnalyticsSelectionState = {
    ...createEmptyAnalyticsSelectionState(),
    entities: parseMulti(
      'entity',
      reads.entity,
      parseSubjectToken,
      serializeAnalyticsSubjectToken,
      (left, right) =>
        stringsAscending(
          serializeAnalyticsSubjectToken(left),
          serializeAnalyticsSubjectToken(right),
        ),
      issues,
      inputStates,
      'entity must be a typed stable subject token, not a display label.',
    ),
    metricId: parseScalar(
      'metric',
      reads.metric,
      canonicalSelectionId,
      String,
      issues,
      inputStates,
      'metric must be a registered technical ID, not display text.',
    ),
    pointId: parseScalar(
      'point',
      reads.point,
      canonicalSelectionId,
      String,
      issues,
      inputStates,
      'point must be a registered technical ID, not display text.',
    ),
    seriesId: parseScalar(
      'series',
      reads.series,
      canonicalSelectionId,
      String,
      issues,
      inputStates,
      'series must be a registered technical ID, not display text.',
    ),
    detailId: parseScalar(
      'detail',
      reads.detail,
      canonicalSelectionId,
      String,
      issues,
      inputStates,
      'detail must be a registered technical ID, not display text.',
    ),
  };

  return { state: { filters, selection }, inputStates, issues };
}

export function normalizeAnalyticsUrlState(
  parsed: AnalyticsUrlParseResult,
  options: AnalyticsUrlNormalizationOptions,
): AnalyticsUrlNormalizationResult {
  const filters = normalizeAnalyticsFilterState(parsed.state.filters, options);
  const selection = normalizeAnalyticsSelectionState(
    parsed.state.selection,
    options.resolveIdentity,
  );
  return {
    state: { filters: filters.state, selection: selection.state },
    applicableState: {
      filters: filters.applicableState,
      selection: selection.applicableState,
    },
    inputStates: parsed.inputStates,
    issues: [...parsed.issues, ...filters.issues, ...selection.issues],
    identityStates: [
      ...filters.identityStates,
      ...selection.identityStates,
    ],
  };
}

export function parseAndNormalizeAnalyticsUrlState(
  searchParams: URLSearchParams,
  options: AnalyticsUrlSerializationOptions,
): AnalyticsUrlNormalizationResult {
  return normalizeAnalyticsUrlState(
    parseAnalyticsUrlState(searchParams, { aliases: options.aliases }),
    options,
  );
}

function allKnownParameterNames(
  aliases: AnalyticsUrlAliasMap | undefined,
): readonly string[] {
  return [
    ...ANALYTICS_QUERY_PARAMETER_ORDER,
    ...ANALYTICS_QUERY_PARAMETER_ORDER.flatMap(
      (parameter) => aliases?.[parameter] ?? [],
    ),
    ...ANALYTICS_PROHIBITED_QUERY_PARAMETERS,
  ];
}

function clearKnownParameters(
  searchParams: URLSearchParams,
  aliases: AnalyticsUrlAliasMap | undefined,
): void {
  for (const parameter of allKnownParameterNames(aliases)) {
    searchParams.delete(parameter);
  }
}

function appendRepeated(
  searchParams: URLSearchParams,
  parameter: string,
  values: readonly (string | number)[],
): void {
  for (const value of values) searchParams.append(parameter, String(value));
}

function writeNormalizedAnalyticsState(
  state: AnalyticsUrlAddressableState,
  current: URLSearchParams,
  aliases: AnalyticsUrlAliasMap | undefined,
): URLSearchParams {
  const next = new URLSearchParams(current);
  clearKnownParameters(next, aliases);
  const { filters, selection } = state;

  if (filters.playerId !== null) next.append('player', filters.playerId);
  if (filters.groupId !== null) next.append('group', filters.groupId);
  if (filters.from !== null) next.append('from', filters.from);
  if (filters.to !== null) next.append('to', filters.to);
  appendRepeated(next, 'map', filters.mapIds);
  appendRepeated(next, 'playerCount', filters.playerCounts);
  appendRepeated(next, 'generationCount', filters.generationCounts);
  appendRepeated(next, 'gameLength', filters.gameLengthCodes);
  appendRepeated(next, 'expansion', filters.expansionCodes);
  appendRepeated(next, 'corporation', filters.corporationIds);
  appendRepeated(next, 'prelude', filters.preludeIds);
  appendRepeated(
    next,
    'corporationPrelude',
    filters.corporationPreludePairs.map(
      serializeCorporationPreludeFilterValue,
    ),
  );
  appendRepeated(next, 'card', filters.cardIds);
  appendRepeated(next, 'tag', filters.tagCodes);
  appendRepeated(next, 'scoreSource', filters.scoreSourceKeys);
  appendRepeated(next, 'style', filters.styleCodes);
  if (filters.status !== 'finalized') next.append('status', filters.status);
  if (filters.minSample !== null) {
    next.append('minSample', String(filters.minSample));
  }
  appendRepeated(
    next,
    'entity',
    selection.entities.map(serializeAnalyticsSubjectToken),
  );
  if (selection.metricId !== null) next.append('metric', selection.metricId);
  if (selection.pointId !== null) next.append('point', selection.pointId);
  if (selection.seriesId !== null) next.append('series', selection.seriesId);
  if (selection.detailId !== null) next.append('detail', selection.detailId);

  return next;
}

/**
 * Normalizes then serializes canonical analytics fields in registry order.
 * Default values are omitted, explicit zero is retained, configured aliases
 * are removed, known secret/error parameters are stripped, and unrelated
 * query parameters retain their existing relative order.
 */
export function serializeAnalyticsUrlState(
  state: AnalyticsUrlAddressableState,
  current: URLSearchParams = new URLSearchParams(),
  options: AnalyticsUrlSerializationOptions,
): AnalyticsUrlSerializationResult {
  assertValidAliasMap(options.aliases);
  const filters = normalizeAnalyticsFilterState(state.filters, options);
  const selection = normalizeAnalyticsSelectionState(
    state.selection,
    options.resolveIdentity,
  );
  const normalizedState = {
    filters: filters.state,
    selection: selection.state,
  };
  return {
    searchParams: writeNormalizedAnalyticsState(
      normalizedState,
      current,
      options.aliases,
    ),
    normalizedState,
    issues: [...filters.issues, ...selection.issues],
    identityStates: [
      ...filters.identityStates,
      ...selection.identityStates,
    ],
  };
}

/** Removes every canonical/alias analytics field while preserving unrelated state. */
export function resetAnalyticsUrlState(
  current: URLSearchParams,
  options: { aliases?: AnalyticsUrlAliasMap } = {},
): URLSearchParams {
  assertValidAliasMap(options.aliases);
  const next = new URLSearchParams(current);
  clearKnownParameters(next, options.aliases);
  return next;
}

export type AnalyticsUrlResetTarget =
  | AnalyticsFilterKey
  | AnalyticsSelectionQueryParameter;

function parametersForResetTarget(
  target: AnalyticsUrlResetTarget,
): readonly AnalyticsCanonicalQueryParameter[] {
  if (
    (ANALYTICS_SELECTION_QUERY_PARAMETER_ORDER as readonly string[]).includes(
      target,
    )
  ) {
    return [target as AnalyticsSelectionQueryParameter];
  }
  return getAnalyticsFilterDefinition(target as AnalyticsFilterKey)
    .queryParameters as readonly AnalyticsCanonicalQueryParameter[];
}

/** Removes only selected filter/selection fields and their explicit aliases. */
export function partiallyResetAnalyticsUrlState(
  current: URLSearchParams,
  targets: readonly AnalyticsUrlResetTarget[],
  options: { aliases?: AnalyticsUrlAliasMap } = {},
): URLSearchParams {
  assertValidAliasMap(options.aliases);
  const next = new URLSearchParams(current);
  for (const target of targets) {
    for (const parameter of parametersForResetTarget(target)) {
      next.delete(parameter);
      for (const alias of options.aliases?.[parameter] ?? []) {
        next.delete(alias);
      }
    }
  }
  for (const prohibited of ANALYTICS_PROHIBITED_QUERY_PARAMETERS) {
    next.delete(prohibited);
  }
  return next;
}

/**
 * Parses, normalizes, and re-serializes in one explicit canonicalization step.
 * Useful at route boundaries; no router mutation occurs inside this function.
 */
export function canonicalizeAnalyticsUrlState(
  current: URLSearchParams,
  options: AnalyticsUrlSerializationOptions,
): AnalyticsUrlSerializationResult & {
  inputStates: AnalyticsUrlParseResult['inputStates'];
} {
  const normalized = parseAndNormalizeAnalyticsUrlState(current, options);
  return {
    searchParams: writeNormalizedAnalyticsState(
      normalized.state,
      current,
      options.aliases,
    ),
    normalizedState: normalized.state,
    inputStates: normalized.inputStates,
    issues: normalized.issues,
    identityStates: normalized.identityStates,
  };
}

/** Compile-time proof that semantic evidence focus has one URL field. */
export function analyticsSelectionUsesSinglePointField(
  selection: AnalyticsSelectionState,
): boolean {
  const dashboard = analyticsSelectionToDashboardSelection(selection);
  return dashboard.selectedDataPointId === dashboard.activeTableRowId;
}

/** Registry-order proof used by tests and documentation. */
export function registeredFilterParameterOrderMatchesRegistry(): boolean {
  const registryParameters = ANALYTICS_FILTER_REGISTRY.flatMap(
    (definition) => definition.queryParameters,
  );
  return (
    registryParameters.length ===
      ANALYTICS_FILTER_QUERY_PARAMETER_ORDER.length &&
    registryParameters.every(
      (parameter, index) =>
        ANALYTICS_FILTER_QUERY_PARAMETER_ORDER[index] === parameter,
    )
  );
}
