import { describe, expect, it } from 'vitest';
import {
  describeUnsupportedScope,
  isAnalyticsCapabilityExecutable,
  validateAnalyticsCapabilityResult,
  type AnalyticsCapabilityStatus,
} from './capabilities';
import {
  DECLARED_ANALYTICS_CAPABILITIES,
  DECLARED_ANALYTICS_CAPABILITY_KEYS,
  getDeclaredAnalyticsCapability,
} from './capability-declarations';

describe('declared analytics capabilities', () => {
  it('uses unique keys in deterministic alphabetical order', () => {
    expect(DECLARED_ANALYTICS_CAPABILITY_KEYS).toEqual(
      DECLARED_ANALYTICS_CAPABILITIES.map((capability) => capability.key),
    );
    expect(new Set(DECLARED_ANALYTICS_CAPABILITY_KEYS).size).toBe(
      DECLARED_ANALYTICS_CAPABILITY_KEYS.length,
    );
    expect([...DECLARED_ANALYTICS_CAPABILITY_KEYS].sort()).toEqual([
      ...DECLARED_ANALYTICS_CAPABILITY_KEYS,
    ]);
  });

  it('passes structural validation for every declaration', () => {
    for (const capability of DECLARED_ANALYTICS_CAPABILITIES) {
      expect(validateAnalyticsCapabilityResult(capability)).toEqual([]);
    }
  });

  it('exercises every approved capability status at least once', () => {
    const statuses = new Set<AnalyticsCapabilityStatus>(
      DECLARED_ANALYTICS_CAPABILITIES.map((capability) => capability.status),
    );
    expect([...statuses].sort()).toEqual(
      [
        'insufficient-evidence',
        'partially-supported',
        'requires-new-fields',
        'requires-query-work',
        'requires-view',
        'supported',
        'unavailable',
      ].sort(),
    );
  });

  it('declares no supported scopes on non-executable capabilities', () => {
    for (const capability of DECLARED_ANALYTICS_CAPABILITIES) {
      if (!isAnalyticsCapabilityExecutable(capability)) {
        expect(capability.scopes.supported).toEqual([]);
      }
    }
  });

  it('carries a typed reason on every non-supported declaration', () => {
    for (const capability of DECLARED_ANALYTICS_CAPABILITIES) {
      if (capability.status !== 'supported') {
        expect(capability.reason.code.length).toBeGreaterThan(0);
        expect(capability.reason.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('never fabricates numeric coverage in a static declaration', () => {
    for (const capability of DECLARED_ANALYTICS_CAPABILITIES) {
      expect(capability.coverage).toBeUndefined();
    }
  });

  it('cites evidence whose production population is honestly unverified', () => {
    for (const capability of DECLARED_ANALYTICS_CAPABILITIES) {
      expect(capability.evidence).toBeDefined();
      expect(capability.evidence!.sources.length).toBeGreaterThan(0);
      for (const source of capability.evidence!.sources) {
        expect(source.verification).toBeDefined();
        expect(source.verification!.populationVerified).toBe(false);
      }
    }
  });

  it('names missing data on every requires-new-fields declaration', () => {
    const newFieldDeclarations = DECLARED_ANALYTICS_CAPABILITIES.filter(
      (capability) => capability.status === 'requires-new-fields',
    );
    expect(newFieldDeclarations.length).toBeGreaterThan(0);
    for (const capability of newFieldDeclarations) {
      expect(capability.missingData.length).toBeGreaterThan(0);
      expect(capability.remediation).toMatchObject({
        kind: 'remediable',
        historicalBackfillPossible: false,
      });
    }
  });

  it('supports the versioned sole-winner game differential while preserving the tie limitation', () => {
    const differential = getDeclaredAnalyticsCapability(
      'canonical-win-point-differential',
    );
    expect(differential).toMatchObject({
      status: 'supported',
      scopes: { supported: ['game'] },
      calculationVersion: {
        definitionId: 'metric:win-point-differential',
        version: '1',
      },
      reason: { code: 'approved-definition-missing' },
    });
  });

  it('declares evidenced scope support for placement and winners', () => {
    const placement = getDeclaredAnalyticsCapability('placement-and-winners');
    expect(placement).not.toBeNull();
    expect(placement!.status).toBe('supported');
    expect(placement!.scopes.supported).toEqual(['group', 'individual', 'game']);
    expect(describeUnsupportedScope(placement!, 'global')).toMatchObject({
      code: 'no-canonical-read-model',
    });
    expect(describeUnsupportedScope(placement!, 'comparison')).toMatchObject({
      code: 'unsupported-scope',
    });
  });

  it('keeps the unverified remote final-action RPC as insufficient evidence', () => {
    const finalActions = getDeclaredAnalyticsCapability(
      'final-terraforming-actions',
    );
    expect(finalActions).toMatchObject({
      status: 'insufficient-evidence',
      reason: { code: 'remote-contract-unverified' },
    });
    expect(finalActions!.evidence!.sources[0]).toMatchObject({
      kind: 'remote-rpc',
      verification: { schemaVerified: false, populationVerified: false },
    });
  });

  it('returns null for unknown capability keys', () => {
    expect(getDeclaredAnalyticsCapability('not-a-capability')).toBeNull();
  });

  it('is deeply immutable', () => {
    expect(Object.isFrozen(DECLARED_ANALYTICS_CAPABILITIES)).toBe(true);
    for (const capability of DECLARED_ANALYTICS_CAPABILITIES) {
      expect(Object.isFrozen(capability)).toBe(true);
      expect(Object.isFrozen(capability.scopes)).toBe(true);
      expect(Object.isFrozen(capability.scopes.supported)).toBe(true);
      if (capability.status !== 'supported') {
        expect(Object.isFrozen(capability.reason)).toBe(true);
      }
    }
  });
});
