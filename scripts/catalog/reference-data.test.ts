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
      'ares',
      'community',
      'moon',
      'pathfinders',
      'ceo',
      'underworld',
      'star_wars',
      'delta_project',
    ]);

    expect(referenceDimensions.maps.map((entry) => entry.code)).toEqual([
      'tharsis',
      'hellas',
      'elysium',
      'amazonis_planitia',
      'arabia_terra',
      'terra_cimmeria',
      'terra_cimmeria_nova',
      'vastitas_borealis',
      'vastitas_borealis_nova',
      'utopia_planitia',
      'hollandia',
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

    expect(referenceDimensions.milestones.map((entry) => entry.code)).toEqual([
      'terraformer',
      'mayor',
      'gardener',
      'builder',
      'planner',
      'diversifier',
      'tactician',
      'polar_explorer',
      'energizer',
      'rim_settler',
      'generalist',
      'specialist',
      'ecologist',
      'tycoon',
      'legend',
      'colonizer',
      'forester',
      'minimalist',
      'terran',
      'tropicalist',
      'economizer',
      'pioneer',
      'land_specialist',
      'martian',
      't_collector',
      'firestarter',
      'terra_pioneer',
      'spacefarer',
      'gambler',
      'v_electrician',
      'smith',
      'tradesman',
      'irrigator',
      'capitalist',
      'researcher',
      'planetologist',
      'architect',
      'coastguard',
      'c_forester',
      'fundraiser',
      'agronomist',
      'v_spacefarer',
      'geologist',
      'engineer',
      'farmer',
    ]);

    expect(referenceDimensions.awards.map((entry) => entry.code)).toEqual([
      'landlord',
      'banker',
      'scientist',
      'thermalist',
      'miner',
      'cultivator',
      'magnate',
      'space_baron',
      'excentric',
      'contractor',
      'celebrity',
      'industrialist',
      'desert_settler',
      'estate_dealer',
      'benefactor',
      'curator',
      'a_engineer',
      'promoter',
      'tourist',
      'a_zoologist',
      'cosmic_settler',
      'botanist',
      'zoologist',
      'a_manufacturer',
      'biologist',
      'incorporator',
      't_politician',
      'urbanist',
      'warmonger',
      'forecaster',
      'edgedancer',
      'visionary',
      'naturalist',
      'voyager',
      'investor',
      'metropolist',
      'electrician',
      'founder',
      'mogul',
      'traveller',
      'landscaper',
      'highlander',
      'blacksmith',
    ]);

    const milestoneCountsByMap = Object.fromEntries(
      referenceDimensions.maps.map((map) => [
        map.code,
        referenceDimensions.mapMilestones.filter((entry) => entry.mapCode === map.code)
          .length,
      ]),
    );

    const awardCountsByMap = Object.fromEntries(
      referenceDimensions.maps.map((map) => [
        map.code,
        referenceDimensions.mapAwards.filter((entry) => entry.mapCode === map.code).length,
      ]),
    );

    expect(milestoneCountsByMap).toEqual({
      elysium: 5,
      hellas: 5,
      tharsis: 5,
      amazonis_planitia: 5,
      arabia_terra: 5,
      terra_cimmeria: 5,
      terra_cimmeria_nova: 5,
      vastitas_borealis: 5,
      vastitas_borealis_nova: 5,
      utopia_planitia: 5,
      hollandia: 0,
    });

    expect(awardCountsByMap).toEqual({
      elysium: 5,
      hellas: 5,
      tharsis: 5,
      amazonis_planitia: 5,
      arabia_terra: 5,
      terra_cimmeria: 5,
      terra_cimmeria_nova: 5,
      vastitas_borealis: 5,
      vastitas_borealis_nova: 5,
      utopia_planitia: 5,
      hollandia: 0,
    });
  });

  it('links only map, milestone, and award codes that are actually defined', () => {
    const mapCodes = new Set(referenceDimensions.maps.map((entry) => entry.code));
    const milestoneCodes = new Set(
      referenceDimensions.milestones.map((entry) => entry.code),
    );
    const awardCodes = new Set(referenceDimensions.awards.map((entry) => entry.code));

    for (const entry of referenceDimensions.mapMilestones) {
      expect(mapCodes).toContain(entry.mapCode);
      expect(milestoneCodes).toContain(entry.milestoneCode);
    }

    for (const entry of referenceDimensions.mapAwards) {
      expect(mapCodes).toContain(entry.mapCode);
      expect(awardCodes).toContain(entry.awardCode);
    }

    // No duplicate codes slipped into the dimension lists.
    expect(milestoneCodes.size).toBe(referenceDimensions.milestones.length);
    expect(awardCodes.size).toBe(referenceDimensions.awards.length);
  });
});
