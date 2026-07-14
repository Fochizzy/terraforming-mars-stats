-- Backfill milestone and award reference data for projects created before
-- these dimensions were seeded alongside the core maps.

insert into public.milestones (code, name)
values
  ('terraformer', 'Terraformer'),
  ('mayor', 'Mayor'),
  ('gardener', 'Gardener'),
  ('builder', 'Builder'),
  ('planner', 'Planner'),
  ('diversifier', 'Diversifier'),
  ('tactician', 'Tactician'),
  ('polar_explorer', 'Polar Explorer'),
  ('energizer', 'Energizer'),
  ('rim_settler', 'Rim Settler'),
  ('generalist', 'Generalist'),
  ('specialist', 'Specialist'),
  ('ecologist', 'Ecologist'),
  ('tycoon', 'Tycoon'),
  ('legend', 'Legend')
on conflict (code) do update
set name = excluded.name;
insert into public.awards (code, name)
values
  ('landlord', 'Landlord'),
  ('banker', 'Banker'),
  ('scientist', 'Scientist'),
  ('thermalist', 'Thermalist'),
  ('miner', 'Miner'),
  ('cultivator', 'Cultivator'),
  ('magnate', 'Magnate'),
  ('space_baron', 'Space Baron'),
  ('excentric', 'Excentric'),
  ('contractor', 'Contractor'),
  ('celebrity', 'Celebrity'),
  ('industrialist', 'Industrialist'),
  ('desert_settler', 'Desert Settler'),
  ('estate_dealer', 'Estate Dealer'),
  ('benefactor', 'Benefactor')
on conflict (code) do update
set name = excluded.name;
insert into public.map_milestones (map_id, milestone_id)
select maps.id, milestones.id
from (
  values
    ('tharsis', 'terraformer'),
    ('tharsis', 'mayor'),
    ('tharsis', 'gardener'),
    ('tharsis', 'builder'),
    ('tharsis', 'planner'),
    ('hellas', 'diversifier'),
    ('hellas', 'tactician'),
    ('hellas', 'polar_explorer'),
    ('hellas', 'energizer'),
    ('hellas', 'rim_settler'),
    ('elysium', 'generalist'),
    ('elysium', 'specialist'),
    ('elysium', 'ecologist'),
    ('elysium', 'tycoon'),
    ('elysium', 'legend')
) as relation(map_code, milestone_code)
join public.maps maps
  on maps.code = relation.map_code
join public.milestones milestones
  on milestones.code = relation.milestone_code
on conflict (map_id, milestone_id) do nothing;
insert into public.map_awards (map_id, award_id)
select maps.id, awards.id
from (
  values
    ('tharsis', 'landlord'),
    ('tharsis', 'banker'),
    ('tharsis', 'scientist'),
    ('tharsis', 'thermalist'),
    ('tharsis', 'miner'),
    ('hellas', 'cultivator'),
    ('hellas', 'magnate'),
    ('hellas', 'space_baron'),
    ('hellas', 'excentric'),
    ('hellas', 'contractor'),
    ('elysium', 'celebrity'),
    ('elysium', 'industrialist'),
    ('elysium', 'desert_settler'),
    ('elysium', 'estate_dealer'),
    ('elysium', 'benefactor')
) as relation(map_code, award_code)
join public.maps maps
  on maps.code = relation.map_code
join public.awards awards
  on awards.code = relation.award_code
on conflict (map_id, award_id) do nothing;
