alter table public.cards
  add column if not exists last_synced_at timestamptz;

comment on column public.cards.last_synced_at is
  'Last successful automatic comparison with the upstream Terraforming Mars Cards manifest.';

-- The upstream card manifest does not prove that an absent global-parameter
-- effect is zero. If these analytics columns are present in the deployed
-- schema, newly discovered cards must therefore be allowed to retain null.
do $$
declare
  effect_column text;
begin
  foreach effect_column in array array[
    'card_effect_temperature_steps',
    'card_effect_oxygen_steps',
    'card_effect_ocean_steps',
    'card_effect_venus_steps',
    'card_effect_tr_steps'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cards'
        and column_name = effect_column
    ) then
      execute format(
        'alter table public.cards alter column %I drop not null, alter column %I drop default',
        effect_column,
        effect_column
      );
    end if;
  end loop;
end
$$;

create table if not exists public.terraforming_mars_tile_types (
  id uuid primary key default gen_random_uuid(),
  source_tile_id integer not null unique check (source_tile_id >= 0),
  canonical_code text not null unique,
  canonical_name text not null unique,
  board text not null check (board in ('mars', 'moon')),
  kind text not null check (kind in ('city', 'greenery', 'ocean', 'special')),
  counts_as_city boolean not null default false,
  counts_as_greenery boolean not null default false,
  counts_as_ocean boolean not null default false,
  is_hazard boolean not null default false,
  source_attribution text not null,
  source_version text not null,
  sync_metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.terraforming_mars_tile_types is
  'Complete upstream TileType registry used to resolve Mars and Moon placement logs, including special tiles.';

alter table public.terraforming_mars_tile_types enable row level security;

drop policy if exists "Authenticated users can view Terraforming Mars tile types"
  on public.terraforming_mars_tile_types;
create policy "Authenticated users can view Terraforming Mars tile types"
  on public.terraforming_mars_tile_types
  for select
  to authenticated
  using (true);

grant select on public.terraforming_mars_tile_types to authenticated;

insert into public.terraforming_mars_tile_types (
  source_tile_id,
  canonical_code,
  canonical_name,
  board,
  kind,
  counts_as_city,
  counts_as_greenery,
  counts_as_ocean,
  is_hazard,
  source_attribution,
  source_version,
  sync_metadata
)
select
  seed.source_tile_id,
  seed.canonical_code,
  seed.canonical_name,
  seed.board,
  seed.kind,
  seed.counts_as_city,
  seed.counts_as_greenery,
  seed.counts_as_ocean,
  seed.is_hazard,
  'https://github.com/terraforming-mars/terraforming-mars/tree/7a6f98f09ac2a558969c092d317c313806af7b73',
  '7a6f98f09ac2a558969c092d317c313806af7b73',
  jsonb_build_object('seededFromUpstreamRegistry', true)
from (
  values
    (0, 'greenery', 'greenery', 'mars', 'greenery', false, true, false, false),
    (1, 'ocean', 'ocean', 'mars', 'ocean', false, false, true, false),
    (2, 'city', 'city', 'mars', 'city', true, false, false, false),
    (3, 'capital', 'Capital', 'mars', 'special', true, false, false, false),
    (4, 'commercial_district', 'Commercial District', 'mars', 'special', false, false, false, false),
    (5, 'ecological_zone', 'Ecological Zone', 'mars', 'special', false, false, false, false),
    (6, 'industrial_center', 'Industrial Center', 'mars', 'special', false, false, false, false),
    (7, 'lava_flows', 'Lava Flows', 'mars', 'special', false, false, false, false),
    (8, 'mining_area', 'Mining Area', 'mars', 'special', false, false, false, false),
    (9, 'mining_rights', 'Mining Rights', 'mars', 'special', false, false, false, false),
    (10, 'mohole_area', 'Mohole Area', 'mars', 'special', false, false, false, false),
    (11, 'natural_preserve', 'Natural Preserve', 'mars', 'special', false, false, false, false),
    (12, 'nuclear_zone', 'Nuclear Zone', 'mars', 'special', false, false, false, false),
    (13, 'restricted_area', 'Restricted Area', 'mars', 'special', false, false, false, false),
    (14, 'deimos_down', 'Deimos Down', 'mars', 'special', false, false, false, false),
    (15, 'great_dam', 'Great Dam', 'mars', 'special', false, false, false, false),
    (16, 'magnetic_field_generators', 'Magnetic Field Generators', 'mars', 'special', false, false, false, false),
    (17, 'bio_fertilizer_facility', 'Bio-Fertilizer Facility', 'mars', 'special', false, false, false, false),
    (18, 'metallic_asteroid', 'Metallic Asteroid', 'mars', 'special', false, false, false, false),
    (19, 'solar_farm', 'Solar Farm', 'mars', 'special', false, false, false, false),
    (20, 'ocean_city', 'Ocean City', 'mars', 'special', true, false, true, false),
    (21, 'ocean_farm', 'Ocean Farm', 'mars', 'special', false, false, true, false),
    (22, 'ocean_sanctuary', 'Ocean Sanctuary', 'mars', 'special', false, false, true, false),
    (23, 'mild_dust_storm', 'Mild Dust Storm', 'mars', 'special', false, false, false, true),
    (24, 'severe_dust_storm', 'Severe Dust Storm', 'mars', 'special', false, false, false, true),
    (25, 'mild_erosion', 'Mild Erosion', 'mars', 'special', false, false, false, true),
    (26, 'severe_erosion', 'Severe Erosion', 'mars', 'special', false, false, false, true),
    (27, 'mining_steel', 'Mining (Steel)', 'mars', 'special', false, false, false, false),
    (28, 'mining_titanium', 'Mining (Titanium)', 'mars', 'special', false, false, false, false),
    (29, 'moon_mine', 'Mine', 'moon', 'special', false, false, false, false),
    (30, 'moon_habitat', 'Habitat', 'moon', 'special', false, false, false, false),
    (31, 'moon_road', 'Road', 'moon', 'special', false, false, false, false),
    (32, 'luna_trade_station', 'Luna Trade Station', 'moon', 'special', false, false, false, false),
    (33, 'luna_mining_hub', 'Luna Mining Hub', 'moon', 'special', false, false, false, false),
    (34, 'luna_train_station', 'Luna Train Station', 'moon', 'special', false, false, false, false),
    (35, 'lunar_mine_urbanization', 'Lunar Mine Urbanization', 'moon', 'special', false, false, false, false),
    (36, 'wetlands', 'Wetlands', 'mars', 'special', false, true, true, false),
    (37, 'red_city', 'Red City', 'mars', 'special', true, false, false, false),
    (38, 'martian_nature_wonders', 'Martian Nature Wonders', 'mars', 'special', false, false, false, false),
    (39, 'crashlanding', 'Crashlanding', 'mars', 'special', false, false, false, false),
    (40, 'mars_nomads', 'Mars Nomads', 'mars', 'special', false, false, false, false),
    (41, 'rey_skywalker', 'Rey ... Skywalker?! (IX)', 'mars', 'special', false, false, false, false),
    (42, 'man_made_volcano', 'Man-made Volcano', 'mars', 'special', false, false, false, false),
    (43, 'new_holland', 'New Holland', 'mars', 'special', true, false, true, false),
    (44, 'neural_instance', 'Neural Instance', 'mars', 'special', false, false, false, false)
) as seed(
  source_tile_id,
  canonical_code,
  canonical_name,
  board,
  kind,
  counts_as_city,
  counts_as_greenery,
  counts_as_ocean,
  is_hazard
)
on conflict (canonical_code) do update set
  source_tile_id = excluded.source_tile_id,
  canonical_name = excluded.canonical_name,
  board = excluded.board,
  kind = excluded.kind,
  counts_as_city = excluded.counts_as_city,
  counts_as_greenery = excluded.counts_as_greenery,
  counts_as_ocean = excluded.counts_as_ocean,
  is_hazard = excluded.is_hazard,
  source_attribution = excluded.source_attribution,
  source_version = excluded.source_version,
  sync_metadata = public.terraforming_mars_tile_types.sync_metadata || excluded.sync_metadata,
  last_synced_at = now(),
  updated_at = now();
