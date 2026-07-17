/**
 * Shared analytics filter and view-state contracts (Phase 2, Step 2.2).
 *
 * Filters narrow the eligible analytical sample. Durable selections coordinate
 * comparison, highlighting, chart/table focus, and detail without silently
 * changing that sample. Route-owned scope and transient browser interaction
 * state remain separate from both.
 *
 * The contracts are client-safe and presentation-agnostic. Stable database
 * IDs, canonical codes, and typed subject references are identity; labels,
 * image paths, Storage URLs, and authorization values never are.
 */

import type { AnalyticsScoreSourceKey, AnalyticsSubjectRef } from './subjects';
import {
  ANALYTICS_SCOPE_TYPES,
  type AnalyticsScopeType,
} from './scopes';

export const ANALYTICS_FILTER_KEYS = [
  'player',
  'group',
  'date-range',
  'game-range',
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
  'data-source',
  'minimum-sample',
] as const;

export type AnalyticsFilterKey = (typeof ANALYTICS_FILTER_KEYS)[number];

export function isAnalyticsFilterKey(
  value: unknown,
): value is AnalyticsFilterKey {
  return (
    typeof value === 'string' &&
    (ANALYTICS_FILTER_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Filter compatibility is deliberately richer than a boolean. A filter can be
 * valid in the shared vocabulary while unsupported for a scope, unavailable
 * because facts are absent, deferred pending an approved definition, or simply
 * irrelevant to a route-owned single-entity scope.
 */
export const ANALYTICS_FILTER_COMPATIBILITY_STATUSES = [
  'supported',
  'unsupported',
  'unavailable',
  'deferred',
  'not-applicable',
] as const;

export type AnalyticsFilterCompatibilityStatus =
  (typeof ANALYTICS_FILTER_COMPATIBILITY_STATUSES)[number];

export type AnalyticsFilterScopeCompatibility = {
  status: AnalyticsFilterCompatibilityStatus;
  /** User-safe reason; never contains query errors or authorization details. */
  reason: string;
};

export type AnalyticsFilterCardinality =
  | 'scalar'
  | 'multi'
  | 'range'
  | 'deferred';

export type AnalyticsFilterIdentityKind =
  | 'uuid'
  | 'canonical-code'
  | 'registered-code'
  | 'positive-integer'
  | 'nonnegative-integer'
  | 'iso-date'
  | 'uuid-pair'
  | 'deferred';

export type AnalyticsFilterDefinition = {
  key: AnalyticsFilterKey;
  /** Canonical query names in registry order. Empty while a domain is deferred. */
  queryParameters: readonly string[];
  cardinality: AnalyticsFilterCardinality;
  identity: AnalyticsFilterIdentityKind;
  defaultDescription: string;
  /** True when scope compatibility alone is not metric capability approval. */
  requiresCapabilityDeclaration: boolean;
  scopes: Readonly<Record<AnalyticsScopeType, AnalyticsFilterScopeCompatibility>>;
};

const DEFAULT_UNSUPPORTED_REASON =
  'This filter is not supported for the selected analytics scope.';

function buildScopeCompatibility({
  supported = [],
  unsupported = [],
  unavailable = [],
  deferred = [],
  notApplicable = [],
  supportedReason =
    'The filter can narrow this scope when the selected metric also declares support.',
  unsupportedReason = DEFAULT_UNSUPPORTED_REASON,
  unavailableReason =
    'The recorded data cannot currently support this filter honestly.',
  deferredReason =
    'The filter is deferred until its canonical definition or source contract is approved.',
  notApplicableReason =
    'The route-owned scope already fixes this context or has no aggregate sample to narrow.',
}: {
  supported?: readonly AnalyticsScopeType[];
  unsupported?: readonly AnalyticsScopeType[];
  unavailable?: readonly AnalyticsScopeType[];
  deferred?: readonly AnalyticsScopeType[];
  notApplicable?: readonly AnalyticsScopeType[];
  supportedReason?: string;
  unsupportedReason?: string;
  unavailableReason?: string;
  deferredReason?: string;
  notApplicableReason?: string;
}): Readonly<Record<AnalyticsScopeType, AnalyticsFilterScopeCompatibility>> {
  const result = Object.fromEntries(
    ANALYTICS_SCOPE_TYPES.map((scope) => [
      scope,
      { status: 'unsupported', reason: DEFAULT_UNSUPPORTED_REASON },
    ]),
  ) as Record<AnalyticsScopeType, AnalyticsFilterScopeCompatibility>;

  for (const scope of supported) {
    result[scope] = { status: 'supported', reason: supportedReason };
  }
  for (const scope of unsupported) {
    result[scope] = { status: 'unsupported', reason: unsupportedReason };
  }
  for (const scope of unavailable) {
    result[scope] = { status: 'unavailable', reason: unavailableReason };
  }
  for (const scope of deferred) {
    result[scope] = { status: 'deferred', reason: deferredReason };
  }
  for (const scope of notApplicable) {
    result[scope] = {
      status: 'not-applicable',
      reason: notApplicableReason,
    };
  }

  return Object.freeze(result);
}

const AGGREGATE_SCOPES = [
  'global',
  'individual',
  'group',
  'comparison',
  'domain',
] as const satisfies readonly AnalyticsScopeType[];

const TEMPORAL_CONTEXT_SCOPES = AGGREGATE_SCOPES;

const METRIC_DIMENSION_SCOPES = AGGREGATE_SCOPES;

/**
 * Shared filter registry. Registry support means the value has a stable
 * contract; metric capability declarations still decide whether a particular
 * metric can use metric-specific dimensions.
 */
export const ANALYTICS_FILTER_REGISTRY: readonly AnalyticsFilterDefinition[] =
  Object.freeze([
    {
      key: 'player',
      queryParameters: ['player'],
      cardinality: 'scalar',
      identity: 'uuid',
      defaultDescription:
        'Absent means the route or authorized context chooses the player; it never chooses an arbitrary player.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: ['group', 'domain'],
        unsupported: ['global'],
        notApplicable: ['individual', 'comparison', 'game'],
        unsupportedReason:
          'Global analytics cannot expose a private player drilldown through a shared filter.',
      }),
    },
    {
      key: 'group',
      queryParameters: ['group'],
      cardinality: 'scalar',
      identity: 'uuid',
      defaultDescription:
        'Absent means the active authorized context; URL identity never grants group access.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: ['individual', 'comparison', 'domain'],
        unsupported: ['global'],
        notApplicable: ['group', 'game'],
        unsupportedReason:
          'Global analytics cannot accept an arbitrary private group filter.',
      }),
    },
    {
      key: 'date-range',
      queryParameters: ['from', 'to'],
      cardinality: 'range',
      identity: 'iso-date',
      defaultDescription:
        'Both bounds absent means all eligible authorized history.',
      requiresCapabilityDeclaration: false,
      scopes: buildScopeCompatibility({
        supported: TEMPORAL_CONTEXT_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'game-range',
      queryParameters: [],
      cardinality: 'deferred',
      identity: 'deferred',
      defaultDescription:
        'No shared default or URL fields exist because ordinal, rolling-window, and explicit-game meanings are not approved.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        deferred: AGGREGATE_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'map',
      queryParameters: ['map'],
      cardinality: 'multi',
      identity: 'uuid',
      defaultDescription: 'Empty means all eligible recorded maps.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'player-count',
      queryParameters: ['playerCount'],
      cardinality: 'multi',
      identity: 'positive-integer',
      defaultDescription: 'Empty means all eligible recorded table sizes.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'generation-count',
      queryParameters: ['generationCount'],
      cardinality: 'multi',
      identity: 'positive-integer',
      defaultDescription:
        'Empty means all eligible final generation counts; it never implies elapsed duration.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'game-length',
      queryParameters: ['gameLength'],
      cardinality: 'multi',
      identity: 'registered-code',
      defaultDescription:
        'No active default exists because game-length categories are not approved.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        unavailable: AGGREGATE_SCOPES,
        notApplicable: ['game'],
        unavailableReason:
          'Elapsed duration is not recorded and no canonical game-length category definition is approved.',
      }),
    },
    {
      key: 'expansion',
      queryParameters: ['expansion'],
      cardinality: 'multi',
      identity: 'canonical-code',
      defaultDescription:
        'Empty means all eligible recorded expansion configurations.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'corporation',
      queryParameters: ['corporation'],
      cardinality: 'multi',
      identity: 'uuid',
      defaultDescription: 'Empty means all eligible recorded corporations.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'prelude',
      queryParameters: ['prelude'],
      cardinality: 'multi',
      identity: 'uuid',
      defaultDescription:
        'Empty means all eligible recorded Preludes; no-Prelude and missing remain separate unresolved data states.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'corporation-prelude-pairing',
      queryParameters: ['corporationPrelude'],
      cardinality: 'multi',
      identity: 'uuid-pair',
      defaultDescription:
        'Empty means all eligible recorded pairings; each value is a canonical corporation ID plus canonical Prelude ID.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'card',
      queryParameters: ['card'],
      cardinality: 'multi',
      identity: 'uuid',
      defaultDescription:
        'Empty means all eligible catalog identities; catalog identity alone is not acquisition or play evidence.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'tag',
      queryParameters: ['tag'],
      cardinality: 'multi',
      identity: 'canonical-code',
      defaultDescription:
        'Empty means all eligible registered tag codes; vocabulary resolution is caller-supplied.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'score-source',
      queryParameters: ['scoreSource'],
      cardinality: 'multi',
      identity: 'registered-code',
      defaultDescription:
        'Empty means all eligible typed score-source keys.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'style',
      queryParameters: ['style'],
      cardinality: 'multi',
      identity: 'canonical-code',
      defaultDescription:
        'Empty means all eligible style codes; declared/inferred provenance is not identity.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: METRIC_DIMENSION_SCOPES,
        notApplicable: ['game'],
      }),
    },
    {
      key: 'game-status',
      queryParameters: ['status'],
      cardinality: 'scalar',
      identity: 'registered-code',
      defaultDescription:
        'Finalized is the aggregate analytics default and is omitted from canonical URLs.',
      requiresCapabilityDeclaration: false,
      scopes: buildScopeCompatibility({
        supported: AGGREGATE_SCOPES,
        notApplicable: ['game'],
        supportedReason:
          'Aggregate analytics use finalized games; another status requires a separately approved game-specific contract.',
      }),
    },
    {
      key: 'data-source',
      queryParameters: [],
      cardinality: 'deferred',
      identity: 'deferred',
      defaultDescription:
        'No shared default or URL field exists until manual/imported source and import-status semantics are approved.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        deferred: AGGREGATE_SCOPES,
        notApplicable: ['game'],
        deferredReason:
          'The current imported-game evidence has no approved canonical analytics source taxonomy or trustworthy shared read model.',
      }),
    },
    {
      key: 'minimum-sample',
      queryParameters: ['minSample'],
      cardinality: 'scalar',
      identity: 'nonnegative-integer',
      defaultDescription:
        'Absent means no explicit sample exclusion; there is no universal threshold.',
      requiresCapabilityDeclaration: true,
      scopes: buildScopeCompatibility({
        supported: AGGREGATE_SCOPES,
        notApplicable: ['game'],
      }),
    },
  ] satisfies readonly AnalyticsFilterDefinition[]);

