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

export const referenceDimensions: {
  expansions: ExpansionSeed[];
  maps: MapSeed[];
  styles: StyleSeed[];
} = {
  expansions: [
    { code: 'base', name: 'Base Game' },
    { code: 'corporate_era', name: 'Corporate Era' },
    { code: 'prelude', name: 'Prelude' },
    { code: 'venus_next', name: 'Venus Next' },
    { code: 'colonies', name: 'Colonies' },
    { code: 'turmoil', name: 'Turmoil' },
  ],
  maps: [
    { code: 'tharsis', name: 'Tharsis' },
    { code: 'hellas', name: 'Hellas' },
    { code: 'elysium', name: 'Elysium' },
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
