import { describe, expect, it } from 'vitest';
import { referenceDimensions } from './reference-data';

describe('referenceDimensions', () => {
  it('ships the core expansion and map dimensions needed for setup defaults', () => {
    expect(referenceDimensions.expansions.map((entry) => entry.code)).toEqual([
      'base',
      'corporate_era',
      'prelude',
      'prelude_2',
      'venus_next',
      'colonies',
      'turmoil',
      'promo',
      'automa',
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

  it('ships promo-set groupings and map-specific milestone and award definitions', () => {
    expect(referenceDimensions.promoSets.map((entry) => entry.slug)).toEqual([
      'classic-promo-projects',
      'x-series-promos',
      'promo-corporations',
      'promo-global-events',
    ]);

    expect(referenceDimensions.milestones.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        'terraformer',
        'mayor',
        'gardener',
        'builder',
        'planner',
        'diversifier',
        'tycoon',
      ]),
    );

    expect(
      referenceDimensions.mapMilestones.filter((entry) => entry.mapCode === 'hellas'),
    ).toEqual(
      expect.arrayContaining([
        { mapCode: 'hellas', milestoneCode: 'diversifier' },
        { mapCode: 'hellas', milestoneCode: 'polar_explorer' },
      ]),
    );

    expect(
      referenceDimensions.mapAwards.filter((entry) => entry.mapCode === 'elysium'),
    ).toEqual(
      expect.arrayContaining([
        { mapCode: 'elysium', awardCode: 'celebrity' },
        { mapCode: 'elysium', awardCode: 'benefactor' },
      ]),
    );
  });
});
