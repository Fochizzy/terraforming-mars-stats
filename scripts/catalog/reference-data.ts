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
  ],
  maps: [
    { code: 'tharsis', name: 'Tharsis' },
    { code: 'hellas', name: 'Hellas' },
    { code: 'elysium', name: 'Elysium' },
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
