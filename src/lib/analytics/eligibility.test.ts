import { describe, expect, it } from 'vitest';
import type {
  NonExecutableAnalyticsCapability,
  SupportedAnalyticsCapability,
} from './capabilities';
import {
  evaluateAnalyticsEligibility,
  validateAnalyticsEligibilityResult,
  type AnalyticsEligibilityResult,
} from './eligibility';

const supportedCapability: SupportedAnalyticsCapability = {
  key: 'placement-and-winners',
  status: 'supported',
  scopes: { supported: ['group', 'individual'] },
};

const blockedCapability: NonExecutableAnalyticsCapability = {
  key: 'cards-purchased-by-generation',
  status: 'requires-new-fields',
  reason: {
    code: 'required-facts-not-persisted',
    explanation: 'Card purchase facts are not persisted.',
  },
  scopes: { supported: [] },
  missingData: [
    { key: 'card-purchase-facts', description: 'Card purchase event facts.' },
  ],
};

describe('evaluateAnalyticsEligibility', () => {
  it('marks a supported scope and observed finalized game as eligible', () => {
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        requiresFinalizedGame: true,
        gameStatus: 'finalized',
        requiredObservation: 'observed',
      }),
    ).toEqual({ status: 'eligible' });
  });

  it('separates unsupported scope from unavailable capability', () => {
    expect(
      evaluateAnalyticsEligibility({
        scope: 'global',
        capability: supportedCapability,
      }),
    ).toMatchObject({
      status: 'ineligible',
      reasons: [expect.objectContaining({ code: 'unsupported-analytics-scope' })],
    });
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: blockedCapability,
      }),
    ).toMatchObject({
      status: 'unavailable',
      reasons: [expect.objectContaining({ code: 'unavailable-capability' })],
    });
  });

  it('distinguishes draft games from unknown finalization state', () => {
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        requiresFinalizedGame: true,
        gameStatus: 'draft',
      }),
    ).toMatchObject({ status: 'ineligible' });
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        requiresFinalizedGame: true,
      }),
    ).toMatchObject({ status: 'indeterminate' });
  });

  it('handles imported records with missing or unverified required fields', () => {
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        dataSource: 'imported',
        importedRequiredFields: 'missing',
      }),
    ).toMatchObject({
      status: 'ineligible',
      reasons: [
        expect.objectContaining({ code: 'import-missing-required-fields' }),
      ],
    });
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        dataSource: 'imported',
        importedRequiredFields: 'unknown',
      }),
    ).toMatchObject({ status: 'indeterminate' });
  });

  it('keeps absent entities, unresolved identities, and missing observations distinct', () => {
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        entityState: 'absent',
      }),
    ).toMatchObject({ status: 'ineligible' });
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        entityState: 'unresolved',
      }),
    ).toMatchObject({ status: 'indeterminate' });
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        requiredObservation: 'missing',
      }),
    ).toMatchObject({
      status: 'ineligible',
      reasons: [
        expect.objectContaining({ code: 'missing-required-observation' }),
      ],
    });
  });

  it('applies tied-first outcome policy only when the caller declares one', () => {
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        outcome: 'tied-first',
        tiedFirstPolicy: 'include',
      }),
    ).toEqual({ status: 'eligible' });
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        outcome: 'tied-first',
        tiedFirstPolicy: 'exclude',
      }),
    ).toMatchObject({
      status: 'ineligible',
      reasons: [expect.objectContaining({ code: 'tie-policy-exclusion' })],
    });
    expect(
      evaluateAnalyticsEligibility({
        scope: 'group',
        capability: supportedCapability,
        outcome: 'tied-first',
        tiedFirstPolicy: 'unresolved',
      }),
    ).toMatchObject({
      status: 'indeterminate',
      reasons: [
        expect.objectContaining({ code: 'tied-first-policy-unresolved' }),
      ],
    });
  });
});

describe('validateAnalyticsEligibilityResult', () => {
  it('requires every non-eligible result to carry a structured reason', () => {
    const result: AnalyticsEligibilityResult = {
      status: 'ineligible',
      reasons: [],
    };
    expect(validateAnalyticsEligibilityResult(result)).toContainEqual(
      expect.objectContaining({ code: 'missing-reason' }),
    );
  });

  it('rejects blank reason explanations', () => {
    expect(
      validateAnalyticsEligibilityResult({
        status: 'indeterminate',
        reasons: [{ code: 'metric-requirement-not-met', explanation: ' ' }],
      }),
    ).toContainEqual(
      expect.objectContaining({ code: 'blank-reason-explanation' }),
    );
  });

  it('rejects an executable capability attached to unavailable eligibility', () => {
    const forged: AnalyticsEligibilityResult = {
      status: 'unavailable',
      reasons: [
        { code: 'unavailable-capability', explanation: 'Not available.' },
      ],
      capability:
        supportedCapability as unknown as NonExecutableAnalyticsCapability,
    };
    expect(validateAnalyticsEligibilityResult(forged)).toContainEqual(
      expect.objectContaining({ code: 'executable-unavailable-capability' }),
    );
  });
});
