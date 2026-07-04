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
      '2016-launch-kit-promos',
      '2017-boardgamegeek-promos',
      '2017-spielbox-promos',
      '2018-boardgamegeek-promos',
      '2018-dice-tower-promos',
      '2019-turmoil-promos',
      '2020-big-box-promos',
      '2021-seasonal-promos',
      '2021-spielbox-promos',
      '2022-seasonal-promos',
      '2023-seasonal-promos',
      '2023-spielbox-promos',
      '2024-prelude-2-promos',
      '2024-seasonal-promos',
      '2024-spielbox-promos',
      '2024-wsbg-promos',
      '2025-seasonal-promos',
      '2025-wsbg-promos',
      '2026-seasonal-promos',
    ]);

    expect(
      referenceDimensions.promoSets.find((entry) => entry.slug === '2019-turmoil-promos'),
    ).toMatchObject({
      display_name: 'Turmoil Promos',
      edition_label: 'Turmoil',
      promo_year: 2019,
    });

    expect(
      referenceDimensions.promoSets.find((entry) => entry.slug === '2026-seasonal-promos'),
    ).toMatchObject({
      display_name: 'Seasonal Promos',
      edition_label: 'Seasonal promo',
      promo_year: 2026,
    });

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
