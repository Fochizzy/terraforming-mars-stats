import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_CAPABILITY_REASON_CODES,
  ANALYTICS_CAPABILITY_STATUSES,
  describeAnalyticsCapabilityStatus,
  describeUnsupportedScope,
  isAnalyticsCapabilityExecutable,
  isAnalyticsCapabilityReasonCode,
  isAnalyticsCapabilityStatus,
  isScopeSupportedByCapability,
  validateAnalyticsCapabilityResult,
  type AnalyticsCapabilityReason,
  type AnalyticsCapabilityResult,
} from './capabilities';

const genericReason: AnalyticsCapabilityReason = {
  code: 'required-facts-not-persisted',
  explanation: 'The required facts are not persisted.',
};

function capabilityWithStatus(
  status: AnalyticsCapabilityResult['status'],
): AnalyticsCapabilityResult {
  switch (status) {
    case 'supported':
      return {
        key: 'test-supported',
        status,
        scopes: { supported: ['group', 'individual'] },
      };
    case 'partially-supported':
      return {
        key: 'test-partial',
        status,
        reason: {
          code: 'partial-source-coverage',
          explanation: 'Only some sources are recorded.',
        },
        scopes: { supported: ['group'] },
      };
    case 'requires-new-fields':
      return {
        key: 'test-new-fields',
        status,
        reason: genericReason,
        scopes: { supported: [] },
        missingData: [
          { key: 'new-fact', description: 'A fact that must be captured.' },
        ],
      };
    case 'unavailable':
    case 'requires-query-work':
    case 'requires-view':
    case 'insufficient-evidence':
      return {
        key: `test-${status}`,
        status,
        reason: genericReason,
        scopes: { supported: [] },
      };
  }
}

describe('capability status vocabulary', () => {
  it('registers exactly the seven approved statuses', () => {
    expect(ANALYTICS_CAPABILITY_STATUSES).toEqual([
      'supported',
      'partially-supported',
      'unavailable',
      'requires-query-work',
      'requires-view',
      'requires-new-fields',
      'insufficient-evidence',
    ]);
  });

  it('guards status and reason-code membership at runtime', () => {
    for (const status of ANALYTICS_CAPABILITY_STATUSES) {
      expect(isAnalyticsCapabilityStatus(status)).toBe(true);
    }
    expect(isAnalyticsCapabilityStatus('coming-soon')).toBe(false);
    for (const code of ANALYTICS_CAPABILITY_REASON_CODES) {
      expect(isAnalyticsCapabilityReasonCode(code)).toBe(true);
    }
    expect(isAnalyticsCapabilityReasonCode('because')).toBe(false);
  });

  it('describes every status distinctly through the exhaustive switch', () => {
    const descriptions = ANALYTICS_CAPABILITY_STATUSES.map(
      describeAnalyticsCapabilityStatus,
    );
    expect(new Set(descriptions).size).toBe(
      ANALYTICS_CAPABILITY_STATUSES.length,
    );
    for (const description of descriptions) {
      expect(description.length).toBeGreaterThan(0);
    }
  });

  it('constructs and validates a well-formed result for every status', () => {
    for (const status of ANALYTICS_CAPABILITY_STATUSES) {
      const capability = capabilityWithStatus(status);
      expect(capability.status).toBe(status);
      expect(validateAnalyticsCapabilityResult(capability)).toEqual([]);
    }
  });

  it('treats only supported and partially-supported as executable', () => {
    for (const status of ANALYTICS_CAPABILITY_STATUSES) {
      const capability = capabilityWithStatus(status);
      expect(isAnalyticsCapabilityExecutable(capability)).toBe(
        status === 'supported' || status === 'partially-supported',
      );
    }
  });
});

