/**
 * Analytics capability contracts (Phase 2, Step 2.1).
 *
 * A capability result answers "can this metric be produced here, and if not,
 * why?" with a typed reason instead of an empty chart. It is deliberately a
 * different contract from a metric value: capability state describes whether
 * a metric can be produced at all, `MetricValue` describes the value for an
 * evaluated subject, and a query error is neither. The three must never be
 * collapsed, and an empty row set is not proof that a capability is
 * unavailable.
 *
 * The seven public statuses are the approved Phase 2 vocabulary. Every
 * non-`supported` status carries a machine-readable reason code plus a
 * user-safe explanation, and only executable statuses (`supported`,
 * `partially-supported`) may declare supported scopes.
 */

import type { AnalyticsCoverage } from './coverage';
import type { AnalyticsCalculationVersion, AnalyticsEvidence } from './evidence';
import type { AnalyticsScopeType } from './scopes';

export const ANALYTICS_CAPABILITY_STATUSES = [
  'supported',
  'partially-supported',
  'unavailable',
  'requires-query-work',
  'requires-view',
  'requires-new-fields',
  'insufficient-evidence',
] as const;

export type AnalyticsCapabilityStatus =
  (typeof ANALYTICS_CAPABILITY_STATUSES)[number];

export function isAnalyticsCapabilityStatus(
  value: unknown,
): value is AnalyticsCapabilityStatus {
  return (
    typeof value === 'string' &&
    (ANALYTICS_CAPABILITY_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Stable machine-readable reason vocabulary. Codes describe why a capability
 * is limited; the paired explanation carries the user-safe wording.
 */
export const ANALYTICS_CAPABILITY_REASON_CODES = [
  'required-facts-not-persisted',
  'no-verified-event-writer',
  'no-canonical-read-model',
  'approved-view-or-rpc-missing',
  'remote-contract-unverified',
  'production-population-unverified',
  'approved-definition-missing',
  'source-timing-not-recorded',
  'partial-source-coverage',
  'unsupported-scope',
  'unsupported-subject',
] as const;

export type AnalyticsCapabilityReasonCode =
  (typeof ANALYTICS_CAPABILITY_REASON_CODES)[number];

export function isAnalyticsCapabilityReasonCode(
  value: unknown,
): value is AnalyticsCapabilityReasonCode {
  return (
    typeof value === 'string' &&
    (ANALYTICS_CAPABILITY_REASON_CODES as readonly string[]).includes(value)
  );
}

export type AnalyticsCapabilityReason = {
  code: AnalyticsCapabilityReasonCode;
  /** User-safe explanation. Must not leak internal implementation details. */
  explanation: string;
};

/** A named piece of data a capability requires. */
export type AnalyticsDataRequirement = {
  /** Stable requirement key, e.g. `card-purchase-facts`. */
  key: string;
  description: string;
};

/**
 * Whether a limitation can be fixed and, when remediable, whether honest
 * historical backfill is possible afterwards. New capture can make a
 * capability work for future games while historical games legitimately stay
 * unavailable — both facts are stated explicitly instead of implied.
 */
export type AnalyticsCapabilityRemediation = {
  kind: 'remediable' | 'permanent';
  /** Whether honest historical backfill is possible after remediation. */
  historicalBackfillPossible?: boolean;
  note?: string;
};

export type AnalyticsUnsupportedScopeDeclaration = {
  scope: AnalyticsScopeType;
  reason: AnalyticsCapabilityReason;
};

/**
 * Scope support declaration. `supported` lists scopes where the capability is
 * executable today. `unsupported` optionally documents specific scopes with
 * their own reasons; scopes in neither list are undeclared and treated as
 * unsupported — silence never claims support.
 */
export type AnalyticsScopeSupportDeclaration = {
  supported: readonly AnalyticsScopeType[];
  unsupported?: readonly AnalyticsUnsupportedScopeDeclaration[];
};

type AnalyticsCapabilityBase = {
  /** Stable capability key, e.g. `cards-purchased-by-generation`. */
  key: string;
  /** Optional human-readable title; display metadata, never identity. */
  title?: string;
  scopes: AnalyticsScopeSupportDeclaration;
  /** Data the capability needs in order to run. */
  requiredData?: readonly AnalyticsDataRequirement[];
  /** Required data that is not currently persisted or available. */
  missingData?: readonly AnalyticsDataRequirement[];
  /**
   * Available coverage when a caller actually measured it. Declarations must
   * not invent numbers: production coverage has never been audited, so static
   * declarations leave this undefined.
   */
  coverage?: AnalyticsCoverage;
  evidence?: AnalyticsEvidence;
  calculationVersion?: AnalyticsCalculationVersion;
  /** Whether the limitation is permanent or remediable, when known. */
  remediation?: AnalyticsCapabilityRemediation;
};

/** Required facts and an approved interpretation are available. */
export type SupportedAnalyticsCapability = AnalyticsCapabilityBase & {
  status: 'supported';
  /** Optional context note; a supported capability needs no blocking reason. */
  reason?: AnalyticsCapabilityReason;
};

/**
 * Useful lower-bound or subset evidence exists; incomplete coverage is
 * represented explicitly rather than promoted to an exact result.
 */
export type PartiallySupportedAnalyticsCapability = AnalyticsCapabilityBase & {
  status: 'partially-supported';
  reason: AnalyticsCapabilityReason;
};

/** The metric cannot be produced for this subject/context. */
export type UnavailableAnalyticsCapability = AnalyticsCapabilityBase & {
  status: 'unavailable';
  reason: AnalyticsCapabilityReason;
};

/**
 * Persisted facts appear sufficient, but a trustworthy read model does not
 * exist yet.
 */
export type RequiresQueryWorkAnalyticsCapability = AnalyticsCapabilityBase & {
  status: 'requires-query-work';
  reason: AnalyticsCapabilityReason;
};

/**
 * An approved server-side view/RPC or equivalent grouped query is required.
 */
export type RequiresViewAnalyticsCapability = AnalyticsCapabilityBase & {
  status: 'requires-view';
  reason: AnalyticsCapabilityReason;
};

/**
 * New persisted facts are required and historical values cannot be inferred.
 * `missingData` is mandatory: this status is meaningless without naming what
 * is missing.
 */
export type RequiresNewFieldsAnalyticsCapability = AnalyticsCapabilityBase & {
  status: 'requires-new-fields';
  reason: AnalyticsCapabilityReason;
  missingData: readonly AnalyticsDataRequirement[];
};

/**
 * A shape or remote object may exist, but its source, writer, identity,
 * coverage, or production population is unverified.
 */
export type InsufficientEvidenceAnalyticsCapability = AnalyticsCapabilityBase & {
  status: 'insufficient-evidence';
  reason: AnalyticsCapabilityReason;
};

export type AnalyticsCapabilityResult =
  | SupportedAnalyticsCapability
  | PartiallySupportedAnalyticsCapability
  | UnavailableAnalyticsCapability
  | RequiresQueryWorkAnalyticsCapability
  | RequiresViewAnalyticsCapability
  | RequiresNewFieldsAnalyticsCapability
  | InsufficientEvidenceAnalyticsCapability;

/** Capability results that cannot currently be executed. */
export type NonExecutableAnalyticsCapability = Exclude<
  AnalyticsCapabilityResult,
  SupportedAnalyticsCapability | PartiallySupportedAnalyticsCapability
>;

/** True when the capability can produce a result now (possibly partial). */
export function isAnalyticsCapabilityExecutable(
  capability: AnalyticsCapabilityResult,
): capability is
  | SupportedAnalyticsCapability
  | PartiallySupportedAnalyticsCapability {
  return (
    capability.status === 'supported' ||
    capability.status === 'partially-supported'
  );
}

/** Membership test against the declared supported scopes. */
export function isScopeSupportedByCapability(
  capability: AnalyticsCapabilityResult,
  scopeType: AnalyticsScopeType,
): boolean {
  return capability.scopes.supported.includes(scopeType);
}

/**
 * Reason a scope is not supported: the explicitly declared reason when one
 * exists, otherwise a generic `unsupported-scope` reason. Returns `null` when
 * the scope is supported.
 */
export function describeUnsupportedScope(
  capability: AnalyticsCapabilityResult,
  scopeType: AnalyticsScopeType,
): AnalyticsCapabilityReason | null {
  if (isScopeSupportedByCapability(capability, scopeType)) {
    return null;
  }
  const declared = capability.scopes.unsupported?.find(
    (entry) => entry.scope === scopeType,
  );
  if (declared !== undefined) {
    return declared.reason;
  }
  return {
    code: 'unsupported-scope',
    explanation: `This capability does not support the ${scopeType} scope`,
  };
}

function assertNeverStatus(value: never): never {
  throw new Error(
    `Unhandled analytics capability status: ${JSON.stringify(value)}`,
  );
}

/**
 * Neutral one-line description of each capability status. The exhaustive
 * switch guarantees at compile time that every status is handled.
 */
export function describeAnalyticsCapabilityStatus(
  status: AnalyticsCapabilityStatus,
): string {
  switch (status) {
    case 'supported':
      return 'Supported: required facts and an approved interpretation are available';
    case 'partially-supported':
      return 'Partially supported: subset or lower-bound evidence exists with incomplete coverage';
    case 'unavailable':
      return 'Unavailable: this metric cannot be produced for this context';
    case 'requires-query-work':
      return 'Requires query work: persisted facts appear sufficient, but no trustworthy read model exists yet';
    case 'requires-view':
      return 'Requires a database view: an approved server-side view or RPC is required';
    case 'requires-new-fields':
      return 'Requires new fields: new persisted facts are required and history cannot be inferred';
    case 'insufficient-evidence':
      return 'Insufficient evidence: a source may exist but is unverified';
    default:
      return assertNeverStatus(status);
  }
}

export const ANALYTICS_CAPABILITY_ISSUE_CODES = [
  'blank-key',
  'blank-reason-explanation',
  'duplicate-supported-scope',
  'duplicate-unsupported-scope',
  'conflicting-scope-declaration',
  'supported-scope-on-non-executable-status',
  'missing-required-missing-data',
  'blank-data-requirement-key',
  'duplicate-data-requirement-key',
  'missing-data-not-in-required-data',
] as const;

export type AnalyticsCapabilityIssueCode =
  (typeof ANALYTICS_CAPABILITY_ISSUE_CODES)[number];

export type AnalyticsCapabilityIssue = {
  code: AnalyticsCapabilityIssueCode;
  message: string;
  path?: string;
};

function dataRequirementIssues(
  requirements: readonly AnalyticsDataRequirement[],
  path: string,
): AnalyticsCapabilityIssue[] {
  const issues: AnalyticsCapabilityIssue[] = [];
  const seenKeys = new Set<string>();
  requirements.forEach((requirement, index) => {
    const entryPath = `${path}[${index}]`;
    if (requirement.key.trim() === '') {
      issues.push({
        code: 'blank-data-requirement-key',
        message: `"${entryPath}.key" must not be blank`,
        path: `${entryPath}.key`,
      });
    } else if (seenKeys.has(requirement.key)) {
      issues.push({
        code: 'duplicate-data-requirement-key',
        message: `Data requirement key "${requirement.key}" appears more than once in "${path}"`,
        path: entryPath,
      });
    } else {
      seenKeys.add(requirement.key);
    }
  });
  return issues;
}

/**
 * Structural validation of a capability result. Returns an empty array when
 * the result is well-formed. Notable rules: only executable statuses may
 * declare supported scopes, `requires-new-fields` must name its missing data,
 * and a scope cannot be declared both supported and unsupported.
 */
export function validateAnalyticsCapabilityResult(
  capability: AnalyticsCapabilityResult,
): readonly AnalyticsCapabilityIssue[] {
  const issues: AnalyticsCapabilityIssue[] = [];

  if (capability.key.trim() === '') {
    issues.push({
      code: 'blank-key',
      message: 'Capability key must not be blank',
      path: 'key',
    });
  }

  if (
    capability.reason !== undefined &&
    capability.reason.explanation.trim() === ''
  ) {
    issues.push({
      code: 'blank-reason-explanation',
      message: 'Capability reason explanation must not be blank',
      path: 'reason.explanation',
    });
  }

  const supportedSet = new Set<AnalyticsScopeType>();
  capability.scopes.supported.forEach((scope, index) => {
    if (supportedSet.has(scope)) {
      issues.push({
        code: 'duplicate-supported-scope',
        message: `Scope "${scope}" is declared supported more than once`,
        path: `scopes.supported[${index}]`,
      });
    } else {
      supportedSet.add(scope);
    }
  });

  const unsupportedSet = new Set<AnalyticsScopeType>();
  capability.scopes.unsupported?.forEach((entry, index) => {
    if (unsupportedSet.has(entry.scope)) {
      issues.push({
        code: 'duplicate-unsupported-scope',
        message: `Scope "${entry.scope}" is declared unsupported more than once`,
        path: `scopes.unsupported[${index}]`,
      });
    } else {
      unsupportedSet.add(entry.scope);
    }
    if (supportedSet.has(entry.scope)) {
      issues.push({
        code: 'conflicting-scope-declaration',
        message: `Scope "${entry.scope}" is declared both supported and unsupported`,
        path: `scopes.unsupported[${index}]`,
      });
    }
    if (entry.reason.explanation.trim() === '') {
      issues.push({
        code: 'blank-reason-explanation',
        message: `Unsupported-scope reason for "${entry.scope}" must not be blank`,
        path: `scopes.unsupported[${index}].reason.explanation`,
      });
    }
  });

  if (
    !isAnalyticsCapabilityExecutable(capability) &&
    capability.scopes.supported.length > 0
  ) {
    issues.push({
      code: 'supported-scope-on-non-executable-status',
      message: `A "${capability.status}" capability cannot declare supported scopes`,
      path: 'scopes.supported',
    });
  }

  if (
    capability.status === 'requires-new-fields' &&
    capability.missingData.length === 0
  ) {
    issues.push({
      code: 'missing-required-missing-data',
      message:
        'A requires-new-fields capability must name at least one missing data requirement',
      path: 'missingData',
    });
  }

  if (capability.requiredData !== undefined) {
    issues.push(
      ...dataRequirementIssues(capability.requiredData, 'requiredData'),
    );
  }
  if (capability.missingData !== undefined) {
    issues.push(
      ...dataRequirementIssues(capability.missingData, 'missingData'),
    );
    if (capability.requiredData !== undefined) {
      const requiredKeys = new Set(
        capability.requiredData.map((requirement) => requirement.key),
      );
      capability.missingData.forEach((requirement, index) => {
        if (!requiredKeys.has(requirement.key)) {
          issues.push({
            code: 'missing-data-not-in-required-data',
            message: `Missing data "${requirement.key}" is not listed in requiredData`,
            path: `missingData[${index}]`,
          });
        }
      });
    }
  }

  return issues;
}
