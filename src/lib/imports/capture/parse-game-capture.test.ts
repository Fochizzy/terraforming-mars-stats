import { describe, expect, it } from 'vitest';
import { parseGameCapture } from './parse-game-capture';
import { getFixture } from './__fixtures__/fixtures';

const SHA = 'a'.repeat(64);

function parse(id: string, overrides?: Partial<Parameters<typeof parseGameCapture>[0]>) {
  const fixture = getFixture(id);
  return parseGameCapture({ rawText: fixture.log, sourceSha256: SHA, ...overrides });
}

describe('parseGameCapture', () => {
  it('confirms absence for a full base export and never returns final Venus scale of zero', () => {
    const result = parse('base_no_expansions');
    expect(result.venus.state).toBe('confirmed_absent');
    expect(result.colonies.state).toBe('confirmed_absent');
    // Missing-versus-zero: absent Venus has a null final scale, not zero.
    expect(result.venus.finalVenusScale).toBeNull();
    expect(result.venus.events).toHaveLength(0);
    expect(result.colonies.events).toHaveLength(0);

    const types = new Set(result.events.map((event) => event.eventType));
    for (const expectedType of getFixture('base_no_expansions').expected.notableEventTypes) {
      expect(types).toContain(expectedType);
    }
  });

  it('captures Venus presence with attributed and unattributed raises and a final scale', () => {
    const result = parse('venus_only');
    expect(result.venus.state).toBe('confirmed_present');
    expect(result.venus.finalVenusScale).toBe(10);

    const venusEvents = result.events.filter((event) => event.eventCategory === 'venus');
    expect(venusEvents.length).toBeGreaterThanOrEqual(3);
    // Ada raise is attributed; the World Government raise is unattributed.
    expect(venusEvents.some((event) => event.attributionStatus === 'explicit_unresolved')).toBe(true);
    expect(venusEvents.some((event) => event.attributionStatus === 'unattributed')).toBe(true);
    expect(venusEvents.every((event) => event.amount !== null)).toBe(true);
  });

  it('captures colony construction and trading with canonical colony ids', () => {
    const result = parse('colonies_only');
    expect(result.colonies.state).toBe('confirmed_present');

    const built = result.events.filter((event) => event.eventType === 'built_colony');
    const traded = result.events.filter((event) => event.eventType === 'traded_with_colony');
    expect(built.length).toBeGreaterThanOrEqual(3);
    expect(traded.length).toBeGreaterThanOrEqual(2);
    expect(built.every((event) => event.canonicalEntityId && /^[a-z0-9_]+$/.test(event.canonicalEntityId))).toBe(true);
    expect(built.some((event) => event.canonicalEntityId === 'titan')).toBe(true);
    expect(built.some((event) => event.canonicalEntityId === 'enceladus')).toBe(true);
  });

  it('detects both expansions together', () => {
    const result = parse('venus_and_colonies');
    expect(result.venus.state).toBe('confirmed_present');
    expect(result.colonies.state).toBe('confirmed_present');
    expect(result.venus.finalVenusScale).toBe(6);
  });

  it('preserves board row/position AND the flat space id for row/position placements', () => {
    const result = parse('row_position_board');
    const placements = result.placements;
    // "row 3 position 4" -> flat "17"; "row 4 position 2" -> "22"; ocean "row 5 position 5" -> "33".
    const city = placements.find((placement) => placement.tileType === 'city');
    expect(city?.boardRow).toBe(3);
    expect(city?.boardPosition).toBe(4);
    expect(city?.canonicalBoardSpaceId).toBe('17');
    expect(city?.upstreamNumericSpaceId).toBe(17);

    const ocean = placements.find((placement) => placement.tileType === 'ocean');
    expect(ocean?.boardRow).toBe(5);
    expect(ocean?.boardPosition).toBe(5);
    expect(ocean?.canonicalBoardSpaceId).toBe('33');
  });

  it('captures flat "at NN" placements with tile types and ownership', () => {
    const result = parse('base_no_expansions');
    const placements = result.placements;
    const city = placements.find((placement) => placement.canonicalBoardSpaceId === '19');
    expect(city?.tileType).toBe('city');
    expect(city?.upstreamNumericSpaceId).toBe(19);
    expect(city?.boardRow).toBeNull();
    expect(city?.ownershipState).toBe('owned');
    // Ocean placement is present as a placement.
    expect(placements.some((placement) => placement.tileType === 'ocean' && placement.canonicalBoardSpaceId === '44')).toBe(true);
  });

  it('retains unsupported wording as evidence and marks Venus unsupported (not absent)', () => {
    const result = parse('unsupported_venus_wording');
    expect(result.venus.state).toBe('unsupported_log_pattern');
    expect(result.unsupported.length).toBeGreaterThanOrEqual(1);
    expect(result.unsupported[0].rawEvidence).toContain('venus tracker');
    expect(result.unsupported[0].reason).toBe('unsupported_venus_wording');
  });

  it('yields deterministic event identities: identical for the same source, distinct per repeated action', () => {
    const first = parse('base_no_expansions');
    const second = parse('base_no_expansions');
    expect(first.events.map((event) => event.eventUid)).toEqual(
      second.events.map((event) => event.eventUid),
    );
    // The two "passed" lines are legitimate separate events with distinct ids.
    const passUids = first.events
      .filter((event) => event.eventType === 'player_passed')
      .map((event) => event.eventUid);
    expect(new Set(passUids).size).toBe(passUids.length);
    // No duplicate uids overall.
    const allUids = first.events.map((event) => event.eventUid);
    expect(new Set(allUids).size).toBe(allUids.length);
  });

  it('computes coverage telemetry and represents recognized actions', () => {
    const result = parse('base_no_expansions');
    expect(result.coverage.totalLines).toBeGreaterThan(0);
    expect(result.coverage.recognizedLines).toBe(result.coverage.totalLines);
    expect(result.coverage.representedByEvents).toBeGreaterThan(0);
    expect(result.coverage.overallState).toBe('complete');
    expect(result.coverage.unsupportedLines).toBe(0);
  });

  it('treats a blank log as incomplete evidence, not confirmed absence', () => {
    const result = parseGameCapture({ rawText: '', sourceSha256: SHA });
    expect(result.venus.state).toBe('incomplete_evidence');
    expect(result.colonies.state).toBe('incomplete_evidence');
    expect(result.coverage.overallState).toBe('unsupported_pattern');
  });

  it('detects a map confidently from objective evidence, else preserves ambiguity (never defaults to Tharsis)', () => {
    const withoutIndex = parse('base_no_expansions');
    expect(withoutIndex.mapDetection.detectionState).toBe('missing');
    expect(withoutIndex.mapDetection.detectedMapCode).toBeNull();
    // Ocean evidence is recorded regardless.
    expect((withoutIndex.mapDetection.oceanEvidence as { oceanPlacementCount: number }).oceanPlacementCount).toBeGreaterThan(0);

    const withIndex = parse('base_no_expansions', {
      objectiveMapIndex: {
        milestoneToMapCodes: new Map([['builder', ['tharsis']]]),
        awardToMapCodes: new Map([['banker', ['tharsis']]]),
      },
    });
    expect(withIndex.mapDetection.detectionState).toBe('confident');
    expect(withIndex.mapDetection.detectedMapCode).toBe('tharsis');
  });

  it('flags ambiguous map evidence when objectives point at multiple maps', () => {
    const result = parse('base_no_expansions', {
      objectiveMapIndex: {
        milestoneToMapCodes: new Map([['builder', ['tharsis']]]),
        awardToMapCodes: new Map([['banker', ['hellas']]]),
      },
    });
    expect(result.mapDetection.detectionState).toBe('ambiguous');
    expect(result.mapDetection.candidateMapCodes.sort()).toEqual(['hellas', 'tharsis']);
  });
});
