insert into public.expansions (code, name)
values
  ('base', 'Base Game'),
  ('corporate_era', 'Corporate Era'),
  ('prelude', 'Prelude'),
  ('venus_next', 'Venus Next'),
  ('colonies', 'Colonies'),
  ('turmoil', 'Turmoil')
on conflict (code) do update
set name = excluded.name;

insert into public.maps (code, name)
values
  ('tharsis', 'Tharsis'),
  ('hellas', 'Hellas'),
  ('elysium', 'Elysium')
on conflict (code) do update
set name = excluded.name;

insert into public.style_definitions (code, name, description)
values
  (
    'balanced',
    'Balanced',
    'Mixes terraform rating, board scoring, and card points without leaning too hard on one lane.'
  ),
  (
    'board_control',
    'Board Control',
    'Leans heavily on cities, greenery, and map pressure to score through the board.'
  ),
  (
    'engine_building',
    'Engine Building',
    'Wins by assembling long-term production and repeatable card value over the game.'
  ),
  (
    'jovian_payoff',
    'Jovian Payoff',
    'Converts Jovian tags and multipliers into a large endgame card-points spike.'
  ),
  (
    'terraform_rush',
    'Terraform Rush',
    'Pushes terraform rating and pace aggressively to shorten the game and score through terraforming.'
  ),
  (
    'milestone_aggression',
    'Milestone Aggression',
    'Prioritizes fast milestone races and early board positioning to lock in fixed points.'
  ),
  (
    'award_pressure',
    'Award Pressure',
    'Invests in award funding and late conversion lines that capitalize on award scoring.'
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
