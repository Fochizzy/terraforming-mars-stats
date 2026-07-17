/**
 * Typed eligibility and exclusion contracts (Phase 2, Step 2.3).
 *
 * Eligibility is evaluated before aggregation. It is not the same as a
 * missing observation, an unavailable capability, or insufficient evidence.
 * Every non-eligible state carries a structured, user-safe reason.
 */

import {
  isAnalyticsCapabilityExecutable,
  isScopeSupportedByCapability,
  type AnalyticsCapabilityResult,
  type NonExecutableAnalyticsCapability,
} from './capabilities';
import type { AnalyticsGameStatus } from './filters';
import type { AnalyticsScopeType } from './scopes';

export const ANALYTICS_ELIGIBILITY_REASON_CODES = [
  'missing-required-observation',
  'missing-numerator',
  'missing-denominator',
  'zero-denominator',
  'unsupported-analytics-scope',
  'unsupported-data-source',
  'unavailable-capability',
  'game-not-finalized',
  'import-missing-required-fields',
  'entity-not-present',
  'entity-identity-unresolved',
  'incompatible-expansion-set',
  'invalid-or-stale-filter',
  'metric-requirement-not-met',
  'incomplete-required-coverage',
  'insufficient-evidence',
  'authorization-restricted',
  'tie-policy-exclusion',
  'tied-first-policy-unresolved',
] as const;

export type AnalyticsEligibilityReasonCode =
  (typeof ANALYTICS_ELIGIBILITY_REASON_CODES)[number];

export type AnalyticsEligibilityReason = {
  code: AnalyticsEligibilityReasonCode;
  /** User-safe explanation; never a raw database, authorization, or driver error. */
  explanation: string;
  /** Optional stable requirement key that caused the decision. */
  requirementKey?: string;
};

export const ANALYTICS_ELIGIBILITY_STATUSES = [
  'eligible',
  'ineligible',
  'indeterminate',
  'unavailable',
  'not-applicable',
] as const;

export type AnalyticsEligibilityStatus =
  (typeof ANALYTICS_ELIGIBILITY_STATUSES)[number];

export type AnalyticsEligibilityResult =
  | { status: 'eligible' }
  | { status: 'ineligible'; reasons: readonly AnalyticsEligibilityReason[] }
  | { status: 'indeterminate'; reasons: readonly AnalyticsEligibilityReason[] }
  | {
      status: 'unavailable';
      reasons: readonly AnalyticsEligibilityReason[];
      capability?: NonExecutableAnalyticsCapability;
    }
  | { status: 'not-applicable'; reasons: readonly AnalyticsEligibilityReason[] };

export const ANALYTICS_GAME_OUTCOME_STATUSES = [
  'winner',
  'non-winner',
  'tied-first',
] as const;

export type AnalyticsGameOutcomeStatus =
  (typeof ANALYTICS_GAME_OUTCOME_STATUSES)[number];

export type AnalyticsEligibilityEvaluationInput = {
  applicable?: boolean;
  scope: AnalyticsScopeType;
  capability: AnalyticsCapabilityResult;
  requiresFinalizedGame?: boolean;
  gameStatus?: AnalyticsGameStatus;
  dataSource?: 'native' | 'imported';
  importedRequiredFields?: 'complete' | 'missing' | 'unknown';
  requiredObservation?: 'observed' | 'missing' | 'unknown' | 'unavailable';
  entityState?: 'present' | 'absent' | 'unresolved';
  outcome?: AnalyticsGameOutcomeStatus;
  tiedFirstPolicy?: 'include' | 'exclude' | 'unresolved';
};

function reason(
  code: AnalyticsEligibilityReasonCode,
  explanation: string,
): AnalyticsEligibilityReason {
  return { code, explanation };
}

/**
 * Applies only caller-declared eligibility requirements. It contains no
 * metric formula and no hidden global policy.
 */
