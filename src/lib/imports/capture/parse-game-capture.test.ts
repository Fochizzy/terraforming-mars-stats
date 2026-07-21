import { describe, expect, it } from 'vitest';
import { parseGameCapture } from './parse-game-capture';
import { CAPTURE_PARSER_VERSION } from './types';
import { captureFixtures, getFixture } from './__fixtures__/fixtures';

const SHA = 'a'.repeat(64);

function parse(id: string, overrides?: Partial<Parameters<typeof parseGameCapture>[0]>) {
  const fixture = getFixture(id);
  return parseGameCapture({ rawText: fixture.log, sourceSha256: SHA, ...overrides });
}

function parseRaw(lines: string[]) {
  return parseGameCapture({ rawText: lines.join('\n'), sourceSha256: SHA });
}

// An authoritative full-export shell (generations, an action, passes) wrapped
// around a single line under test, so state derivation sees a real export.
function fullExportWith(line: string): string[] {
  return [
    'Generation 1',
    'Ada played 16 Psyche',
    line,
    'Ada placed city tile at 19',
    'Ada passed',
    'Bruno passed',
    'Generation 2',
    'Bruno passed',
    'Ada passed',
  ];
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

const NINE_RAISES = 'venus_asteroid_raises';

describe('Venus raises in the observed asteroid-removal wording', () => {
  it('emits one canonical raise per upstream line', () => {
    const result = parse(NINE_RAISES);
    expect(result.venus.events).toHaveLength(9);
    expect(result.events.filter((event) => event.eventCategory === 'venus')).toHaveLength(9);
    for (const event of result.venus.events) {
      expect(event.eventCategory).toBe('venus');
      expect(event.eventType).toBe('venus_raised');
      expect(event.parameterType).toBe('venus');
      expect(event.canonicalEntityId).toBe('venus');
      expect(event.amount).toBe(1);
      expect(event.valueBefore).toBeNull();
      expect(event.valueAfter).toBeNull();
    }
  });

  it('orders raises by strictly increasing source line', () => {
    const lines = parse(NINE_RAISES).venus.events.map((event) => event.sourceLineNumber);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('assigns unique event uids that are identical across two parser runs', () => {
    const first = parse(NINE_RAISES).venus.events.map((event) => event.eventUid);
    const second = parse(NINE_RAISES).venus.events.map((event) => event.eventUid);
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(first.length);
  });

  it('resolves the actor and never stores an action clause as the player name', () => {
    const events = parse(NINE_RAISES).venus.events;
    for (const event of events) {
      expect(event.sourcePlayerName ?? '').not.toMatch(/removed|increase|asteroid|resource/i);
    }
    expect(events.some((event) => event.sourcePlayerName === 'Ada')).toBe(true);
    expect(events.some((event) => event.sourcePlayerName === 'Bruno')).toBe(true);
    // The World Government raise stays unattributed rather than guessed.
    const neutral = events.filter((event) => event.sourcePlayerName === null);
    expect(neutral).toHaveLength(1);
    expect(neutral[0].attributionStatus).toBe('unattributed');
  });

  it('confirms Venus presence without inventing a final scale or Colonies evidence', () => {
    const result = parse(NINE_RAISES);
    expect(result.venus.state).toBe('confirmed_present');
    // No terminal scale summary in the log: the final scale stays unknown.
    expect(result.venus.finalVenusScale).toBeNull();
    expect(result.colonies.state).toBe('confirmed_absent');
    expect(result.colonies.events).toHaveLength(0);
    expect(result.unsupported).toHaveLength(0);
    expect(result.coverage.unsupportedLines).toBe(0);
    expect(result.coverage.overallState).toBe('complete');
  });
});

describe('Venus step-count spellings', () => {
  it.each([
    ['Ada increased Venus scale 1 step', 1],
    ['Ada increased Venus scale 2 steps', 2],
    ['Ada increased Venus scale 2 step(s)', 2],
    ['Ada removed an asteroid resource to increase Venus scale 1 step', 1],
    ['Ada removed an asteroid resource to increase Venus scale 2 steps', 2],
    ['Ada removed an asteroid resource to increase Venus scale 2 step(s)', 2],
  ])('captures %s as a canonical raise', (line, amount) => {
    const result = parseRaw(fullExportWith(line as string));
    expect(result.venus.events).toHaveLength(1);
    const [event] = result.venus.events;
    expect(event.eventCategory).toBe('venus');
    expect(event.eventType).toBe('venus_raised');
    expect(event.parameterType).toBe('venus');
    expect(event.canonicalEntityId).toBe('venus');
    expect(event.amount).toBe(amount);
    expect(event.valueBefore).toBeNull();
    expect(event.valueAfter).toBeNull();
    expect(event.sourcePlayerName).toBe('Ada');
    expect(result.venus.state).toBe('confirmed_present');
    expect(result.unsupported).toHaveLength(0);
  });
});

describe('Venus unsupported-evidence policy', () => {
  it('retains a digit-bearing Venus mutation it cannot type as unsupported evidence', () => {
    const result = parseRaw(fullExportWith('Ada boosted the venus tracker by 3'));
    expect(result.venus.events).toHaveLength(0);
    expect(result.unsupported).toHaveLength(1);
    expect(result.unsupported[0].reason).toBe('unsupported_venus_wording');
    expect(result.unsupported[0].normalizedPattern).toBe('venus_reference_without_value');
    expect(result.unsupported[0].rawEvidence).toContain('venus tracker');
    expect(result.coverage.unsupportedLines).toBe(1);
    expect(result.coverage.overallState).toBe('partial');
    // A digit must never buy silence: absence would be an outright wrong answer.
    expect(result.venus.state).toBe('unsupported_log_pattern');
    expect(result.venus.state).not.toBe('confirmed_absent');
  });

  it.each([
    'Venus scale is 10',
    'Venus scale = 10',
    'Venus scale: 10',
    'Venus Next option: true',
    'Venus Next extension: false',
  ])('treats %s as a value line, not unsupported wording', (line) => {
    const result = parseRaw(fullExportWith(line));
    expect(result.unsupported).toHaveLength(0);
    expect(result.coverage.unsupportedLines).toBe(0);
  });

  it('keeps harvesting the terminal Venus scale from an explicit summary', () => {
    expect(parseRaw(fullExportWith('Venus scale is 10')).venus.finalVenusScale).toBe(10);
    expect(parseRaw(fullExportWith('Venus scale = 10')).venus.finalVenusScale).toBe(10);
    expect(parseRaw(fullExportWith('Venus scale: 10')).venus.finalVenusScale).toBe(10);
  });

  it('does not mistake an ordinary card play naming Venus for a Venus mechanic', () => {
    const result = parseRaw(fullExportWith('Ada played 11 Venus Governor'));
    expect(result.venus.events).toHaveLength(0);
    expect(result.unsupported).toHaveLength(0);
    expect(result.venus.state).not.toBe('confirmed_present');
    const played = result.events.filter((event) => event.eventType === 'card_played');
    expect(
      played.some((event) => (event.detail as { cardName?: string }).cardName === 'Venus Governor'),
    ).toBe(true);
  });
});

describe('capture fixture regressions', () => {
  it('reconfirms the declared expectation of every fixture', () => {
    expect(captureFixtures.length).toBeGreaterThanOrEqual(7);
    for (const fixture of captureFixtures) {
      const result = parseGameCapture({ rawText: fixture.log, sourceSha256: SHA });
      expect(result.venus.state, fixture.id).toBe(fixture.expected.venusState);
      expect(result.colonies.state, fixture.id).toBe(fixture.expected.coloniesState);
      expect(result.venus.finalVenusScale, fixture.id).toBe(fixture.expected.finalVenusScale);
      const types = new Set(result.events.map((event) => event.eventType));
      for (const expectedType of fixture.expected.notableEventTypes) {
        expect(types, `${fixture.id}: ${expectedType}`).toContain(expectedType);
      }
    }
  });

  it('keeps the capture parser version stable', () => {
    // The replacement RPC reuses the existing parser-run identity only while
    // this string is unchanged; a bump would fork a parallel parser run.
    expect(CAPTURE_PARSER_VERSION).toBe('tm-data-capture-v2');
    expect(parse('base_no_expansions').parserVersion).toBe('tm-data-capture-v2');
  });
});