export function getAnalyticsFilterDefinition(
  key: AnalyticsFilterKey,
): AnalyticsFilterDefinition {
  const definition = ANALYTICS_FILTER_REGISTRY.find(
    (candidate) => candidate.key === key,
  );
  if (definition === undefined) {
    throw new Error(`Missing analytics filter definition for "${key}"`);
  }
  return definition;
}

export function getAnalyticsFilterScopeCompatibility(
  key: AnalyticsFilterKey,
  scope: AnalyticsScopeType,
): AnalyticsFilterScopeCompatibility {
  return getAnalyticsFilterDefinition(key).scopes[scope];
}

export const ANALYTICS_GAME_STATUSES = ['draft', 'finalized'] as const;

export type AnalyticsGameStatus = (typeof ANALYTICS_GAME_STATUSES)[number];

export function isAnalyticsGameStatus(
  value: unknown,
): value is AnalyticsGameStatus {
  return (
    typeof value === 'string' &&
    (ANALYTICS_GAME_STATUSES as readonly string[]).includes(value)
  );
}

export type CorporationPreludeFilterValue = {
  corporationId: string;
  preludeId: string;
};

/** Canonical, syntactically valid sample-filter state. */
export type AnalyticsFilterState = {
  playerId: string | null;
  groupId: string | null;
  from: string | null;
  to: string | null;
  mapIds: readonly string[];
  playerCounts: readonly number[];
  generationCounts: readonly number[];
  gameLengthCodes: readonly string[];
  expansionCodes: readonly string[];
  corporationIds: readonly string[];
  preludeIds: readonly string[];
  corporationPreludePairs: readonly CorporationPreludeFilterValue[];
  cardIds: readonly string[];
  tagCodes: readonly string[];
  scoreSourceKeys: readonly AnalyticsScoreSourceKey[];
  styleCodes: readonly string[];
  minSample: number | null;
  status: AnalyticsGameStatus;
};

