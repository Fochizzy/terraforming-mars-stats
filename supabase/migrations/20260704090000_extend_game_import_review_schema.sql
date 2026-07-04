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

alter table public.game_log_events
add constraint game_log_events_import_order_unique
unique (game_log_import_id, event_order);

create or replace function public.replace_game_log_events(
  p_game_log_import_id uuid,
  p_events jsonb
)
returns table (
  id uuid,
  event_order integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_events jsonb := coalesce(p_events, '[]'::jsonb);
begin
  if jsonb_typeof(normalized_events) <> 'array' then
    raise exception 'p_events must be a JSON array';
  end if;

  if jsonb_array_length(normalized_events) = 0 then
    return query
    select gle.id, gle.event_order
    from public.game_log_events gle
    where gle.game_log_import_id = p_game_log_import_id
    order by gle.event_order;
    return;
  end if;

  perform 1
  from public.game_log_imports gli
  where gli.id = p_game_log_import_id
  for update;

  if not found then
    raise exception 'game_log_import_id % does not exist', p_game_log_import_id;
  end if;

  delete from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
    and not exists (
      select 1
      from jsonb_array_elements(normalized_events) as event_item
      where (event_item ->> 'event_order')::integer = gle.event_order
    );

  insert into public.game_log_events (
    game_log_import_id,
    board_space,
    card_id,
    confidence_level,
    event_order,
    event_type,
    generation_number,
    line_classification,
    payload,
    raw_line,
    resource_amount,
    resource_type,
    tile_type
  )
  select
    p_game_log_import_id as game_log_import_id,
    nullif(event_item ->> 'board_space', '') as board_space,
    nullif(event_item ->> 'card_id', '')::uuid as card_id,
    event_item ->> 'confidence_level' as confidence_level,
    (event_item ->> 'event_order')::integer as event_order,
    event_item ->> 'event_type' as event_type,
    nullif(event_item ->> 'generation_number', '')::integer as generation_number,
    nullif(event_item ->> 'line_classification', '') as line_classification,
    coalesce(event_item -> 'payload', '{}'::jsonb) as payload,
    event_item ->> 'raw_line' as raw_line,
    nullif(event_item ->> 'resource_amount', '')::integer as resource_amount,
    nullif(event_item ->> 'resource_type', '') as resource_type,
    nullif(event_item ->> 'tile_type', '') as tile_type
  from jsonb_array_elements(normalized_events) as event_item
  on conflict (game_log_import_id, event_order) do update
  set
    board_space = excluded.board_space,
    card_id = excluded.card_id,
    confidence_level = excluded.confidence_level,
    event_type = excluded.event_type,
    generation_number = excluded.generation_number,
    line_classification = excluded.line_classification,
    payload = excluded.payload,
    raw_line = excluded.raw_line,
    resource_amount = excluded.resource_amount,
    resource_type = excluded.resource_type,
    tile_type = excluded.tile_type;

  return query
  select gle.id, gle.event_order
  from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
  order by gle.event_order;
end;
$$;

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
