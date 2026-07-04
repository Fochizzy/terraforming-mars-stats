import { describe, expect, it } from 'vitest';
import { referenceDimensions } from './reference-data';

describe('referenceDimensions', () => {
  it('ships the core expansion and map dimensions needed for setup defaults', () => {
    expect(referenceDimensions.expansions.map((entry) => entry.code)).toEqual([
      'base',
      'corporate_era',
      'prelude',
      'venus_next',
      'colonies',
      'turmoil',
    ]);

    expect(referenceDimensions.maps.map((entry) => entry.code)).toEqual([
      'tharsis',
      'hellas',
      'elysium',
    ]);
  });

  it('ships starter style definitions for declared and inferred style stats', () => {
    expect(referenceDimensions.styles.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        'balanced',
        'board_control',
        'engine_building',
        'jovian_payoff',
        'terraform_rush',
      ]),
    );
  });
});
