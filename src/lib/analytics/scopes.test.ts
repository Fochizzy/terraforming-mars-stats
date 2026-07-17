import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_DOMAIN_KINDS,
  ANALYTICS_SCOPE_TYPES,
  describeAnalyticsDatasetContext,
  isAnalyticsDomainKind,
  isAnalyticsScopeType,
  validateAnalyticsScope,
  type AnalyticsScope,
} from './scopes';

const validScopes: Record<string, AnalyticsScope> = {
  global: { type: 'global' },
  individual: { type: 'individual', playerId: 'player-1' },
  group: { type: 'group', groupId: 'group-1' },
  comparison: {
    type: 'comparison',
    subjects: [
      { kind: 'player', playerId: 'player-1' },
      { kind: 'player', playerId: 'player-2' },
    ],
  },
  game: { type: 'game', gameId: 'game-1' },
  domain: {
    type: 'domain',
    domain: 'corporation',
    entity: { kind: 'corporation', corporationId: 'corp-1' },
  },
};

describe('analytics scope registry', () => {
  it('registers exactly the six approved scope types', () => {
    expect(ANALYTICS_SCOPE_TYPES).toEqual([
      'global',
      'individual',
      'group',
      'comparison',
      'game',
      'domain',
    ]);
  });

  it('guards scope-type membership at runtime', () => {
    for (const scopeType of ANALYTICS_SCOPE_TYPES) {
      expect(isAnalyticsScopeType(scopeType)).toBe(true);
    }
    expect(isAnalyticsScopeType('overall')).toBe(false);
    expect(isAnalyticsScopeType(undefined)).toBe(false);
  });

  it('restricts domains to entity kinds and never player, group, or game', () => {
    const domains = ANALYTICS_DOMAIN_KINDS as readonly string[];
    expect(domains).not.toContain('player');
    expect(domains).not.toContain('group');
    expect(domains).not.toContain('game');
    expect(isAnalyticsDomainKind('corporation')).toBe(true);
    expect(isAnalyticsDomainKind('player')).toBe(false);
  });
});

describe('validateAnalyticsScope', () => {
  it('accepts every well-formed scope of the six types', () => {
    for (const scope of Object.values(validScopes)) {
      expect(validateAnalyticsScope(scope)).toEqual({ valid: true });
    }
  });

  it('rejects a missing required player identity', () => {
    const result = validateAnalyticsScope({
      type: 'individual',
      playerId: '  ',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]).toMatchObject({
        code: 'missing-entity-id',
        path: 'playerId',
      });
    }
  });

  it('rejects blank group and game identities', () => {
    expect(
      validateAnalyticsScope({ type: 'group', groupId: '' }),
    ).toMatchObject({ valid: false });
    expect(validateAnalyticsScope({ type: 'game', gameId: '' })).toMatchObject({
      valid: false,
    });
  });

  it('rejects a blank optional group context on an individual scope', () => {
    const result = validateAnalyticsScope({
      type: 'individual',
      playerId: 'player-1',
      groupId: ' ',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]).toMatchObject({
        code: 'missing-entity-id',
        path: 'groupId',
      });
    }
  });

  it('rejects a comparison with fewer than two subjects', () => {
    const result = validateAnalyticsScope({
      type: 'comparison',
      subjects: [{ kind: 'player', playerId: 'player-1' }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]).toMatchObject({
        code: 'too-few-comparison-subjects',
      });
    }
  });

  it('rejects duplicate comparison subjects by stable identity', () => {
    const result = validateAnalyticsScope({
      type: 'comparison',
      subjects: [
        { kind: 'corporation', corporationId: 'corp-1' },
        { kind: 'corporation', corporationId: 'corp-1' },
      ],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        code: 'duplicate-comparison-subjects',
        path: 'subjects[1]',
      });
    }
  });

  it('allows same identifier under different kinds in one comparison', () => {
    const result = validateAnalyticsScope({
      type: 'comparison',
      subjects: [
        { kind: 'milestone', milestoneId: 'objective-1' },
        { kind: 'award', awardId: 'objective-1' },
      ],
    });
    expect(result).toEqual({ valid: true });
  });

  it('surfaces invalid subject references with their path', () => {
    const result = validateAnalyticsScope({
      type: 'comparison',
      subjects: [
        { kind: 'player', playerId: 'player-1' },
        { kind: 'prelude', preludeId: '' },
      ],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]).toMatchObject({
        code: 'invalid-subject-reference',
        path: 'subjects[1].preludeId',
      });
    }
  });

  it('rejects a blank shared comparison context', () => {
    const result = validateAnalyticsScope({
      type: 'comparison',
      subjects: [
        { kind: 'player', playerId: 'player-1' },
        { kind: 'player', playerId: 'player-2' },
      ],
      sharedGroupId: '',
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]).toMatchObject({ path: 'sharedGroupId' });
    }
  });

  it('rejects a focused domain entity of the wrong kind', () => {
    const result = validateAnalyticsScope({
      type: 'domain',
      domain: 'corporation',
      entity: { kind: 'card', cardId: 'card-1' },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]).toMatchObject({
        code: 'domain-entity-mismatch',
        path: 'entity',
      });
    }
  });

  it('validates the focused domain entity identity', () => {
    const result = validateAnalyticsScope({
      type: 'domain',
      domain: 'tag',
      entity: { kind: 'tag', tagCode: '' },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.issues[0]).toMatchObject({
        code: 'invalid-subject-reference',
        path: 'entity.tagCode',
      });
    }
  });

  it('does not mutate the scope it validates', () => {
    const scope: AnalyticsScope = Object.freeze({
      type: 'comparison',
      subjects: Object.freeze([
        Object.freeze({ kind: 'player', playerId: 'player-1' } as const),
        Object.freeze({ kind: 'player', playerId: 'player-1' } as const),
      ]),
    }) as AnalyticsScope;
    const before = JSON.stringify(scope);
    validateAnalyticsScope(scope);
    expect(JSON.stringify(scope)).toBe(before);
  });
});

