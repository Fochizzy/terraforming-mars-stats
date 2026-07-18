import { describe, expect, it } from 'vitest';
import { parseImportedGameMechanics } from './parse-game-mechanics';

describe('parseImportedGameMechanics', () => {
  it('assumes both mechanics are off when a non-empty exported log contains no Venus or Colony reference', () => {
    const result = parseImportedGameMechanics(
      ['[1/0]: Generation 1', '[1/1]: Alice played Mining Area.'].join('\n'),
    );

    expect(result.venus).toMatchObject({
      events: [],
      finalVenusScale: null,
      state: 'confirmed_absent',
    });
    expect(result.colonies).toMatchObject({
      events: [],
      state: 'confirmed_absent',
    });
  });

  it('reads canonical serialized options without treating a Venus-tagged card as evidence', () => {
    const result = parseImportedGameMechanics(
      ['{"gameOptions":{"venusNextExtension":false,"coloniesExtension":false}}', '[1/1]: Alice played Venusian Plants.'].join('\n'),
    );

    expect(result.venus.state).toBe('confirmed_absent');
    expect(result.colonies.state).toBe('confirmed_absent');
    expect(result.venus.events).toEqual([]);
    expect(result.colonies.events).toEqual([]);
  });

  it('captures attributed and unattributed Venus tracker movement from upstream export lines', () => {
    const result = parseImportedGameMechanics(
      [
        '{"gameOptions":{"venusNextExtension":true},"venusScaleLevel":8}',
        '[1/0]: Generation 2',
        '[3/10]: Alice increased Venus scale 2 step(s)',
        '[3/11]: World Government increased Venus scale 1 step(s)',
      ].join('\n'),
    );

    expect(result.venus.state).toBe('confirmed_present');
    expect(result.venus.finalVenusScale).toBe(8);
    expect(result.venus.events).toEqual([
      expect.objectContaining({
        eventKey: 'venus:2',
        generationNumber: 2,
        sourcePlayerName: 'Alice',
        trackerSteps: 2,
      }),
      expect.objectContaining({
        eventKey: 'venus:3',
        sourceEntity: 'World Government',
        sourcePlayerName: null,
        trackerSteps: 1,
      }),
    ]);
  });

  it('captures separate canonical Colony construction and trade actions', () => {
    const result = parseImportedGameMechanics(
      [
        '{"gameOptions":{"coloniesExtension":true}}',
        '[1/0]: Generation 3',
        '[4/18]: Alice built a colony on Titan',
        '[4/19]: Bob spent 3 energy to trade with Titan',
        '[4/20]: Alice spent 9 M€ to trade with Luna',
      ].join('\n'),
    );

    expect(result.colonies.state).toBe('confirmed_present');
    expect(result.colonies.events).toEqual([
      expect.objectContaining({
        colonyId: 'titan',
        eventType: 'built_colony',
        generationNumber: 3,
        sourcePlayerName: 'Alice',
      }),
      expect.objectContaining({
        colonyId: 'titan',
        eventType: 'traded_with_colony',
        paymentOrFleetInfo: '3 energy',
        sourcePlayerName: 'Bob',
      }),
      expect.objectContaining({
        colonyId: 'luna',
        eventType: 'traded_with_colony',
        paymentOrFleetInfo: '9 M€',
      }),
    ]);
  });

  it('keeps incomplete, unsupported, and conflicting evidence distinct from absence', () => {
    expect(parseImportedGameMechanics('').venus.state).toBe('incomplete_evidence');
    expect(
      parseImportedGameMechanics('Venus tracker awaiting unsupported source data')
        .venus.state,
    ).toBe('unsupported_log_pattern');
    expect(
      parseImportedGameMechanics(
        ['{"gameOptions":{"coloniesExtension":false}}', '[2/3]: Alice built a colony on Titan'].join('\n'),
      ).colonies.state,
    ).toBe('conflicting_evidence');
  });

  it('uses deterministic event identities on repeated parsing and never creates blank records', () => {
    const rawLog = '[2/3]: Alice built a colony on Titan\n[2/4]: Alice increased Venus scale 1 step(s)';
    const first = parseImportedGameMechanics(rawLog);
    const second = parseImportedGameMechanics(rawLog);

    expect(second.venus.events.map((event) => event.eventKey)).toEqual(
      first.venus.events.map((event) => event.eventKey),
    );
    expect(second.colonies.events.map((event) => event.eventKey)).toEqual(
      first.colonies.events.map((event) => event.eventKey),
    );
    expect(first.venus.events).not.toContainEqual(
      expect.objectContaining({ rawEvidence: '' }),
    );
    expect(first.colonies.events).not.toContainEqual(
      expect.objectContaining({ rawEvidence: '' }),
    );
  });
});
