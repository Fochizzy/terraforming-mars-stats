import { describe, expect, it } from 'vitest';
import type { AnalyticsScope } from './scopes';
import {
  analyticsSelectionToDashboardSelection,
  canonicalIsoDate,
  normalizeAnalyticsFilterState,
  normalizeAnalyticsSelectionState,
  reconcileAnalyticsSelectionState,
} from './filter-normalization';
import {
  createDefaultAnalyticsFilterState,
  createEmptyAnalyticsSelectionState,
  type AnalyticsIdentityResolutionStatus,
} from './filters';

const PLAYER_A = '11111111-1111-4111-8111-111111111111';
const PLAYER_B = '22222222-2222-4222-8222-222222222222';
const GROUP_A = '33333333-3333-4333-8333-333333333333';
const MAP_A = '44444444-4444-4444-8444-444444444444';
const MAP_B = '55555555-5555-4555-8555-555555555555';

const groupScope: AnalyticsScope = { type: 'group', groupId: GROUP_A };

describe('analytics filter normalization', () => {
  it('normalizes stable values, deduplicates, and sorts deterministically', () => {
    const result = normalizeAnalyticsFilterState(
      {
        ...createDefaultAnalyticsFilterState(),
        mapIds: [MAP_B.toUpperCase(), MAP_A, MAP_B],
        playerCounts: [5, 2, 2],
        generationCounts: [12, 8],
        tagCodes: ['science', 'building'],
      },
      { scope: groupScope },
    );

    expect(result.state.mapIds).toEqual([MAP_A, MAP_B]);
    expect(result.state.playerCounts).toEqual([2, 5]);
    expect(result.state.generationCounts).toEqual([8, 12]);
    expect(result.state.tagCodes).toEqual(['building', 'science']);
    expect(result.issues.filter((issue) => issue.code === 'duplicate-value')).toHaveLength(2);
  });

  it('preserves explicit zero for minimum sample', () => {
    const result = normalizeAnalyticsFilterState(
      { minSample: 0 },
      { scope: groupScope },
    );
    expect(result.state.minSample).toBe(0);
    expect(result.applicableState.minSample).toBe(0);
  });

  it('validates real ISO dates without locale-dependent parsing', () => {
    expect(canonicalIsoDate('2024-02-29')).toBe('2024-02-29');
    expect(canonicalIsoDate('2023-02-29')).toBeNull();
    expect(canonicalIsoDate('02/29/2024')).toBeNull();
  });

  it('clears a reversed range rather than silently swapping its meaning', () => {
    const result = normalizeAnalyticsFilterState(
      { from: '2026-07-17', to: '2026-01-01' },
      { scope: groupScope },
    );
    expect(result.state).toMatchObject({ from: null, to: null });
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-range-order' }),
      ]),
    );
  });

  it('rejects malformed display labels as UUID and code identity', () => {
    const result = normalizeAnalyticsFilterState(
      {
        corporationIds: ['Credicor'],
        tagCodes: ['Science Tag'],
      },
      { scope: groupScope },
    );
    expect(result.state.corporationIds).toEqual([]);
    expect(result.state.tagCodes).toEqual([]);
    expect(result.issues.filter((issue) => issue.code === 'malformed-value')).toHaveLength(2);
  });

  it('returns typed scope incompatibility instead of applying a private global group filter', () => {
    const result = normalizeAnalyticsFilterState(
      { groupId: GROUP_A },
      { scope: { type: 'global' } },
    );
    expect(result.state.groupId).toBeNull();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unsupported-filter',
          owner: 'group',
        }),
      ]),
    );
  });

  it('distinguishes unavailable filters from unsupported filters', () => {
    const result = normalizeAnalyticsFilterState(
      { gameLengthCodes: ['short'] },
      { scope: groupScope },
    );
    expect(result.state.gameLengthCodes).toEqual([]);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unavailable-filter',
          owner: 'game-length',
        }),
      ]),
    );
  });

  it('does not admit draft games into an aggregate analytics population', () => {
    const result = normalizeAnalyticsFilterState(
      { status: 'draft' },
      { scope: groupScope },
    );
    expect(result.state.status).toBe('finalized');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unsupported-filter-value' }),
      ]),
    );
  });

  it.each([
    ['unknown', 'unknown-identifier'],
    ['stale', 'stale-identifier'],
    ['authorization-rejected', 'authorization-rejected'],
  ] as const)(
    'removes %s identities from canonical and applicable filter state',
    (status, issueCode) => {
      const result = normalizeAnalyticsFilterState(
        { mapIds: [MAP_A] },
        {
          scope: groupScope,
          resolveIdentity: () => ({ status }),
        },
      );
      expect(result.state.mapIds).toEqual([]);
      expect(result.applicableState.mapIds).toEqual([]);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: issueCode, owner: 'map' }),
        ]),
      );
    },
  );

  it.each([
    ['unresolved', 'metadata-unresolved'],
    ['loading', 'metadata-loading'],
    ['query-error', 'metadata-query-error'],
  ] as const)(
    'keeps %s identities restorable but withholds them from applicable query state',
    (status, issueCode) => {
      const result = normalizeAnalyticsFilterState(
        { mapIds: [MAP_A] },
        {
          scope: groupScope,
          resolveIdentity: () => ({ status }),
        },
      );
      expect(result.state.mapIds).toEqual([MAP_A]);
      expect(result.applicableState.mapIds).toEqual([]);
      expect(result.identityStates[0]?.resolution.status).toBe(status);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: issueCode, owner: 'map' }),
        ]),
      );
    },
  );

  it('keeps filter identity and comparison selection identity separate', () => {
    const filters = normalizeAnalyticsFilterState(
      { playerId: PLAYER_A },
      { scope: { type: 'domain', domain: 'card', groupId: GROUP_A } },
    );
    const selection = normalizeAnalyticsSelectionState({
      entities: [{ kind: 'player', playerId: PLAYER_B }],
    });
    expect(filters.state.playerId).toBe(PLAYER_A);
    expect(selection.state.entities).toEqual([
      { kind: 'player', playerId: PLAYER_B },
    ]);
  });

  it('clears dependent point/series/detail when the primary selected entity is stale', () => {
    const result = normalizeAnalyticsSelectionState(
      {
        entities: [{ kind: 'player', playerId: PLAYER_A }],
        metricId: 'win-rate',
        pointId: 'point-a',
        seriesId: 'series-a',
        detailId: 'detail-a',
      },
      () => ({ status: 'stale' }),
    );
    expect(result.state).toEqual({
      entities: [],
      metricId: 'win-rate',
      pointId: null,
      seriesId: null,
      detailId: null,
    });
  });

  it.each([
    'accepted',
    'unknown',
    'stale',
    'authorization-rejected',
    'unresolved',
    'loading',
    'query-error',
  ] satisfies readonly AnalyticsIdentityResolutionStatus[])(
    'keeps the identity resolution status %s distinguishable',
    (status) => {
      const result = normalizeAnalyticsSelectionState(
        { entities: [{ kind: 'player', playerId: PLAYER_A }] },
        () => ({ status }),
      );
      expect(result.identityStates[0]?.resolution.status).toBe(status);
    },
  );

  it('maps semantic point focus to the same Phase 1 evidence-row focus', () => {
    const dashboard = analyticsSelectionToDashboardSelection({
      ...createEmptyAnalyticsSelectionState(),
      pointId: 'point-a',
    });
    expect(dashboard.selectedDataPointId).toBe('point-a');
    expect(dashboard.activeTableRowId).toBe('point-a');
    expect(dashboard.hoveredDataPointId).toBeNull();
  });

  it('preserves compatible selection and clears only values invalidated by filter-driven availability', () => {
    const current = {
      entities: [
        { kind: 'player', playerId: PLAYER_B },
      ] as const,
      metricId: 'win-rate',
      pointId: 'point-b',
      seriesId: 'series-b',
      detailId: 'point-b',
    };
    const unchanged = reconcileAnalyticsSelectionState(current, {
      entities: [
        { kind: 'player', playerId: PLAYER_A },
        { kind: 'player', playerId: PLAYER_B },
      ],
      metricIds: ['win-rate'],
      dataPointIds: ['point-b'],
      legendItemIds: ['series-b'],
      detailItemIds: ['point-b'],
    });
    expect(unchanged).toEqual(current);

    const reconciled = reconcileAnalyticsSelectionState(current, {
      entities: [{ kind: 'player', playerId: PLAYER_A }],
      metricIds: ['win-rate'],
      dataPointIds: ['point-a'],
      legendItemIds: ['series-a'],
      detailItemIds: ['point-a'],
    });
    expect(reconciled).toEqual({
      entities: [{ kind: 'player', playerId: PLAYER_A }],
      metricId: 'win-rate',
      pointId: null,
      seriesId: null,
      detailId: null,
    });
  });
});
