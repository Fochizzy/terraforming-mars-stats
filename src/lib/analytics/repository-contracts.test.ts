import { describe, expect, it } from 'vitest';
import { getDeclaredAnalyticsCapability } from './capability-declarations';
import {
  createDefaultAnalyticsFilterState,
  createEmptyAnalyticsSelectionState,
} from './filters';
import {
  createAnalyticsRepositoryDataResult,
  createAnalyticsRepositoryError,
  createAnalyticsRepositoryUnavailable,
  getActiveAnalyticsFilterKeys,
  type AnalyticsRepositoryQueryMetadata,
} from './repository-contracts';

function query(): AnalyticsRepositoryQueryMetadata {
  return {
    operationId: 'finalized-game-results.list',
    scope: {
      type: 'group',
      groupId: '00000000-0000-4000-8000-000000000001',
    },
    filters: createDefaultAnalyticsFilterState(),
    selectionContext: {
      state: createEmptyAnalyticsSelectionState(),
      role: 'highlight-only',
    },
    appliedFilters: [],
    ordering: {
      field: 'played-on',
      direction: 'desc',
      tieBreakers: ['created-at', 'game-id'],
    },
    pagination: {
      kind: 'offset',
      offset: 0,
      limit: 25,
      returned: 0,
      hasMore: false,
    },
    authorizationBoundary: 'current-user-rls',
  };
}

describe('analytics repository contracts', () => {
  it('distinguishes explicit minimum-sample zero from an absent filter', () => {
    const absent = createDefaultAnalyticsFilterState();
    const explicitZero = { ...absent, minSample: 0 };

    expect(getActiveAnalyticsFilterKeys(absent)).not.toContain(
      'minimum-sample',
    );
    expect(getActiveAnalyticsFilterKeys(explicitZero)).toContain(
      'minimum-sample',
    );
  });

  it('returns empty only for a successful query with no records', () => {
    const result = createAnalyticsRepositoryDataResult({
      query: query(),
      data: {
        records: [],
        coverage: {
          eligibleRecords: 0,
          recordsWithRequiredData: 0,
        },
        evidence: {
          sources: [
            { kind: 'persisted-table', reference: 'games' },
          ],
        },
      },
      partial: false,
    });

    expect(result.status).toBe('empty');
    expect(result).toMatchObject({
      data: { records: [] },
      query: { selectionContext: { role: 'highlight-only' } },
    });
  });

  it('keeps partial data distinct from ready and empty data', () => {
    const result = createAnalyticsRepositoryDataResult({
      query: query(),
      data: {
        records: [{ gameId: 'game-1' }],
        coverage: {
          eligibleRecords: 1,
          recordsWithRequiredData: 0,
        },
        evidence: {
          sources: [
            { kind: 'persisted-table', reference: 'game_players' },
          ],
        },
      },
      partial: true,
    });

    expect(result.status).toBe('partial');
  });

  it('keeps unavailable card-acquisition data distinct from query errors', () => {
    const capability = getDeclaredAnalyticsCapability(
      'cards-purchased-by-generation',
    );
    expect(capability).not.toBeNull();
    const unavailable = createAnalyticsRepositoryUnavailable({
      query: {
        ...query(),
        pagination: { kind: 'offset', offset: 0, limit: 25 },
      },
      capability: capability!,
    });
    const error = createAnalyticsRepositoryError({
      operationId: 'finalized-game-results.list',
      category: 'query-failure',
      message: 'Analytics data could not be loaded.',
      retryable: true,
    });

    expect(unavailable).toMatchObject({
      status: 'unavailable',
      capability: { status: 'requires-new-fields' },
    });
    expect(error).toMatchObject({
      status: 'error',
      error: { category: 'query-failure', retryable: true },
    });
  });

  it('keeps unavailable generation-level TR separate from final game generation count', () => {
    expect(getDeclaredAnalyticsCapability('tr-by-generation')).toMatchObject({
      status: 'requires-new-fields',
      reason: { code: 'required-facts-not-persisted' },
      missingData: [{ key: 'tr-generation-snapshots' }],
    });
  });

  it('rejects constructing unavailable data from an executable capability', () => {
    const capability = getDeclaredAnalyticsCapability('placement-and-winners');
    expect(() =>
      createAnalyticsRepositoryUnavailable({
        query: {
          ...query(),
          pagination: { kind: 'offset', offset: 0, limit: 25 },
        },
        capability: capability!,
      }),
    ).toThrow('Executable capability');
  });
});
