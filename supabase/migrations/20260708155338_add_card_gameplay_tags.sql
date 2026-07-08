alter table public.cards add column if not exists gameplay_tags text[] not null default '{}';

comment on column public.cards.gameplay_tags is 'Printed gameplay tags (building, space, power, science, jovian, earth, plant, microbe, animal, city, venus, wild, moon, event) sourced from the open-source terraforming-mars card data.';