export function createDefaultAnalyticsFilterState(): AnalyticsFilterState {
  return {
    playerId: null,
    groupId: null,
    from: null,
    to: null,
    mapIds: [],
    playerCounts: [],
    generationCounts: [],
    gameLengthCodes: [],
    expansionCodes: [],
    corporationIds: [],
    preludeIds: [],
    corporationPreludePairs: [],
    cardIds: [],
    tagCodes: [],
    scoreSourceKeys: [],
    styleCodes: [],
    minSample: null,
    status: 'finalized',
  };
}

/**
 * Durable analytical selection. `entities` are comparison/highlight subjects,
 * never sample filters; a route may support one focused entity or several
 * comparison entities. `pointId` is also the semantic evidence-row focus.
 */
export type AnalyticsSelectionState = {
  entities: readonly AnalyticsSubjectRef[];
  metricId: string | null;
  pointId: string | null;
  seriesId: string | null;
  detailId: string | null;
};

export function createEmptyAnalyticsSelectionState(): AnalyticsSelectionState {
  return {
    entities: [],
    metricId: null,
    pointId: null,
    seriesId: null,
    detailId: null,
  };
}

/** State sufficient to recreate an analytical view from a URL. */
export type AnalyticsUrlAddressableState = {
  filters: AnalyticsFilterState;
  selection: AnalyticsSelectionState;
};

