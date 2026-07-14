-- Seed the additional official Terraforming Mars maps (Amazonis Planitia,
-- Arabia Terra, Terra Cimmeria, Vastitas Borealis, Utopia Planitia) alongside
-- their milestones and awards. Milestone/award names are shared across some of
-- these maps, so each name is inserted once and linked via map_milestones /
-- map_awards. Mirrors scripts/catalog/reference-data.ts.

insert into public.maps (code, name)
values
  ('amazonis_planitia', 'Amazonis Planitia'),
  ('arabia_terra', 'Arabia Terra'),
  ('terra_cimmeria', 'Terra Cimmeria'),
  ('vastitas_borealis', 'Vastitas Borealis'),
  ('utopia_planitia', 'Utopia Planitia')
on conflict (code) do update
set name = excluded.name;

insert into public.milestones (code, name)
values
  ('colonizer', 'Colonizer'),
  ('forester', 'Forester'),
  ('minimalist', 'Minimalist'),
  ('terran', 'Terran'),
  ('tropicalist', 'Tropicalist'),
  ('economizer', 'Economizer'),
  ('pioneer', 'Pioneer'),
  ('land_specialist', 'Land Specialist'),
  ('martian', 'Martian'),
  ('t_collector', 'T. Collector'),
  ('firestarter', 'Firestarter'),
  ('terra_pioneer', 'Terra Pioneer'),
  ('spacefarer', 'Spacefarer'),
  ('gambler', 'Gambler'),
  ('v_electrician', 'V. Electrician'),
  ('smith', 'Smith'),
  ('tradesman', 'Tradesman'),
  ('irrigator', 'Irrigator'),
  ('capitalist', 'Capitalist'),
  ('researcher', 'Researcher')
on conflict (code) do update
set name = excluded.name;

insert into public.awards (code, name)
values
  ('curator', 'Curator'),
  ('a_engineer', 'A. Engineer'),
  ('promoter', 'Promoter'),
  ('tourist', 'Tourist'),
  ('a_zoologist', 'A. Zoologist'),
  ('cosmic_settler', 'Cosmic Settler'),
  ('botanist', 'Botanist'),
  ('zoologist', 'Zoologist'),
  ('a_manufacturer', 'A. Manufacturer'),
  ('biologist', 'Biologist'),
  ('incorporator', 'Incorporator'),
  ('t_politician', 'T. Politician'),
  ('urbanist', 'Urbanist'),
  ('warmonger', 'Warmonger'),
  ('forecaster', 'Forecaster'),
  ('edgedancer', 'Edgedancer'),
  ('visionary', 'Visionary'),
  ('naturalist', 'Naturalist'),
  ('voyager', 'Voyager'),
  ('investor', 'Investor'),
  ('metropolist', 'Metropolist')
on conflict (code) do update
set name = excluded.name;

insert into public.map_milestones (map_id, milestone_id)
select maps.id, milestones.id
from (
  values
    ('amazonis_planitia', 'colonizer'),
    ('amazonis_planitia', 'forester'),
    ('amazonis_planitia', 'minimalist'),
    ('amazonis_planitia', 'terran'),
    ('amazonis_planitia', 'tropicalist'),
    ('arabia_terra', 'economizer'),
    ('arabia_terra', 'pioneer'),
    ('arabia_terra', 'land_specialist'),
    ('arabia_terra', 'martian'),
    ('arabia_terra', 'terran'),
    ('terra_cimmeria', 't_collector'),
    ('terra_cimmeria', 'firestarter'),
    ('terra_cimmeria', 'terra_pioneer'),
    ('terra_cimmeria', 'spacefarer'),
    ('terra_cimmeria', 'gambler'),
    ('vastitas_borealis', 'v_electrician'),
    ('vastitas_borealis', 'smith'),
    ('vastitas_borealis', 'tradesman'),
    ('vastitas_borealis', 'irrigator'),
    ('vastitas_borealis', 'capitalist'),
    ('utopia_planitia', 'land_specialist'),
    ('utopia_planitia', 'pioneer'),
    ('utopia_planitia', 'tradesman'),
    ('utopia_planitia', 'smith'),
    ('utopia_planitia', 'researcher')
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
    ('amazonis_planitia', 'curator'),
    ('amazonis_planitia', 'a_engineer'),
    ('amazonis_planitia', 'promoter'),
    ('amazonis_planitia', 'tourist'),
    ('amazonis_planitia', 'a_zoologist'),
    ('arabia_terra', 'cosmic_settler'),
    ('arabia_terra', 'botanist'),
    ('arabia_terra', 'promoter'),
    ('arabia_terra', 'zoologist'),
    ('arabia_terra', 'a_manufacturer'),
    ('terra_cimmeria', 'biologist'),
    ('terra_cimmeria', 'incorporator'),
    ('terra_cimmeria', 't_politician'),
    ('terra_cimmeria', 'urbanist'),
    ('terra_cimmeria', 'warmonger'),
    ('vastitas_borealis', 'forecaster'),
    ('vastitas_borealis', 'edgedancer'),
    ('vastitas_borealis', 'visionary'),
    ('vastitas_borealis', 'naturalist'),
    ('vastitas_borealis', 'voyager'),
    ('utopia_planitia', 'edgedancer'),
    ('utopia_planitia', 'investor'),
    ('utopia_planitia', 'botanist'),
    ('utopia_planitia', 'incorporator'),
    ('utopia_planitia', 'metropolist')
) as relation(map_code, award_code)
join public.maps maps
  on maps.code = relation.map_code
join public.awards awards
  on awards.code = relation.award_code
on conflict (map_id, award_id) do nothing;;