describe('scope support declarations', () => {
  const capability: AnalyticsCapabilityResult = {
    key: 'test-scoped',
    status: 'supported',
    scopes: {
      supported: ['group', 'individual'],
      unsupported: [
        {
          scope: 'global',
          reason: {
            code: 'no-canonical-read-model',
            explanation: 'No global read model exists for this metric.',
          },
        },
      ],
    },
  };

  it('answers membership against the declared supported scopes', () => {
    expect(isScopeSupportedByCapability(capability, 'group')).toBe(true);
    expect(isScopeSupportedByCapability(capability, 'global')).toBe(false);
    expect(isScopeSupportedByCapability(capability, 'comparison')).toBe(false);
  });

  it('returns null for supported scopes and the declared reason otherwise', () => {
    expect(describeUnsupportedScope(capability, 'group')).toBeNull();
    expect(describeUnsupportedScope(capability, 'global')).toMatchObject({
      code: 'no-canonical-read-model',
    });
  });

  it('falls back to a generic unsupported-scope reason for undeclared scopes', () => {
    const reason = describeUnsupportedScope(capability, 'game');
    expect(reason).toMatchObject({ code: 'unsupported-scope' });
    expect(reason?.explanation).toContain('game');
  });
});

describe('validateAnalyticsCapabilityResult', () => {
  it('rejects a blank capability key', () => {
    expect(
      validateAnalyticsCapabilityResult({
        key: '  ',
        status: 'supported',
        scopes: { supported: [] },
      }),
    ).toContainEqual(expect.objectContaining({ code: 'blank-key' }));
  });

  it('rejects blank reason explanations everywhere they appear', () => {
    const issues = validateAnalyticsCapabilityResult({
      key: 'test',
      status: 'unavailable',
      reason: { code: 'required-facts-not-persisted', explanation: ' ' },
      scopes: {
        supported: [],
        unsupported: [
          {
            scope: 'global',
            reason: { code: 'unsupported-scope', explanation: '' },
          },
        ],
      },
    });
    expect(
      issues.filter((issue) => issue.code === 'blank-reason-explanation'),
    ).toHaveLength(2);
  });

  it('rejects duplicate and conflicting scope declarations', () => {
    const issues = validateAnalyticsCapabilityResult({
      key: 'test',
      status: 'supported',
      scopes: {
        supported: ['group', 'group'],
        unsupported: [
          { scope: 'group', reason: genericReason },
          { scope: 'group', reason: genericReason },
        ],
      },
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-supported-scope' }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-unsupported-scope' }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'conflicting-scope-declaration' }),
    );
  });

  it('forbids supported scopes on a non-executable status', () => {
    expect(
      validateAnalyticsCapabilityResult({
        key: 'test',
        status: 'requires-view',
        reason: genericReason,
        scopes: { supported: ['group'] },
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: 'supported-scope-on-non-executable-status',
      }),
    );
  });

  it('requires requires-new-fields to name its missing data', () => {
    expect(
      validateAnalyticsCapabilityResult({
        key: 'test',
        status: 'requires-new-fields',
        reason: genericReason,
        scopes: { supported: [] },
        missingData: [],
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'missing-required-missing-data' }),
    );
  });

  it('rejects blank and duplicate data-requirement keys', () => {
    const issues = validateAnalyticsCapabilityResult({
      key: 'test',
      status: 'supported',
      scopes: { supported: [] },
      requiredData: [
        { key: ' ', description: 'blank' },
        { key: 'fact', description: 'first' },
        { key: 'fact', description: 'second' },
      ],
    });
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'blank-data-requirement-key' }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-data-requirement-key' }),
    );
  });

  it('flags missing data that is not part of the declared required data', () => {
    expect(
      validateAnalyticsCapabilityResult({
        key: 'test',
        status: 'requires-new-fields',
        reason: genericReason,
        scopes: { supported: [] },
        requiredData: [{ key: 'fact-a', description: 'Known requirement.' }],
        missingData: [{ key: 'fact-b', description: 'Unknown requirement.' }],
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'missing-data-not-in-required-data' }),
    );
  });
});

describe('capability serializability', () => {
  it('round-trips every status through JSON without loss', () => {
    for (const status of ANALYTICS_CAPABILITY_STATUSES) {
      const capability = capabilityWithStatus(status);
      expect(JSON.parse(JSON.stringify(capability))).toEqual(capability);
    }
  });
});
