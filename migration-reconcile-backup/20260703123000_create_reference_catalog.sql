create table public.expansions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.maps (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.promo_sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  promo_year integer,
  edition_label text not null,
  display_order integer not null default 0,
  source_attribution text not null
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  source_card_id text not null unique,
  card_number text not null,
  card_name text not null,
  card_type text not null,
  expansion_code text not null,
  expansion_name text not null,
  promo_set_id uuid references public.promo_sets(id) on delete set null,
  image_url text not null,
  thumbnail_path text,
  full_image_path text,
  source_attribution text not null,
  sync_metadata jsonb not null default '{}'::jsonb
);

create table public.corporations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  expansion_code text not null,
  promo_set_id uuid references public.promo_sets(id) on delete set null
);

create table public.preludes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  expansion_code text not null
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.catalog_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_version text not null,
  imported_at timestamptz not null default now(),
  notes text not null default ''
);

create table public.catalog_overrides (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('card', 'corporation')),
  source_key text not null unique,
  payload jsonb not null,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.style_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null
);

create table public.group_default_expansions (
  group_id uuid not null references public.groups(id) on delete cascade,
  expansion_id uuid not null references public.expansions(id) on delete cascade,
  primary key (group_id, expansion_id)
);

create table public.group_default_promo_sets (
  group_id uuid not null references public.groups(id) on delete cascade,
  promo_set_id uuid not null references public.promo_sets(id) on delete cascade,
  primary key (group_id, promo_set_id)
);

create table public.game_expansions (
  game_id uuid not null references public.games(id) on delete cascade,
  expansion_id uuid not null references public.expansions(id) on delete cascade,
  primary key (game_id, expansion_id)
);

create table public.game_promo_sets (
  game_id uuid not null references public.games(id) on delete cascade,
  promo_set_id uuid not null references public.promo_sets(id) on delete cascade,
  primary key (game_id, promo_set_id)
);

create table public.game_player_preludes (
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  prelude_id uuid not null references public.preludes(id) on delete cascade,
  primary key (game_player_id, prelude_id)
);

create table public.map_milestones (
  map_id uuid not null references public.maps(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  primary key (map_id, milestone_id)
);

create table public.map_awards (
  map_id uuid not null references public.maps(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade,
  primary key (map_id, award_id)
);

create table public.game_milestones (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  winner_game_player_id uuid not null references public.game_players(id) on delete cascade
);

create table public.game_awards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade,
  funded_by_game_player_id uuid not null references public.game_players(id) on delete cascade,
  place integer not null check (place in (1, 2)),
  winner_game_player_id uuid not null references public.game_players(id) on delete cascade
);

create table public.game_player_declared_styles (
  id uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  style_definition_id uuid not null references public.style_definitions(id) on delete cascade,
  is_primary boolean not null default false
);

create table public.game_player_inferred_styles (
  id uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  style_definition_id uuid not null references public.style_definitions(id) on delete cascade,
  is_primary boolean not null default false,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1)
);

create table public.game_player_key_cards (
  id uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade
);
