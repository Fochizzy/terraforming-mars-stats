// One semantic matrix for canonical import data (Workstream 12).
//
// The import pipeline must never collapse distinct information states into one
// value. This module is the single place that defines those states and the
// invariants that connect a game-level mechanic state to its child evidence,
// so repositories, adapters, and reports evaluate them identically instead of
// re-deriving (or silently coercing) them locally.
//
// Facets, deliberately separate:
//   value semantics      – what a single measured value means
//   mechanic state       – what is known about Venus Next / Colonies for a game
//   attribution          – who performed an event, when that is explicit
//   verification         – how the state was established (parser vs owner)

import type {
  ExpansionDetectionState,
} from './parse-terraforming-mars-expansion-mechanics';

/** What one nullable measured value means. Zero is a value, not an absence. */
export type CanonicalValueSemantics =
  | 'explicit_zero'
  | 'present'
  | 'missing'
  | 'not_applicable';

/**
 * Classify a nullable measured value without coercion. `null` never becomes
 * zero; the caller must say whether the mechanic applies at all.
 */
export function classifyMeasuredValue(input: {
  applicable: boolean;
  value: number | null;
}): CanonicalValueSemantics {
  if (!input.applicable) {
    return 'not_applicable';
  }
  if (input.value === null) {
    return 'missing';
  }
  return input.value === 0 ? 'explicit_zero' : 'present';
}

/** Attribution of one canonical event. */
export type CanonicalAttributionSemantics =
  | 'attributed'
  | 'explicitly_unattributed'
  | 'unresolved'
  | 'not_applicable';

/** How a game-level mechanic state was established. */
export type CanonicalVerificationSemantics =
  | 'parser_verified'
  | 'owner_confirmed'
  | 'parser_verified_and_owner_confirmed'
  | 'unverified';

export type MechanicSemanticExpectation = {
  /** May canonical child event rows exist for this state? */
  allowsEventRows: boolean;
  /**
   * Must the derived event count be exactly zero? (For unsupported and
   * conflicting states the count is not a claim about activity at all, but a
   * blank child row is still never allowed.)
   */
  requiresZeroEventCount: boolean;
  /**
   * Whether a null final value is 'not_applicable' (absence states) or
   * 'missing' (present/unsupported/incomplete states, where the value simply
   * is not evidenced). It is never coerced to zero either way.
   */
  nullFinalValueMeans: Extract<
    CanonicalValueSemantics,
    'missing' | 'not_applicable'
  >;
  /** Verification the state carries by construction. */
  verification: CanonicalVerificationSemantics;
  /** Whether the state asserts anything about gameplay activity. */
  assertsActivityFact: boolean;
};

/**
 * The semantic matrix: for every mechanic state, what its child evidence and
 * final value are allowed to look like.
 */
export const MECHANIC_SEMANTIC_MATRIX: Record<
  ExpansionDetectionState,
  MechanicSemanticExpectation
> = {
  confirmed_present: {
    allowsEventRows: true,
    assertsActivityFact: true,
    nullFinalValueMeans: 'missing',
    requiresZeroEventCount: false,
    verification: 'parser_verified',
  },
  confirmed_absent: {
    allowsEventRows: false,
    assertsActivityFact: true,
    nullFinalValueMeans: 'not_applicable',
    requiresZeroEventCount: true,
    verification: 'parser_verified',
  },
  incomplete_evidence: {
    allowsEventRows: true,
    assertsActivityFact: false,
    nullFinalValueMeans: 'missing',
    requiresZeroEventCount: false,
    verification: 'parser_verified',
  },
  unsupported_log_pattern: {
    allowsEventRows: true,
    assertsActivityFact: false,
    nullFinalValueMeans: 'missing',
    requiresZeroEventCount: false,
    verification: 'parser_verified',
  },
  conflicting_evidence: {
    allowsEventRows: true,
    assertsActivityFact: false,
    nullFinalValueMeans: 'missing',
    requiresZeroEventCount: false,
    verification: 'parser_verified',
  },
  historical_parser_verified_owner_confirmed_absent: {
    allowsEventRows: false,
    assertsActivityFact: true,
    nullFinalValueMeans: 'not_applicable',
    requiresZeroEventCount: true,
    verification: 'parser_verified_and_owner_confirmed',
  },
  historical_owner_confirmed_absent: {
    allowsEventRows: false,
    assertsActivityFact: true,
    nullFinalValueMeans: 'not_applicable',
    requiresZeroEventCount: true,
    verification: 'owner_confirmed',
  },
};

export type MechanicSemanticObservation = {
  /** Number of canonical child event rows observed for the mechanic. */
  eventRowCount: number;
  /** Derived count column (e.g. venus_event_count). */
  derivedEventCount: number;
  /** Final measured value (e.g. final Venus scale); null is not zero. */
  finalValue: number | null;
  state: ExpansionDetectionState;
  /**
   * Rows whose required identity fields are blank (no source text, no
   * deterministic identity). Placeholder children are never allowed.
   */
  blankChildRowCount: number;
};

export type MechanicSemanticViolation = {
  code:
    | 'blank_child_rows'
    | 'event_rows_for_absence_state'
    | 'nonzero_count_for_absence_state'
    | 'final_value_for_absence_state';
  message: string;
};

/**
 * Evaluate one mechanic observation against the matrix. Returns violations
 * instead of throwing so reports can aggregate them.
 */
export function evaluateMechanicSemantics(
  observation: MechanicSemanticObservation,
): MechanicSemanticViolation[] {
  const expectation = MECHANIC_SEMANTIC_MATRIX[observation.state];
  const violations: MechanicSemanticViolation[] = [];

  if (observation.blankChildRowCount > 0) {
    violations.push({
      code: 'blank_child_rows',
      message: `${observation.blankChildRowCount} blank child row(s); placeholder children are never created`,
    });
  }
  if (!expectation.allowsEventRows && observation.eventRowCount > 0) {
    violations.push({
      code: 'event_rows_for_absence_state',
      message: `state ${observation.state} allows no event rows but ${observation.eventRowCount} exist`,
    });
  }
  if (expectation.requiresZeroEventCount && observation.derivedEventCount !== 0) {
    violations.push({
      code: 'nonzero_count_for_absence_state',
      message: `state ${observation.state} requires a zero event count but the derived count is ${observation.derivedEventCount}`,
    });
  }
  if (
    expectation.nullFinalValueMeans === 'not_applicable' &&
    observation.finalValue !== null
  ) {
    violations.push({
      code: 'final_value_for_absence_state',
      message: `state ${observation.state} is an absence state but a final value ${observation.finalValue} is asserted`,
    });
  }

  return violations;
}

/**
 * Meaning of a null final value for a mechanic state — 'not_applicable' for
 * absence states, 'missing' otherwise. Never zero.
 */
export function classifyFinalValueForState(
  state: ExpansionDetectionState,
  finalValue: number | null,
): CanonicalValueSemantics {
  if (finalValue !== null) {
    return finalValue === 0 ? 'explicit_zero' : 'present';
  }
  return MECHANIC_SEMANTIC_MATRIX[state].nullFinalValueMeans;
}