export function createDefaultAnalyticsUrlAddressableState(): AnalyticsUrlAddressableState {
  return {
    filters: createDefaultAnalyticsFilterState(),
    selection: createEmptyAnalyticsSelectionState(),
  };
}

/** Route/path ownership stays outside shared query state. */
export type AnalyticsNavigationState = {
  scope: AnalyticsScopeType;
  pathname: string;
};

/**
 * Browser-only interaction state that must never be serialized. Semantic point
 * focus belongs in `AnalyticsSelectionState`; DOM focus and hover do not.
 */
export type AnalyticsTransientInteractionState = {
  hoveredPointId: string | null;
  focusedControlId: string | null;
  openMenuId: string | null;
};

export const ANALYTICS_IDENTITY_RESOLUTION_STATUSES = [
  'accepted',
  'unknown',
  'stale',
  'authorization-rejected',
  'unresolved',
  'loading',
  'query-error',
] as const;

export type AnalyticsIdentityResolutionStatus =
  (typeof ANALYTICS_IDENTITY_RESOLUTION_STATUSES)[number];

export type AnalyticsIdentityOwner = AnalyticsFilterKey | 'selection';

export type AnalyticsIdentityResolutionInput = {
  owner: AnalyticsIdentityOwner;
  /** Entity kind or filter-specific stable identity family. */
  kind:
    | AnalyticsSubjectRef['kind']
    | 'expansion'
    | 'game-length'
    | 'map'
    | 'player'
    | 'group';
  canonicalValue: string;
};

export type AnalyticsIdentityResolution = {
  status: AnalyticsIdentityResolutionStatus;
  /** Optional user-safe explanation. Never include private metadata. */
  explanation?: string;
};

/**
 * Pure caller-supplied boundary. It may consult already-loaded metadata but
 * performs no query itself; repositories remain responsible for authorization.
 */
export type AnalyticsIdentityResolver = (
  input: AnalyticsIdentityResolutionInput,
) => AnalyticsIdentityResolution;

export const ANALYTICS_FILTER_QUERY_PARAMETER_ORDER = [
  'player',
  'group',
  'from',
  'to',
  'map',
  'playerCount',
  'generationCount',
  'gameLength',
  'expansion',
  'corporation',
  'prelude',
  'corporationPrelude',
  'card',
  'tag',
  'scoreSource',
  'style',
  'status',
  'minSample',
] as const;

export const ANALYTICS_SELECTION_QUERY_PARAMETER_ORDER = [
  'entity',
  'metric',
  'point',
  'series',
  'detail',
] as const;

export type AnalyticsSelectionQueryParameter =
  (typeof ANALYTICS_SELECTION_QUERY_PARAMETER_ORDER)[number];

export const ANALYTICS_QUERY_PARAMETER_ORDER = [
  ...ANALYTICS_FILTER_QUERY_PARAMETER_ORDER,
  ...ANALYTICS_SELECTION_QUERY_PARAMETER_ORDER,
] as const;

export type AnalyticsCanonicalQueryParameter =
  (typeof ANALYTICS_QUERY_PARAMETER_ORDER)[number];