export function evaluateAnalyticsEligibility(
  input: AnalyticsEligibilityEvaluationInput,
): AnalyticsEligibilityResult {
  if (input.applicable === false) {
    return {
      status: 'not-applicable',
      reasons: [reason('metric-requirement-not-met', 'This metric does not apply to the observation')],
    };
  }
  if (!isAnalyticsCapabilityExecutable(input.capability)) {
    return {
      status: 'unavailable',
      capability: input.capability,
      reasons: [
        reason(
          input.capability.status === 'insufficient-evidence'
            ? 'insufficient-evidence'
            : 'unavailable-capability',
          input.capability.reason.explanation,
        ),
      ],
    };
  }
  if (!isScopeSupportedByCapability(input.capability, input.scope)) {
    return {
      status: 'ineligible',
      reasons: [reason('unsupported-analytics-scope', `The ${input.scope} scope is not supported`)],
    };
  }
  if (input.entityState === 'absent') {
    return {
      status: 'ineligible',
      reasons: [reason('entity-not-present', 'The required entity is not present in this observation')],
    };
  }
  if (input.entityState === 'unresolved') {
    return {
      status: 'indeterminate',
      reasons: [reason('entity-identity-unresolved', 'The required entity identity is unresolved')],
    };
  }
  if (input.requiresFinalizedGame === true) {
    if (input.gameStatus === undefined) {
      return {
        status: 'indeterminate',
        reasons: [reason('game-not-finalized', 'The game finalization state is unknown')],
      };
    }
    if (input.gameStatus !== 'finalized') {
      return {
        status: 'ineligible',
        reasons: [reason('game-not-finalized', 'Only finalized games are eligible')],
      };
    }
  }
  if (input.dataSource === 'imported') {
    if (input.importedRequiredFields === 'missing') {
      return {
        status: 'ineligible',
        reasons: [
          reason(
            'import-missing-required-fields',
            'The imported record does not contain the fields required by this metric',
          ),
        ],
      };
    }
    if (input.importedRequiredFields === 'unknown') {
      return {
        status: 'indeterminate',
        reasons: [
          reason(
            'import-missing-required-fields',
            'Required imported-field coverage has not been verified',
          ),
        ],
      };
    }
  }
  if (input.requiredObservation === 'missing') {
    return {
      status: 'ineligible',
      reasons: [reason('missing-required-observation', 'A required observation was not recorded')],
    };
  }
  if (input.requiredObservation === 'unknown') {
    return {
      status: 'indeterminate',
      reasons: [reason('missing-required-observation', 'Required observation coverage is unknown')],
    };
  }
  if (input.requiredObservation === 'unavailable') {
    return {
      status: 'unavailable',
      reasons: [reason('unavailable-capability', 'The required observation cannot be produced')],
    };
  }
  if (input.outcome === 'tied-first') {
    if (input.tiedFirstPolicy === 'include') return { status: 'eligible' };
    if (input.tiedFirstPolicy === 'exclude') {
      return {
        status: 'ineligible',
        reasons: [reason('tie-policy-exclusion', 'Tied-first outcomes are excluded by the metric policy')],
      };
    }
    return {
      status: 'indeterminate',
      reasons: [
        reason(
          'tied-first-policy-unresolved',
          'The metric has no approved tied-first eligibility policy',
        ),
      ],
    };
  }
  return { status: 'eligible' };
}

export const ANALYTICS_ELIGIBILITY_ISSUE_CODES = [
  'missing-reason',
  'blank-reason-explanation',
  'executable-unavailable-capability',
] as const;

export type AnalyticsEligibilityIssueCode =
  (typeof ANALYTICS_ELIGIBILITY_ISSUE_CODES)[number];

export type AnalyticsEligibilityIssue = {
  code: AnalyticsEligibilityIssueCode;
  message: string;
  path?: string;
};

export function validateAnalyticsEligibilityResult(
  result: AnalyticsEligibilityResult,
): readonly AnalyticsEligibilityIssue[] {
  if (result.status === 'eligible') return [];
  const issues: AnalyticsEligibilityIssue[] = [];
  if (result.reasons.length === 0) {
    issues.push({
      code: 'missing-reason',
      message: `${result.status} eligibility requires at least one structured reason`,
      path: 'reasons',
    });
  }
  result.reasons.forEach((entry, index) => {
    if (entry.explanation.trim() === '') {
      issues.push({
        code: 'blank-reason-explanation',
        message: 'Eligibility reason explanation must not be blank',
        path: `reasons[${index}].explanation`,
      });
    }
  });
  if (
    result.status === 'unavailable' &&
    result.capability !== undefined &&
    isAnalyticsCapabilityExecutable(result.capability)
  ) {
    issues.push({
      code: 'executable-unavailable-capability',
      message: 'An executable capability cannot make eligibility unavailable',
      path: 'capability',
    });
  }
  return issues;
}
