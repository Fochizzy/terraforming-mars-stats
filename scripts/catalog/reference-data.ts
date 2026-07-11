import { fandomPromoSets } from './promo-fandom-data';

export type ExpansionSeed = {
  code: string;
  name: string;
};

export type MapSeed = {
  code: string;
  name: string;
};

export type StyleSeed = {
  code: string;
  description: string;
  name: string;
};

export type PromoSetSeed = {
  display_name: string;
  display_order: number;
  edition_label: string;
  promo_year: number | null;
  slug: string;
  source_attribution: string;
};

export type MilestoneSeed = {
  code: string;
  name: string;
};

export type AwardSeed = {
  code: string;
  name: string;
};

export type MapMilestoneSeed = {
  mapCode: string;
  milestoneCode: string;
};

export type MapAwardSeed = {
  awardCode: string;
  mapCode: string;
};

export const referenceDimensions: {
  expansions: ExpansionSeed[];
  maps: MapSeed[];
  promoSets: PromoSetSeed[];
  milestones: MilestoneSeed[];
  awards: AwardSeed[];
  mapMilestones: MapMilestoneSeed[];
  mapAwards: MapAwardSeed[];
  styles: StyleSeed[];
} = {
  expansions: [
    { code: 'base', name: 'Base Game' },
    { code: 'corporate_era', name: 'Corporate Era' },
    { code: 'prelude', name: 'Prelude' },
    { code: 'prelude_2', name: 'Prelude 2' },
    { code: 'venus_next', name: 'Venus Next' },
    { code: 'colonies', name: 'Colonies' },
    { code: 'turmoil', name: 'Turmoil' },
    { code: 'promo', name: 'Promo Cards' },
    { code: 'automa', name: 'Automa' },
    { code: 'ares', name: 'Ares' },
    { code: 'community', name: 'Community' },
    { code: 'moon', name: 'Moon' },
    // Modules the open-source app has added; corporations and preludes from
    // these carry the matching expansion_code.
    { code: 'pathfinders', name: 'Pathfinders' },
    { code: 'ceo', name: 'CEOs' },
    { code: 'underworld', name: 'Underworld' },
    { code: 'star_wars', name: 'Star Wars' },
    { code: 'delta_project', name: 'The Delta Project' },
  ],
  maps: [
    { code: 'tharsis', name: 'Tharsis' },
    { code: 'hellas', name: 'Hellas' },
    { code: 'elysium', name: 'Elysium' },
    { code: 'amazonis_planitia', name: 'Amazonis Planitia' },
    { code: 'arabia_terra', name: 'Arabia Terra' },
    { code: 'terra_cimmeria', name: 'Terra Cimmeria' },
    { code: 'vastitas_borealis', name: 'Vastitas Borealis' },
    { code: 'utopia_planitia', name: 'Utopia Planitia' },
  ],
  promoSets: fandomPromoSets,
  milestones: [
    { code: 'terraformer', name: 'Terraformer' },
    { code: 'mayor', name: 'Mayor' },
    { code: 'gardener', name: 'Gardener' },
    { code: 'builder', name: 'Builder' },
    { code: 'planner', name: 'Planner' },
    { code: 'diversifier', name: 'Diversifier' },
    { code: 'tactician', name: 'Tactician' },
    { code: 'polar_explorer', name: 'Polar Explorer' },
    { code: 'energizer', name: 'Energizer' },
    { code: 'rim_settler', name: 'Rim Settler' },
    { code: 'generalist', name: 'Generalist' },
    { code: 'specialist', name: 'Specialist' },
    { code: 'ecologist', name: 'Ecologist' },
    { code: 'tycoon', name: 'Tycoon' },
    { code: 'legend', name: 'Legend' },
    // Amazonis Planitia
    { code: 'colonizer', name: 'Colonizer' },
    { code: 'forester', name: 'Forester' },
    { code: 'minimalist', name: 'Minimalist' },
    { code: 'terran', name: 'Terran' },
    { code: 'tropicalist', name: 'Tropicalist' },
    // Arabia Terra
    { code: 'economizer', name: 'Economizer' },
    { code: 'pioneer', name: 'Pioneer' },
    { code: 'land_specialist', name: 'Land Specialist' },
    { code: 'martian', name: 'Martian' },
    // Terra Cimmeria
    { code: 't_collector', name: 'T. Collector' },
    { code: 'firestarter', name: 'Firestarter' },
    { code: 'terra_pioneer', name: 'Terra Pioneer' },
    { code: 'spacefarer', name: 'Spacefarer' },
    { code: 'gambler', name: 'Gambler' },
    // Vastitas Borealis
    { code: 'v_electrician', name: 'V. Electrician' },
    { code: 'smith', name: 'Smith' },
    { code: 'tradesman', name: 'Tradesman' },
    { code: 'irrigator', name: 'Irrigator' },
    { code: 'capitalist', name: 'Capitalist' },
    // Utopia Planitia
    { code: 'researcher', name: 'Researcher' },
  ],
  awards: [
    { code: 'landlord', name: 'Landlord' },
    { code: 'banker', name: 'Banker' },
    { code: 'scientist', name: 'Scientist' },
    { code: 'thermalist', name: 'Thermalist' },
    { code: 'miner', name: 'Miner' },
    { code: 'cultivator', name: 'Cultivator' },
    { code: 'magnate', name: 'Magnate' },
    { code: 'space_baron', name: 'Space Baron' },
    { code: 'excentric', name: 'Excentric' },
    { code: 'contractor', name: 'Contractor' },
    { code: 'celebrity', name: 'Celebrity' },
    { code: 'industrialist', name: 'Industrialist' },
    { code: 'desert_settler', name: 'Desert Settler' },
    { code: 'estate_dealer', name: 'Estate Dealer' },
    { code: 'benefactor', name: 'Benefactor' },
    // Amazonis Planitia
    { code: 'curator', name: 'Curator' },
    { code: 'a_engineer', name: 'A. Engineer' },
    { code: 'promoter', name: 'Promoter' },
    { code: 'tourist', name: 'Tourist' },
    { code: 'a_zoologist', name: 'A. Zoologist' },
    // Arabia Terra
    { code: 'cosmic_settler', name: 'Cosmic Settler' },
    { code: 'botanist', name: 'Botanist' },
    { code: 'zoologist', name: 'Zoologist' },
    { code: 'a_manufacturer', name: 'A. Manufacturer' },
    // Terra Cimmeria
    { code: 'biologist', name: 'Biologist' },
    { code: 'incorporator', name: 'Incorporator' },
    { code: 't_politician', name: 'T. Politician' },
    { code: 'urbanist', name: 'Urbanist' },
    { code: 'warmonger', name: 'Warmonger' },
    // Vastitas Borealis
    { code: 'forecaster', name: 'Forecaster' },
    { code: 'edgedancer', name: 'Edgedancer' },
    { code: 'visionary', name: 'Visionary' },
    { code: 'naturalist', name: 'Naturalist' },
    { code: 'voyager', name: 'Voyager' },
    // Utopia Planitia
    { code: 'investor', name: 'Investor' },
    { code: 'metropolist', name: 'Metropolist' },
  ],
  mapMilestones: [
    { mapCode: 'tharsis', milestoneCode: 'terraformer' },
    { mapCode: 'tharsis', milestoneCode: 'mayor' },
    { mapCode: 'tharsis', milestoneCode: 'gardener' },
    { mapCode: 'tharsis', milestoneCode: 'builder' },
    { mapCode: 'tharsis', milestoneCode: 'planner' },
    { mapCode: 'hellas', milestoneCode: 'diversifier' },
    { mapCode: 'hellas', milestoneCode: 'tactician' },
    { mapCode: 'hellas', milestoneCode: 'polar_explorer' },
    { mapCode: 'hellas', milestoneCode: 'energizer' },
    { mapCode: 'hellas', milestoneCode: 'rim_settler' },
    { mapCode: 'elysium', milestoneCode: 'generalist' },
    { mapCode: 'elysium', milestoneCode: 'specialist' },
    { mapCode: 'elysium', milestoneCode: 'ecologist' },
    { mapCode: 'elysium', milestoneCode: 'tycoon' },
    { mapCode: 'elysium', milestoneCode: 'legend' },
    { mapCode: 'amazonis_planitia', milestoneCode: 'colonizer' },
    { mapCode: 'amazonis_planitia', milestoneCode: 'forester' },
    { mapCode: 'amazonis_planitia', milestoneCode: 'minimalist' },
    { mapCode: 'amazonis_planitia', milestoneCode: 'terran' },
    { mapCode: 'amazonis_planitia', milestoneCode: 'tropicalist' },
    { mapCode: 'arabia_terra', milestoneCode: 'economizer' },
    { mapCode: 'arabia_terra', milestoneCode: 'pioneer' },
    { mapCode: 'arabia_terra', milestoneCode: 'land_specialist' },
    { mapCode: 'arabia_terra', milestoneCode: 'martian' },
    { mapCode: 'arabia_terra', milestoneCode: 'terran' },
    { mapCode: 'terra_cimmeria', milestoneCode: 't_collector' },
    { mapCode: 'terra_cimmeria', milestoneCode: 'firestarter' },
    { mapCode: 'terra_cimmeria', milestoneCode: 'terra_pioneer' },
    { mapCode: 'terra_cimmeria', milestoneCode: 'spacefarer' },
    { mapCode: 'terra_cimmeria', milestoneCode: 'gambler' },
    { mapCode: 'vastitas_borealis', milestoneCode: 'v_electrician' },
    { mapCode: 'vastitas_borealis', milestoneCode: 'smith' },
    { mapCode: 'vastitas_borealis', milestoneCode: 'tradesman' },
    { mapCode: 'vastitas_borealis', milestoneCode: 'irrigator' },
    { mapCode: 'vastitas_borealis', milestoneCode: 'capitalist' },
    { mapCode: 'utopia_planitia', milestoneCode: 'land_specialist' },
    { mapCode: 'utopia_planitia', milestoneCode: 'pioneer' },
    { mapCode: 'utopia_planitia', milestoneCode: 'tradesman' },
    { mapCode: 'utopia_planitia', milestoneCode: 'smith' },
    { mapCode: 'utopia_planitia', milestoneCode: 'researcher' },
  ],
  mapAwards: [
    { mapCode: 'tharsis', awardCode: 'landlord' },
    { mapCode: 'tharsis', awardCode: 'banker' },
    { mapCode: 'tharsis', awardCode: 'scientist' },
    { mapCode: 'tharsis', awardCode: 'thermalist' },
    { mapCode: 'tharsis', awardCode: 'miner' },
    { mapCode: 'hellas', awardCode: 'cultivator' },
    { mapCode: 'hellas', awardCode: 'magnate' },
    { mapCode: 'hellas', awardCode: 'space_baron' },
    { mapCode: 'hellas', awardCode: 'excentric' },
    { mapCode: 'hellas', awardCode: 'contractor' },
    { mapCode: 'elysium', awardCode: 'celebrity' },
    { mapCode: 'elysium', awardCode: 'industrialist' },
    { mapCode: 'elysium', awardCode: 'desert_settler' },
    { mapCode: 'elysium', awardCode: 'estate_dealer' },
    { mapCode: 'elysium', awardCode: 'benefactor' },
    { mapCode: 'amazonis_planitia', awardCode: 'curator' },
    { mapCode: 'amazonis_planitia', awardCode: 'a_engineer' },
    { mapCode: 'amazonis_planitia', awardCode: 'promoter' },
    { mapCode: 'amazonis_planitia', awardCode: 'tourist' },
    { mapCode: 'amazonis_planitia', awardCode: 'a_zoologist' },
    { mapCode: 'arabia_terra', awardCode: 'cosmic_settler' },
    { mapCode: 'arabia_terra', awardCode: 'botanist' },
    { mapCode: 'arabia_terra', awardCode: 'promoter' },
    { mapCode: 'arabia_terra', awardCode: 'zoologist' },
    { mapCode: 'arabia_terra', awardCode: 'a_manufacturer' },
    { mapCode: 'terra_cimmeria', awardCode: 'biologist' },
    { mapCode: 'terra_cimmeria', awardCode: 'incorporator' },
    { mapCode: 'terra_cimmeria', awardCode: 't_politician' },
    { mapCode: 'terra_cimmeria', awardCode: 'urbanist' },
    { mapCode: 'terra_cimmeria', awardCode: 'warmonger' },
    { mapCode: 'vastitas_borealis', awardCode: 'forecaster' },
    { mapCode: 'vastitas_borealis', awardCode: 'edgedancer' },
    { mapCode: 'vastitas_borealis', awardCode: 'visionary' },
    { mapCode: 'vastitas_borealis', awardCode: 'naturalist' },
    { mapCode: 'vastitas_borealis', awardCode: 'voyager' },
    { mapCode: 'utopia_planitia', awardCode: 'edgedancer' },
    { mapCode: 'utopia_planitia', awardCode: 'investor' },
    { mapCode: 'utopia_planitia', awardCode: 'botanist' },
    { mapCode: 'utopia_planitia', awardCode: 'incorporator' },
    { mapCode: 'utopia_planitia', awardCode: 'metropolist' },
  ],
  styles: [
    {
      code: 'balanced',
      description:
        'Mixes terraform rating, board scoring, and card points without leaning too hard on one lane.',
      name: 'Balanced',
    },
    {
      code: 'board_control',
      description:
        'Leans heavily on cities, greenery, and map pressure to score through the board.',
      name: 'Board Control',
    },
    {
      code: 'engine_building',
      description:
        'Wins by assembling long-term production and repeatable card value over the game.',
      name: 'Engine Building',
    },
    {
      code: 'jovian_payoff',
      description:
        'Converts Jovian tags and multipliers into a large endgame card-points spike.',
      name: 'Jovian Payoff',
    },
    {
      code: 'terraform_rush',
      description:
        'Pushes TR and pace aggressively to shorten the game and score through terraforming.',
      name: 'Terraform Rush',
    },
    {
      code: 'milestone_aggression',
      description:
        'Prioritizes fast milestone races and early board positioning to lock in fixed points.',
      name: 'Milestone Aggression',
    },
    {
      code: 'award_pressure',
      description:
        'Invests in award funding and late conversion lines that capitalize on award scoring.',
      name: 'Award Pressure',
    },
  ],
};