describe('describeAnalyticsDatasetContext', () => {
  it('marks only opted-in populations as requiring global opt-in', () => {
    expect(describeAnalyticsDatasetContext({ type: 'global' })).toEqual({
      population: 'global-opted-in-group-games',
      requiresGlobalOptIn: true,
    });
    expect(
      describeAnalyticsDatasetContext({ type: 'group', groupId: 'group-1' }),
    ).toEqual({
      population: 'authorized-group-games',
      requiresGlobalOptIn: false,
      groupId: 'group-1',
    });
  });

  it('carries player identity and optional group context for individuals', () => {
    expect(
      describeAnalyticsDatasetContext({
        type: 'individual',
        playerId: 'player-1',
      }),
    ).toEqual({
      population: 'authorized-player-games',
      requiresGlobalOptIn: false,
      playerId: 'player-1',
    });
    expect(
      describeAnalyticsDatasetContext({
        type: 'individual',
        playerId: 'player-1',
        groupId: 'group-1',
      }),
    ).toMatchObject({ playerId: 'player-1', groupId: 'group-1' });
  });

  it('reports the compared subject count and shared context', () => {
    expect(
      describeAnalyticsDatasetContext({
        type: 'comparison',
        subjects: [
          { kind: 'player', playerId: 'player-1' },
          { kind: 'player', playerId: 'player-2' },
        ],
        sharedGroupId: 'group-9',
      }),
    ).toEqual({
      population: 'comparison-subject-games',
      requiresGlobalOptIn: false,
      subjectCount: 2,
      groupId: 'group-9',
    });
  });

  it('scopes a single game population to its game identity', () => {
    expect(
      describeAnalyticsDatasetContext({ type: 'game', gameId: 'game-7' }),
    ).toEqual({
      population: 'authorized-single-game',
      requiresGlobalOptIn: false,
      gameId: 'game-7',
    });
  });

  it('treats a domain scope without group context as globally opted-in', () => {
    expect(
      describeAnalyticsDatasetContext({ type: 'domain', domain: 'card' }),
    ).toEqual({
      population: 'domain-context-games',
      requiresGlobalOptIn: true,
    });
    expect(
      describeAnalyticsDatasetContext({
        type: 'domain',
        domain: 'card',
        groupId: 'group-2',
      }),
    ).toEqual({
      population: 'domain-context-games',
      requiresGlobalOptIn: false,
      groupId: 'group-2',
    });
  });
});
