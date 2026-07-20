import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildGameExpansionFactInput,
  parseTerraformingMarsExpansionMechanics,
} from './parse-terraforming-mars-expansion-mechanics';

// Direct tests for buildGameExpansionFactInput (audit F-09/H4): the exact
// persistence input the import action hands to saveGameExpansionFacts,
// derived here from REAL parser output over the labelled fixtures.

function fixture(name: string) {
  return readFileSync(
    resolve(process.cwd(), 'src/lib/imports/fixtures', name),
    'utf8',
  ).trim();
}

const resolutions = [
  { selectedPlayerId: 'player-a', sourcePlayerText: 'Player A' },
  { selectedPlayerId: 'player-b', sourcePlayerText: 'Player B' },
];

describe('buildGameExpansionFactInput', () => {
  it('maps a Venus-positive parse to confirmed_present with true counts and a null final scale', () => {
    const parse = parseTerraformingMarsExpansionMechanics({
      exportedLogText: fixture('synthetic-venus-only-full-export.txt'),
      optionEvidence: null,
      playerResolutions: resolutions,
    });
    const input = buildGameExpansionFactInput(parse);

    expect(input.venusNextState).toBe('confirmed_present');
    expect(input.coloniesState).toBe('confirmed_absent');
    expect(input.venusEventCount).toBe(
      parse.events.filter((event) => event.eventType.startsWith('venus_'))
        .length,
    );
    expect(input.venusEventCount).toBeGreaterThanOrEqual(4);
    expect(input.colonyBuiltCount).toBe(0);
    expect(input.colonyTradeCount).toBe(0);
    // No accepted source prints the final Venus scale: missing stays null,
    // never zero.
    expect(input.finalVenusScale).toBeNull();
    expect(input.parserVersion).toBe(parse.parserVersion);
  });

  it('counts colony builds and trades from typed events only', () => {
    const parse = parseTerraformingMarsExpansionMechanics({
      exportedLogText: fixture('synthetic-colonies-only-full-export.txt'),
      optionEvidence: null,
      playerResolutions: resolutions,
    });
    const input = buildGameExpansionFactInput(parse);

    expect(input.coloniesState).toBe('confirmed_present');
    expect(input.venusNextState).toBe('confirmed_absent');
    expect(input.colonyBuiltCount).toBeGreaterThanOrEqual(1);
    expect(input.colonyTradeCount).toBeGreaterThanOrEqual(2);
    expect(input.colonyBuiltCount).toBe(
      parse.events.filter((event) => event.eventType === 'colony_built')
        .length,
    );
    expect(input.colonyTradeCount).toBe(
      parse.events.filter((event) => event.eventType === 'colony_traded')
        .length,
    );
    expect(input.venusEventCount).toBe(0);
    expect(input.finalVenusScale).toBeNull();
  });

  it('keeps unsupported wording unsupported with zero fabricated activity', () => {
    const parse = parseTerraformingMarsExpansionMechanics({
      exportedLogText: fixture(
        'synthetic-unsupported-venus-colonies-full-export.txt',
      ),
      optionEvidence: null,
      playerResolutions: resolutions,
    });
    const input = buildGameExpansionFactInput(parse);

    expect(input.venusNextState).toBe('unsupported_log_pattern');
    expect(input.coloniesState).toBe('unsupported_log_pattern');
    expect(input.venusEventCount).toBe(0);
    expect(input.colonyBuiltCount).toBe(0);
    expect(input.colonyTradeCount).toBe(0);
    expect(input.finalVenusScale).toBeNull();
    // The unsupported lines stay reviewable in the provenance block.
    expect(
      (
        input.detectionProvenance[
          'venus_unsupported_line_numbers'
        ] as number[]
      ).length,
    ).toBeGreaterThan(0);
  });

  it('preserves a conflict between positive events and explicit absent option evidence', () => {
    const parse = parseTerraformingMarsExpansionMechanics({
      exportedLogText: fixture('synthetic-venus-only-full-export.txt'),
      optionEvidence: {
        colonies: false,
        originalEvidence:
          'Synthetic explicit-option evidence: Venus Next and Colonies disabled.',
        source: 'result_pdf_global_parameters',
        venusNext: false,
      },
      playerResolutions: resolutions,
    });
    const input = buildGameExpansionFactInput(parse);

    expect(input.venusNextState).toBe('conflicting_evidence');
    expect(input.finalVenusScale).toBeNull();
    // The conflicting evidence is preserved, never resolved into absence or
    // presence by the fact builder.
    expect(input.detectionProvenance['venus_evidence']).toBeTruthy();
  });
});
