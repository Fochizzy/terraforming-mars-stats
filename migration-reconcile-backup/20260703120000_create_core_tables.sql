create type public.group_role as enum ('owner', 'editor', 'viewer');
create type public.game_status as enum ('draft', 'finalized');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.group_role not null,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table public.group_settings (
  group_id uuid primary key references public.groups(id) on delete cascade,
  default_map_id uuid,
  global_analytics_enabled boolean not null default false,
  image_reference_mode text not null default 'full'
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  played_on date not null,
  map_id uuid,
  player_count integer not null check (player_count between 1 and 5),
  generation_count integer not null check (generation_count > 0),
  source_game_id uuid references public.games(id) on delete set null,
  status public.game_status not null default 'draft',
  catalog_snapshot_id uuid,
  created_by_user_id uuid not null references auth.users(id),
  updated_by_user_id uuid not null references auth.users(id),
  finalized_at timestamptz,
  finalized_by_user_id uuid references auth.users(id),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  corporation_id uuid,
  placement integer not null check (placement > 0),
  is_winner boolean not null default false,
  total_points integer not null,
  final_megacredits integer not null default 0,
  cities_points integer not null default 0,
  greenery_points integer not null default 0,
  card_points_total integer not null default 0,
  card_points_microbes integer,
  card_points_animals integer,
  card_points_jovian integer,
  tr_points integer not null default 0,
  milestone_points integer not null default 0,
  award_points integer not null default 0,
  other_card_points integer,
  created_at timestamptz not null default now()
);

create table public.game_revisions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  editor_user_id uuid not null references auth.users(id),
  revision_note text not null default '',
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
