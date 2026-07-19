import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TERRAFORMING_MARS_VENUS_COLONIES_PARSER_VERSION,
  parseTerraformingMarsExpansionMechanics,
} from './parse-terraforming-mars-expansion-mechanics';

const playerAId = '00000000-0000-4000-8000-000000000001';
const playerBId = '00000000-0000-4000-8000-000000000002';
const playerResolutions = [
  { selectedPlayerId: playerAId, sourcePlayerText: 'Player A' },
  { selectedPlayerId: playerBId, sourcePlayerText: 'Player B' },
];

function fixture(name: string) {
  return readFileSync(
    resolve(process.cwd(), 'src/lib/imports/fixtures', name),
    'utf8',
  );
}

describe('parseTerraformingMarsExpansionMechanics', () => {
  it('parses the upstream-source-backed Venus, construction, trade, and track messages', () => {
    const result = parseTerraformingMarsExpansionMechanics({
      exportedLogText: fixture('upstream-venus-colonies-action-fragment.txt'),
      playerResolutions,
    });

    expect(result.parserVersion).toBe(
      TERRAFORMING_MARS_VENUS_COLONIES_PARSER_VERSION,
    );
    expect(result.venusNext.state).toBe('confirmed_present');
    expect(result.colonies.state).toBe('confirmed_present');
    expect(result.sourceCoverage).toMatchObject({
      complete: true,
      generationNumbers: [3, 4],
      lineCount: 12,
      parsedMechanicLineCount: 8,
      unsupportedLineCount: 0,
    });
    expect(result.events).toHaveLength(8);
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'venus_scale_increased',
          generationNumber: 3,
          parameterSteps: 2,
          playerId: playerAId,
          trEffect: 2,
        }),
        expect.objectContaining({
          attribution: 'world_government',
          eventType: 'venus_scale_increased',
          parameterSteps: 1,
          playerId: null,
          trEffect: 0,
        }),
        expect.objectContaining({
          colonyId: 'luna',
          eventType: 'colony_built',
          playerId: playerAId,
        }),
        expect.objectContaining({
          colonyId: 'ceres',
          eventType: 'colony_setup_added',
          playerId: playerAId,
        }),
        expect.objectContaining({
          colonyId: 'ganymede',
          eventType: 'colony_traded',
          paymentAmount: 3,
          paymentResource: 'energy',
          playerId: playerBId,
        }),
        expect.objectContaining({
          colonyId: 'titan',
          eventType: 'colony_track_increased',
          parameterSteps: 1,
        }),
        expect.objectContaining({
          colonyId: 'europa',
          eventType: 'colony_traded',
          paymentAmount: null,
        }),
      ]),
    );
    expect(result.unresolvedPlayerAssociations).toEqual([]);
    expect(result.finalVenusScale).toBeNull();
  });

  it('keeps related cards in a full retained real export from confirming Colonies', () => {
    const exportedLogText = fixture(
      'retained-real-negative-game-2026-07-15.txt',
    );
    const ordinary = parseTerraformingMarsExpansionMechanics({
      exportedLogText,
      playerResolutions,
    });
    const historical = parseTerraformingMarsExpansionMechanics({
      exportedLogText,
      historicalOwnerConfirmedAbsent: true,
      playerResolutions,
    });

    expect(exportedLogText).toContain('Interstellar Colony Ship');
    expect(ordinary.events).toEqual([]);
    expect(ordinary.colonies.state).toBe('confirmed_absent');
    expect(ordinary.venusNext.state).toBe('confirmed_absent');
    expect(historical.colonies.state).toBe(
      'historical_parser_verified_owner_confirmed_absent',
    );
    expect(historical.venusNext.state).toBe(
      'historical_parser_verified_owner_confirmed_absent',
    );
    expect(historical.sourceCoverage.complete).toBe(true);
  });

  it('honors trusted explicit present and absent option evidence without a manual field', () => {
    const exportedLogText = [
      'Generation 1',
      'Final greenery placement',
      'This game id was option-evidence',
    ].join('\n');
    const absent = parseTerraformingMarsExpansionMechanics({
      exportedLogText,
      optionEvidence: {
        colonies: false,
        originalEvidence: 'exported options: venus=true colonies=false',
        source: 'exported_game_options',
        venusNext: true,
      },
    });

    expect(absent.venusNext.state).toBe('confirmed_present');
    expect(absent.colonies.state).toBe('confirmed_absent');

    const conflict = parseTerraformingMarsExpansionMechanics({
      exportedLogText: `${exportedLogText}\nPlayer A built a colony on Luna`,
      optionEvidence: {
        colonies: false,
        originalEvidence: 'exported options: colonies=false',
        source: 'exported_game_options',
        venusNext: null,
      },
      playerResolutions,
    });
    expect(conflict.colonies.state).toBe('conflicting_evidence');
  });

  it('keeps incomplete, unsupported, and conflicting evidence distinct', () => {
    const incomplete = parseTerraformingMarsExpansionMechanics({
      exportedLogText: 'Generation 1\nPlayer A gained 2 TR',
      playerResolutions,
    });
    expect(incomplete.venusNext.state).toBe('incomplete_evidence');
    expect(incomplete.colonies.state).toBe('incomplete_evidence');
    expect(incomplete.events).toEqual([]);

    const unsupported = parseTerraformingMarsExpansionMechanics({
      exportedLogText: [
        'Generation 1',
        'Player A calibrated the Venus scale unusually',
        'Final greenery placement',
        'This game id was unsupported',
      ].join('\n'),
      playerResolutions,
    });
    expect(unsupported.venusNext.state).toBe('unsupported_log_pattern');
    expect(unsupported.venusNext.unsupportedLineNumbers).toEqual([2]);

    const historicalConflict = parseTerraformingMarsExpansionMechanics({
      exportedLogText: [
        'Generation 1',
        'Player A raised the Venus scale 1 step',
        'Final greenery placement',
        'This game id was conflict',
      ].join('\n'),
      historicalOwnerConfirmedAbsent: true,
      playerResolutions,
    });
    expect(historicalConflict.venusNext.state).toBe('conflicting_evidence');
  });

  it('preserves explicit final Venus evidence and rejects invalid or inferred values', () => {
    const base = 'Generation 1\nFinal greenery placement\nThis game id was venus-final';
    const explicit = parseTerraformingMarsExpansionMechanics({
      exportedLogText: base,
      finalVenusScaleEvidence: {
        generationNumber: 8,
        originalEvidence: 'Result PDF final Venus scale 22%',
        source: 'result_pdf',
        value: 22,
      },
    });
    expect(explicit.finalVenusScale).toBe(22);
    expect(explicit.venusNext.state).toBe('confirmed_present');

    const invalid = parseTerraformingMarsExpansionMechanics({
      exportedLogText: base,
      finalVenusScaleEvidence: {
        originalEvidence: 'Result PDF final Venus scale 21%',
        source: 'result_pdf',
        value: 21,
      },
    });
    expect(invalid.finalVenusScale).toBeNull();
    expect(invalid.venusNext.state).toBe('conflicting_evidence');

    const movementOnly = parseTerraformingMarsExpansionMechanics({
      exportedLogText:
        'Player A raised the Venus scale 2 step(s)\nFinal greenery placement\nThis game id was no-interpolation',
      playerResolutions,
    });
    expect(movementOnly.finalVenusScale).toBeNull();
    expect(movementOnly.events[0]).toMatchObject({
      generationNumber: null,
      parameterAfter: null,
      parameterBefore: null,
      parameterSteps: 2,
    });
  });

  it('accepts a result-PDF Venus contribution column as trusted Venus option evidence without inferring Colonies', () => {
    const base = [
      'Generation 1',
      'Final greenery placement',
      'This game id was pdf-venus-option',
    ].join('\n');
    const result = parseTerraformingMarsExpansionMechanics({
      exportedLogText: base,
      optionEvidence: {
        colonies: null,
        originalEvidence:
          'The result PDF global-parameter table includes a Venus contribution column.',
        source: 'result_pdf_global_parameters',
        venusNext: true,
      },
    });

    // Presence of the Venus column confirms Venus Next is enabled.
    expect(result.venusNext.state).toBe('confirmed_present');
    expect(result.venusNext.evidence).toContain(
      'The result PDF global-parameter table includes a Venus contribution column.',
    );
    // The PDF carries no Colonies option evidence, so a complete zero-event log
    // still resolves Colonies from log evidence alone rather than inferring it.
    expect(result.colonies.state).toBe('confirmed_absent');
    // The PDF does not print the final Venus scale, so it remains missing.
    expect(result.finalVenusScale).toBeNull();
  });

  it('parses multiple players, payment variants, and unresolved colony/player evidence without guessing', () => {
    const result = parseTerraformingMarsExpansionMechanics({
      exportedLogText: [
        'Generation 5',
        'Player A spent 1 floater to trade with Titan',
        'Player B used Darkside Smugglers Union action to trade with Pluto',
        'Unknown Player built a colony on Unknown Colony',
        'Player A gained 20 M€ from a card',
        'Final greenery placement',
        'This game id was variants',
      ].join('\n'),
      playerResolutions,
    });

    expect(result.events).toHaveLength(3);
    expect(result.events[0]).toMatchObject({
      colonyId: 'titan',
      paymentAmount: 1,
      paymentResource: 'floaters',
      playerId: playerAId,
    });
    expect(result.events[1]).toMatchObject({
      colonyId: 'pluto',
      playerId: playerBId,
      sourceEntity: 'Darkside Smugglers Union',
    });
    expect(result.events[2]).toMatchObject({
      colonyId: null,
      colonyName: 'Unknown Colony',
      confidenceLevel: 'reviewed',
      playerId: null,
    });
    expect(result.colonies.state).toBe('unsupported_log_pattern');
    expect(result.unresolvedPlayerAssociations).toEqual([
      expect.objectContaining({ actor: 'Unknown Player', lineNumber: 4 }),
    ]);
  });

  it('emits stable event identities so retries do not create a new event identity', () => {
    const input = {
      exportedLogText: fixture('upstream-venus-colonies-action-fragment.txt'),
      playerResolutions,
    };
    const first = parseTerraformingMarsExpansionMechanics(input);
    const second = parseTerraformingMarsExpansionMechanics(input);

    expect(first.duplicateEventCount).toBe(0);
    expect(first.events.map((event) => event.eventIdentity)).toEqual(
      second.events.map((event) => event.eventIdentity),
    );
    expect(new Set(first.events.map((event) => event.eventIdentity)).size).toBe(
      first.events.length,
    );
  });
});
