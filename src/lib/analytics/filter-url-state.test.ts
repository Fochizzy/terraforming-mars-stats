import { describe, expect, it } from 'vitest';
import {
  canonicalizeAnalyticsUrlState,
  parseAnalyticsUrlState,
  parseAndNormalizeAnalyticsUrlState,
  partiallyResetAnalyticsUrlState,
  resetAnalyticsUrlState,
  serializeAnalyticsUrlState,
} from './filter-url-state';
import {
  createDefaultAnalyticsFilterState,
  createDefaultAnalyticsUrlAddressableState,
  createEmptyAnalyticsSelectionState,
} from './filters';

const PLAYER_A = '11111111-1111-4111-8111-111111111111';
const PLAYER_B = '22222222-2222-4222-8222-222222222222';
const GROUP_A = '33333333-3333-4333-8333-333333333333';
const MAP_A = '44444444-4444-4444-8444-444444444444';
const MAP_B = '55555555-5555-4555-8555-555555555555';
const CORPORATION_A = '66666666-6666-4666-8666-666666666666';
const PRELUDE_A = '77777777-7777-4777-8777-777777777777';

const groupScope = { type: 'group', groupId: GROUP_A } as const;

describe('analytics URL-state contracts', () => {
  it('distinguishes omitted defaults, explicit empty input, accepted input, and rejected input', () => {
    const parsed = parseAnalyticsUrlState(
      new URLSearchParams(
        `player=&map=${MAP_A}&playerCount=not-a-number&tag=science`,
      ),
    );

    expect(parsed.inputStates.group.status).toBe('omitted-default');
    expect(parsed.inputStates.player.status).toBe('explicit-empty');
    expect(parsed.inputStates.map.status).toBe('accepted');
    expect(parsed.inputStates.playerCount.status).toBe('rejected');
    expect(parsed.inputStates.tag.status).toBe('accepted');
  });

  it('parses the first valid scalar and reports conflicting repeated values', () => {
    const parsed = parseAnalyticsUrlState(
      new URLSearchParams(`player=invalid&player=${PLAYER_A}&player=${PLAYER_B}`),
    );

    expect(parsed.state.filters.playerId).toBe(PLAYER_A);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'malformed-value', parameter: 'player' }),
        expect.objectContaining({
          code: 'conflicting-scalar-value',
          parameter: 'player',
        }),
      ]),
    );
  });

  it('deduplicates and deterministically orders repeated stable identities', () => {
    const parsed = parseAnalyticsUrlState(
      new URLSearchParams(
        `map=${MAP_B}&map=${MAP_A}&map=${MAP_B}&tag=SCIENCE&tag=building`,
      ),
    );

    expect(parsed.state.filters.mapIds).toEqual([MAP_A, MAP_B]);
    expect(parsed.state.filters.tagCodes).toEqual(['building', 'science']);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'duplicate-value', owner: 'map' }),
      ]),
    );
  });

  it('uses repeated canonical corporation/Prelude UUID pairs without display labels', () => {
    const parsed = parseAnalyticsUrlState(
      new URLSearchParams(
        `corporationPrelude=${CORPORATION_A}~${PRELUDE_A}&corporationPrelude=Credicor~Business+Network`,
      ),
    );

    expect(parsed.state.filters.corporationPreludePairs).toEqual([
      { corporationId: CORPORATION_A, preludeId: PRELUDE_A },
    ]);
    expect(parsed.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'malformed-value',
          owner: 'corporation-prelude-pairing',
        }),
      ]),
    );
  });

  it('round-trips filters and durable selection without serializing route or transient state', () => {
    const state = {
      filters: {
        ...createDefaultAnalyticsFilterState(),
        playerId: PLAYER_A,
        from: '2026-01-01',
        mapIds: [MAP_B, MAP_A],
        expansionCodes: ['venus_next', 'base'],
        corporationPreludePairs: [
          { corporationId: CORPORATION_A, preludeId: PRELUDE_A },
        ],
        minSample: 0,
      },
      selection: {
        ...createEmptyAnalyticsSelectionState(),
        entities: [{ kind: 'player', playerId: PLAYER_B }] as const,
        metricId: 'win-rate',
        pointId: 'generation-8',
        seriesId: 'player-series',
        detailId: 'generation-8',
      },
    };

    const serialized = serializeAnalyticsUrlState(
      state,
      new URLSearchParams('tab=overview'),
      { scope: groupScope },
    );
    const reparsed = parseAndNormalizeAnalyticsUrlState(
      serialized.searchParams,
      { scope: groupScope },
    );

    expect(serialized.searchParams.toString()).toBe(
      `tab=overview&player=${PLAYER_A}&from=2026-01-01&map=${MAP_A}&map=${MAP_B}&expansion=base&expansion=venus_next&corporationPrelude=${CORPORATION_A}%7E${PRELUDE_A}&minSample=0&entity=player%3A${PLAYER_B}&metric=win-rate&point=generation-8&series=player-series&detail=generation-8`,
    );
    expect(reparsed.state).toEqual(serialized.normalizedState);
    expect(serialized.searchParams.has('scope')).toBe(false);
    expect(serialized.searchParams.has('hover')).toBe(false);
  });

  it('omits defaults but preserves explicit zero and unrelated query parameters', () => {
    const serialized = serializeAnalyticsUrlState(
      {
        ...createDefaultAnalyticsUrlAddressableState(),
        filters: {
          ...createDefaultAnalyticsFilterState(),
          minSample: 0,
        },
      },
      new URLSearchParams('tab=charts&status=finalized&panel=compact'),
      { scope: groupScope },
    );

    expect(serialized.searchParams.toString()).toBe(
      'tab=charts&panel=compact&minSample=0',
    );
  });

  it('accepts explicit aliases only and canonicalizes them to one public name', () => {
    const aliases = { player: ['playerId'] } as const;
    const result = canonicalizeAnalyticsUrlState(
      new URLSearchParams(`tab=overview&playerId=${PLAYER_A}`),
      { scope: groupScope, aliases },
    );

    expect(result.normalizedState.filters.playerId).toBe(PLAYER_A);
    expect(result.searchParams.toString()).toBe(
      `tab=overview&player=${PLAYER_A}`,
    );
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'alias-used', parameter: 'playerId' }),
      ]),
    );
  });

  it('prefers canonical input when an alias also appears and reports the conflict', () => {
    const result = parseAnalyticsUrlState(
      new URLSearchParams(`player=${PLAYER_A}&playerId=${PLAYER_B}`),
      { aliases: { player: ['playerId'] } },
    );

    expect(result.state.filters.playerId).toBe(PLAYER_A);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'alias-conflict', parameter: 'player' }),
      ]),
    );
  });

  it('rejects ambiguous alias declarations before parsing or serializing', () => {
    expect(() =>
      parseAnalyticsUrlState(new URLSearchParams(), {
        aliases: { player: ['subject'], group: ['subject'] },
      }),
    ).toThrow(/assigned to both/);
    expect(() =>
      parseAnalyticsUrlState(new URLSearchParams(), {
        aliases: { player: ['group'] },
      }),
    ).toThrow(/conflicts with a canonical parameter/);
  });

  it('strips known secrets and error details during canonicalization', () => {
    const result = canonicalizeAnalyticsUrlState(
      new URLSearchParams(
        `tab=overview&access_token=secret&refresh_token=secret&error_description=private&queryError=database-detail&player=${PLAYER_A}`,
      ),
      { scope: groupScope },
    );

    expect(result.searchParams.toString()).toBe(
      `tab=overview&player=${PLAYER_A}`,
    );
  });

  it('preserves unresolved/loading/query-error identities for restoration but never applies them', () => {
    for (const status of ['unresolved', 'loading', 'query-error'] as const) {
      const result = parseAndNormalizeAnalyticsUrlState(
        new URLSearchParams(`map=${MAP_A}`),
        {
          scope: groupScope,
          resolveIdentity: () => ({ status }),
        },
      );
      expect(result.state.filters.mapIds).toEqual([MAP_A]);
      expect(result.applicableState.filters.mapIds).toEqual([]);
    }
  });

  it('removes unknown, stale, and authorization-rejected identities without exposing private detail', () => {
    for (const status of [
      'unknown',
      'stale',
      'authorization-rejected',
    ] as const) {
      const result = canonicalizeAnalyticsUrlState(
        new URLSearchParams(`map=${MAP_A}`),
        {
          scope: groupScope,
          resolveIdentity: () => ({ status, explanation: 'safe reason' }),
        },
      );
      expect(result.normalizedState.filters.mapIds).toEqual([]);
      expect(result.searchParams.has('map')).toBe(false);
      expect(result.searchParams.toString()).not.toContain('safe+reason');
    }
  });

  it('resolves each identity once during canonicalization', () => {
    let resolutionCount = 0;
    const result = canonicalizeAnalyticsUrlState(
      new URLSearchParams(`map=${MAP_A}`),
      {
        scope: groupScope,
        resolveIdentity: () => {
          resolutionCount += 1;
          return { status: 'unresolved' };
        },
      },
    );

    expect(resolutionCount).toBe(1);
    expect(result.issues).toHaveLength(1);
    expect(result.searchParams.get('map')).toBe(MAP_A);
  });

  it('resets all analytics fields while preserving unrelated state and removing prohibited fields', () => {
    const reset = resetAnalyticsUrlState(
      new URLSearchParams(
        `tab=charts&map=${MAP_A}&metric=win-rate&access_token=secret&panel=table`,
      ),
    );

    expect(reset.toString()).toBe('tab=charts&panel=table');
  });

  it('partially resets complete filter domains and selected view fields', () => {
    const reset = partiallyResetAnalyticsUrlState(
      new URLSearchParams(
        `from=2026-01-01&to=2026-02-01&map=${MAP_A}&metric=win-rate&point=p-1&tab=charts`,
      ),
      ['date-range', 'point'],
    );

    expect(reset.toString()).toBe(
      `map=${MAP_A}&metric=win-rate&tab=charts`,
    );
  });

  it('clears unsupported and unavailable URL filters instead of silently applying them', () => {
    const global = parseAndNormalizeAnalyticsUrlState(
      new URLSearchParams(`group=${GROUP_A}&gameLength=short`),
      { scope: { type: 'global' } },
    );

    expect(global.state.filters.groupId).toBeNull();
    expect(global.state.filters.gameLengthCodes).toEqual([]);
    expect(global.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unsupported-filter', owner: 'group' }),
        expect.objectContaining({
          code: 'unavailable-filter',
          owner: 'game-length',
        }),
      ]),
    );
  });
});
