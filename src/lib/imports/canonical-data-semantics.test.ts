import { describe, expect, it } from 'vitest';
import {
  MECHANIC_SEMANTIC_MATRIX,
  classifyFinalValueForState,
  classifyMeasuredValue,
  evaluateMechanicSemantics,
} from './canonical-data-semantics';

describe('canonical data semantics matrix', () => {
  it('never coerces a missing measured value into zero', () => {
    expect(classifyMeasuredValue({ applicable: true, value: null })).toBe(
      'missing',
    );
    expect(classifyMeasuredValue({ applicable: true, value: 0 })).toBe(
      'explicit_zero',
    );
    expect(classifyMeasuredValue({ applicable: true, value: 14 })).toBe(
      'present',
    );
    expect(classifyMeasuredValue({ applicable: false, value: null })).toBe(
      'not_applicable',
    );
  });

  it('confirmed-absent Venus: null final value is not applicable, zero events, no rows', () => {
    expect(
      evaluateMechanicSemantics({
        blankChildRowCount: 0,
        derivedEventCount: 0,
        eventRowCount: 0,
        finalValue: null,
        state: 'confirmed_absent',
      }),
    ).toEqual([]);
    expect(classifyFinalValueForState('confirmed_absent', null)).toBe(
      'not_applicable',
    );
    // An absence state with leftover activity claims is a violation, never a
    // silent reinterpretation.
    const violations = evaluateMechanicSemantics({
      blankChildRowCount: 0,
      derivedEventCount: 2,
      eventRowCount: 2,
      finalValue: 6,
      state: 'confirmed_absent',
    });
    expect(violations.map((violation) => violation.code).sort()).toEqual([
      'event_rows_for_absence_state',
      'final_value_for_absence_state',
      'nonzero_count_for_absence_state',
    ]);
  });

  it('unsupported Venus: null final value stays unknown and no zero-activity claim is made', () => {
    expect(
      evaluateMechanicSemantics({
        blankChildRowCount: 0,
        derivedEventCount: 0,
        eventRowCount: 0,
        finalValue: null,
        state: 'unsupported_log_pattern',
      }),
    ).toEqual([]);
    expect(classifyFinalValueForState('unsupported_log_pattern', null)).toBe(
      'missing',
    );
    expect(
      MECHANIC_SEMANTIC_MATRIX.unsupported_log_pattern.assertsActivityFact,
    ).toBe(false);
  });

  it('confirmed-present Venus with no supported event detail keeps partial coverage without blank rows', () => {
    expect(
      evaluateMechanicSemantics({
        blankChildRowCount: 0,
        derivedEventCount: 0,
        eventRowCount: 0,
        finalValue: null,
        state: 'confirmed_present',
      }),
    ).toEqual([]);
    expect(classifyFinalValueForState('confirmed_present', null)).toBe(
      'missing',
    );
    // A blank placeholder child row is a violation in every state.
    expect(
      evaluateMechanicSemantics({
        blankChildRowCount: 1,
        derivedEventCount: 1,
        eventRowCount: 1,
        finalValue: null,
        state: 'confirmed_present',
      }).map((violation) => violation.code),
    ).toContain('blank_child_rows');
  });

  it('historical owner-confirmed absence is not parser verified and carries no rows or value', () => {
    expect(
      evaluateMechanicSemantics({
        blankChildRowCount: 0,
        derivedEventCount: 0,
        eventRowCount: 0,
        finalValue: null,
        state: 'historical_owner_confirmed_absent',
      }),
    ).toEqual([]);
    expect(
      MECHANIC_SEMANTIC_MATRIX.historical_owner_confirmed_absent.verification,
    ).toBe('owner_confirmed');
    expect(
      MECHANIC_SEMANTIC_MATRIX.historical_parser_verified_owner_confirmed_absent
        .verification,
    ).toBe('parser_verified_and_owner_confirmed');
    expect(
      classifyFinalValueForState('historical_owner_confirmed_absent', null),
    ).toBe('not_applicable');
  });

  it('an explicit zero final value is preserved as a value in every state that permits one', () => {
    expect(classifyFinalValueForState('confirmed_present', 0)).toBe(
      'explicit_zero',
    );
    expect(classifyFinalValueForState('incomplete_evidence', 0)).toBe(
      'explicit_zero',
    );
  });
});
