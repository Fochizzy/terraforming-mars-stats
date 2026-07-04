create table public.game_log_events (
  id uuid primary key default gen_random_uuid(),
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  game_player_id uuid references public.game_players(id) on delete set null,
  generation_number integer,
  event_order integer not null,
  event_type text not null,
  card_id uuid references public.cards(id) on delete set null,
  resource_type text,
  resource_amount integer,
  tile_type text,
  board_space text,
  confidence_level text not null,
  line_classification text,
  raw_line text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index game_log_events_import_order_idx
on public.game_log_events (game_log_import_id, event_order);

alter table public.game_log_events
add constraint game_log_events_import_order_unique
unique (game_log_import_id, event_order);

alter table public.game_log_imports
add constraint game_log_imports_game_id_id_unique
unique (game_id, id);

create table public.game_result_screenshot_imports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  storage_object_path text not null,
  original_name text,
  mime_type text,
  file_size_bytes bigint,
  ocr_engine_version text not null,
  parse_status text not null default 'saved_as_draft',
  detected_layout text,
  confidence_summary jsonb not null default '{}'::jsonb,
  extracted_fields jsonb not null default '{}'::jsonb,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  parsed_at timestamptz
);

create index game_result_screenshot_imports_game_id_created_at_idx
on public.game_result_screenshot_imports (game_id, created_at desc);

alter table public.game_result_screenshot_imports
add constraint game_result_screenshot_imports_import_id_unique
unique (game_log_import_id);

alter table public.game_result_screenshot_imports
add constraint game_result_screenshot_imports_game_import_match_fk
foreign key (game_id, game_log_import_id)
references public.game_log_imports (game_id, id)
on delete cascade;

alter table public.players
add constraint players_group_id_id_unique
unique (group_id, id);

create table public.player_import_aliases (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  source_type text not null,
  alias_text text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique (group_id, source_type, normalized_alias)
);

alter table public.player_import_aliases
add constraint player_import_aliases_group_player_fk
foreign key (group_id, player_id)
references public.players (group_id, id)
on delete cascade;

alter table public.player_import_aliases
add constraint player_import_aliases_source_type_check
check (source_type in ('game_log', 'screenshot_ocr'));

create index player_import_aliases_group_player_idx
on public.player_import_aliases (group_id, player_id);

alter table public.game_log_events enable row level security;
alter table public.game_result_screenshot_imports enable row level security;
alter table public.player_import_aliases enable row level security;

create policy "members read game log events"
on public.game_log_events for select
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_events.game_log_import_id
      and public.can_read_game(gli.game_id)
  )
);

create policy "editors manage game log events"
on public.game_log_events for all
using (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_events.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
)
with check (
  exists (
    select 1
    from public.game_log_imports gli
    where gli.id = game_log_events.game_log_import_id
      and public.can_edit_game(gli.game_id)
  )
);

create policy "members read screenshot imports"
on public.game_result_screenshot_imports for select
using (public.can_read_game(game_id));

create policy "editors manage screenshot imports"
on public.game_result_screenshot_imports for all
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read player import aliases"
on public.player_import_aliases for select
using (
  exists (
    select 1
    from public.players p
    where p.id = player_import_aliases.player_id
      and p.group_id = player_import_aliases.group_id
      and public.is_group_member(player_import_aliases.group_id)
  )
);

create policy "editors manage player import aliases"
on public.player_import_aliases for all
using (
  exists (
    select 1
    from public.players p
    where p.id = player_import_aliases.player_id
      and p.group_id = player_import_aliases.group_id
      and public.can_edit_group(player_import_aliases.group_id)
  )
)
with check (
  exists (
    select 1
    from public.players p
    where p.id = player_import_aliases.player_id
      and p.group_id = player_import_aliases.group_id
      and public.can_edit_group(player_import_aliases.group_id)
  )
);
