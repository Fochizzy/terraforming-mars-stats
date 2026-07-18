import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_FILTER_KEYS,
  ANALYTICS_FILTER_QUERY_PARAMETER_ORDER,
  ANALYTICS_FILTER_REGISTRY,
  ANALYTICS_QUERY_PARAMETER_ORDER,
  createDefaultAnalyticsFilterState,
  createDefaultAnalyticsUrlAddressableState,
  createEmptyAnalyticsSelectionState,
  getAnalyticsFilterDefinition,
  getAnalyticsFilterScopeCompatibility,
  type AnalyticsNavigationState,
  type AnalyticsTransientInteractionState,
} from './filters';
import { registeredFilterParameterOrderMatchesRegistry } from './filter-url-state';

describe('analytics filter contracts', () => {
  it('declares every evaluated filter domain once in stable registry order', () => {
    expect(ANALYTICS_FILTER_REGISTRY.map((entry) => entry.key)).toEqual(
      ANALYTICS_FILTER_KEYS,
    );
    expect(new Set(ANALYTICS_FILTER_KEYS).size).toBe(
      ANALYTICS_FILTER_KEYS.length,
    );
    expect(registeredFilterParameterOrderMatchesRegistry()).toBe(true);
  });

  it('pins canonical filter and selection parameter order without a scope field', () => {
    expect(ANALYTICS_FILTER_QUERY_PARAMETER_ORDER).toEqual([
      'player',
      'group',
      'from',
      'to',
      'map',
      'playerCount',
      'generationCount',
      'gameLength',
      'corporation',
      'prelude',
      'corporationPrelude',
      'card',
      'tag',
      'scoreSource',
      'style',
      'status',
      'minSample',
    ]);
    expect(ANALYTICS_QUERY_PARAMETER_ORDER).toEqual([
      ...ANALYTICS_FILTER_QUERY_PARAMETER_ORDER,
      'entity',
      'metric',
      'point',
      'series',
      'detail',
    ]);
    expect(ANALYTICS_QUERY_PARAMETER_ORDER).not.toContain('scope');
    expect(ANALYTICS_QUERY_PARAMETER_ORDER).not.toContain('hover');
  });

  it('distinguishes supported, unsupported, unavailable, deferred, and not-applicable', () => {
    expect(getAnalyticsFilterScopeCompatibility('map', 'group').status).toBe(
      'supported',
    );
    expect(
      getAnalyticsFilterScopeCompatibility('player', 'global').status,
    ).toBe('unsupported');
    expect(
      getAnalyticsFilterScopeCompatibility('game-length', 'global').status,
    ).toBe('unavailable');
    expect(
      getAnalyticsFilterScopeCompatibility('game-range', 'global').status,
    ).toBe('deferred');
    expect(getAnalyticsFilterScopeCompatibility('map', 'game').status).toBe(
      'not-applicable',
    );
  });

  it('keeps unresolved game-range and imported/data-source semantics out of the URL', () => {
    expect(getAnalyticsFilterDefinition('game-range')).toMatchObject({
      cardinality: 'deferred',
      queryParameters: [],
    });
    expect(getAnalyticsFilterDefinition('data-source')).toMatchObject({
      cardinality: 'deferred',
      queryParameters: [],
    });
  });

  it('uses a stable UUID pair rather than corporation or Prelude display names', () => {
    expect(
      getAnalyticsFilterDefinition('corporation-prelude-pairing'),
    ).toMatchObject({
      identity: 'uuid-pair',
      queryParameters: ['corporationPrelude'],
    });
  });

  it('provides explicit route-independent defaults without inventing identities or thresholds', () => {
    expect(createDefaultAnalyticsFilterState()).toEqual({
      playerId: null,
      groupId: null,
      from: null,
      to: null,
      mapIds: [],
      playerCounts: [],
      generationCounts: [],
      gameLengthCodes: [],
      corporationIds: [],
      preludeIds: [],
      corporationPreludePairs: [],
      cardIds: [],
      tagCodes: [],
      scoreSourceKeys: [],
      styleCodes: [],
      minSample: null,
      status: 'finalized',
    });
  });

  it('keeps sample filters and comparison/highlight selection in separate objects', () => {
    const state = createDefaultAnalyticsUrlAddressableState();
    expect(state.filters.playerId).toBeNull();
    expect(state.selection).toEqual(createEmptyAnalyticsSelectionState());
    expect(state.selection).not.toHaveProperty('playerId');
  });

  it('models route ownership and transient interaction outside URL-addressable state', () => {
    const navigation: AnalyticsNavigationState = {
      scope: 'group',
      pathname: '/insights/group',
    };
    const transient: AnalyticsTransientInteractionState = {
      hoveredPointId: 'point-a',
      focusedControlId: 'filter-map',
      openMenuId: 'map-menu',
    };

    expect(navigation.scope).toBe('group');
    expect(transient.hoveredPointId).toBe('point-a');
    expect(ANALYTICS_QUERY_PARAMETER_ORDER).not.toContain('hoveredPointId');
    expect(ANALYTICS_QUERY_PARAMETER_ORDER).not.toContain('pathname');
  });
});
