-- Phase 4, Step 4.3 remediation: durable typed import-event contract.
-- Existing game_log_events remains the one canonical event table.

create table public.terraforming_mars_colonies (
  id text primary key,
  name text not null unique,
  source_commit text not null,
  created_at timestamptz not null default now(),
  constraint terraforming_mars_colonies_id_check
    check (id ~ '^[a-z][a-z0-9_]{1,63}$')
);

insert into public.terraforming_mars_colonies (id, name, source_commit)
values
  ('callisto', 'Callisto', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('ceres', 'Ceres', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('deimos', 'Deimos', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('enceladus', 'Enceladus', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('europa', 'Europa', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('ganymede', 'Ganymede', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('hygiea', 'Hygiea', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('iapetus', 'Iapetus', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('iapetus_ii', 'Iapetus II', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('io', 'Io', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('kuiper', 'Kuiper', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('leavitt', 'Leavitt', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('leavitt_ii', 'Leavitt II', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('luna', 'Luna', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('mercury', 'Mercury', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('miranda', 'Miranda', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('pallas', 'Pallas', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('pluto', 'Pluto', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('terra', 'Terra', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('titan', 'Titan', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('titania', 'Titania', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('triton', 'Triton', '7a6f98f09ac2a558969c092d317c313806af7b73'),
  ('venus', 'Venus', '7a6f98f09ac2a558969c092d317c313806af7b73');

alter table public.terraforming_mars_colonies enable row level security;
revoke all on public.terraforming_mars_colonies from public;
revoke all on public.terraforming_mars_colonies from anon;
grant select on public.terraforming_mars_colonies to authenticated;
grant all on public.terraforming_mars_colonies to service_role;

create policy "authenticated read canonical colonies"
on public.terraforming_mars_colonies
for select
to authenticated
using ((select auth.uid()) is not null);

alter table public.game_log_events
  add column map_id uuid references public.maps(id) on delete restrict,
  add column placement_action text,
  add column placement_board text,
  add column placement_format text,
  add column source_space_id text,
  add column board_row smallint,
  add column board_position smallint,
  add column source_line_number integer,
  add column ownership_state text,
  add column owner_player_id uuid references public.players(id) on delete set null,
  add column owner_game_player_id uuid references public.game_players(id) on delete set null;

alter table public.game_log_events
  drop constraint if exists game_log_events_confidence_level_valid;

alter table public.game_log_events
  add constraint game_log_events_confidence_level_valid
    check (confidence_level in ('high', 'medium', 'low', 'reviewed')),
  add constraint game_log_events_event_type_valid
    check (event_type in (
      'award_funded',
      'card_bought',
      'card_drawn',
      'card_hand_initialized',
      'card_hand_snapshot',
      'card_played',
      'card_returned_to_hand',
      'cards_discarded',
      'colony_built',
      'colony_setup_added',
      'colony_track_decreased',
      'colony_track_increased',
      'colony_traded',
      'corporation_selected',
      'first_player_selected',
      'generation_started',
      'global_parameter_changed',
      'milestone_claimed',
      'player_identified',
      'prelude_played',
      'resource_changed',
      'terraforming_rating_changed',
      'terraforming_rating_snapshot',
      'tile_placed',
      'tile_removed',
      'venus_scale_decreased',
      'venus_scale_increased'
    )),
  add constraint game_log_events_event_identity_format
    check (
      event_identity is null
      or event_identity ~ '^[a-z0-9][a-z0-9:_-]{0,199}$'
    ),
  add constraint game_log_events_placement_action_check
    check (placement_action is null or placement_action in ('placed', 'removed')),
  add constraint game_log_events_placement_board_check
    check (placement_board is null or placement_board in ('mars', 'moon')),
  add constraint game_log_events_placement_format_check
    check (placement_format is null or placement_format in ('flat-id', 'grid')),
  add constraint game_log_events_ownership_state_check
    check (
      ownership_state is null
      or ownership_state in ('explicit_owner', 'unknown', 'not_applicable')
    ),
  add constraint game_log_events_grid_coordinates_check
    check (
      placement_format is distinct from 'grid'
      or (
        board_row between 1 and 9
        and board_position between 1 and 9
      )
    ),
  add constraint game_log_events_typed_placement_required
    check (
      event_type not in ('tile_placed', 'tile_removed')
      or (
        map_id is not null
        and placement_action is not null
        and placement_board is not null
        and placement_format is not null
        and source_space_id is not null
        and source_line_number is not null
        and ownership_state is not null
        and event_identity is not null
      )
    ) not valid,
  add constraint game_log_events_expansion_identity_required
    check (
      event_type not in (
        'colony_built',
        'colony_setup_added',
        'colony_track_decreased',
        'colony_track_increased',
        'colony_traded',
        'venus_scale_decreased',
        'venus_scale_increased'
      )
      or event_identity is not null
    ) not valid,
  add constraint game_log_events_colony_id_fk
    foreign key (colony_id)
    references public.terraforming_mars_colonies(id)
    on update cascade
    on delete restrict
    not valid;

create index game_log_events_map_placement_idx
on public.game_log_events (map_id, placement_board, board_space)
where placement_action is not null;

create index game_log_events_owner_player_idx
on public.game_log_events (owner_player_id)
where owner_player_id is not null;

create or replace function public.replace_game_log_events(
  p_game_log_import_id uuid,
  p_events jsonb
)
returns table (
  id uuid,
  event_order integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_events jsonb := coalesce(p_events, '[]'::jsonb);
  v_game_id uuid;
  v_group_id uuid;
  v_map_id uuid;
begin
  if jsonb_typeof(normalized_events) <> 'array' then
    raise exception 'p_events must be a JSON array' using errcode = '22023';
  end if;

  select gli.game_id, g.group_id, g.map_id
  into v_game_id, v_group_id, v_map_id
  from public.game_log_imports gli
  join public.games g on g.id = gli.game_id
  where gli.id = p_game_log_import_id
    and public.can_edit_game(gli.game_id)
  for update of gli;

  if not found then
    raise exception 'The game-log import is unavailable or not editable.'
      using errcode = '42501';
  end if;

  if jsonb_array_length(normalized_events) = 0 then
    return query
    select gle.id, gle.event_order
    from public.game_log_events gle
    where gle.game_log_import_id = p_game_log_import_id
    order by gle.event_order;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where (event_item ->> 'event_order')::integer < 0
       or event_item ->> 'event_type' not in (
         'award_funded', 'card_bought', 'card_drawn', 'card_hand_initialized',
         'card_hand_snapshot', 'card_played', 'card_returned_to_hand',
         'cards_discarded', 'colony_built', 'colony_setup_added',
         'colony_track_decreased', 'colony_track_increased', 'colony_traded',
         'corporation_selected', 'first_player_selected', 'generation_started',
         'global_parameter_changed', 'milestone_claimed', 'player_identified',
         'prelude_played', 'resource_changed', 'terraforming_rating_changed',
         'terraforming_rating_snapshot', 'tile_placed', 'tile_removed',
         'venus_scale_decreased', 'venus_scale_increased'
       )
       or event_item ->> 'confidence_level' not in ('high', 'medium', 'low', 'reviewed')
       or jsonb_typeof(coalesce(event_item -> 'payload', '{}'::jsonb)) <> 'object'
  ) then
    raise exception 'One or more events use an invalid order, type, confidence, or payload.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select event_item ->> 'event_order' as event_order
      from jsonb_array_elements(normalized_events) event_item
      group by event_item ->> 'event_order'
      having count(*) > 1
    ) duplicate_order
  ) then
    raise exception 'Event order values must be unique within one import.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from (
      select nullif(event_item ->> 'event_identity', '') as event_identity
      from jsonb_array_elements(normalized_events) event_item
      where nullif(event_item ->> 'event_identity', '') is not null
      group by nullif(event_item ->> 'event_identity', '')
      having count(*) > 1
    ) duplicate_identity
  ) then
    raise exception 'Event identities must be unique within one import.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'player_id', '') is not null
      and not exists (
        select 1
        from public.players p
        where p.id = (event_item ->> 'player_id')::uuid
          and p.group_id = v_group_id
      )
  ) then
    raise exception 'An event player does not belong to the game group.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'game_player_id', '') is not null
      and not exists (
        select 1
        from public.game_players gp
        where gp.id = (event_item ->> 'game_player_id')::uuid
          and gp.game_id = v_game_id
          and (
            nullif(event_item ->> 'player_id', '') is null
            or gp.player_id = (event_item ->> 'player_id')::uuid
          )
      )
  ) then
    raise exception 'An event game-player does not belong to the game.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'owner_player_id', '') is not null
      and not exists (
        select 1
        from public.players p
        where p.id = (event_item ->> 'owner_player_id')::uuid
          and p.group_id = v_group_id
      )
  ) then
    raise exception 'A placement owner does not belong to the game group.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'owner_game_player_id', '') is not null
      and not exists (
        select 1
        from public.game_players gp
        where gp.id = (event_item ->> 'owner_game_player_id')::uuid
          and gp.game_id = v_game_id
          and (
            nullif(event_item ->> 'owner_player_id', '') is null
            or gp.player_id = (event_item ->> 'owner_player_id')::uuid
          )
      )
  ) then
    raise exception 'A placement owner game-player does not belong to the game.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'colony_id', '') is not null
      and not exists (
        select 1
        from public.terraforming_mars_colonies c
        where c.id = event_item ->> 'colony_id'
      )
  ) then
    raise exception 'An event colony does not resolve to the canonical catalogue.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'map_id', '') is not null
      and (event_item ->> 'map_id')::uuid is distinct from v_map_id
  ) then
    raise exception 'An event map does not match the game map.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where event_item ->> 'event_type' in ('tile_placed', 'tile_removed')
      and (
        nullif(event_item ->> 'event_identity', '') is null
        or nullif(event_item ->> 'source_line_number', '') is null
        or nullif(event_item ->> 'source_space_id', '') is null
        or nullif(event_item ->> 'placement_action', '') is null
        or nullif(event_item ->> 'placement_board', '') is null
        or nullif(event_item ->> 'placement_format', '') is null
        or nullif(event_item ->> 'ownership_state', '') is null
      )
  ) then
    raise exception 'Tile events require typed placement identity, coordinates, provenance, and ownership state.'
      using errcode = '23514';
  end if;

  delete from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
    and not exists (
      select 1
      from jsonb_array_elements(normalized_events) event_item
      where (event_item ->> 'event_order')::integer = gle.event_order
    );

  insert into public.game_log_events (
    game_log_import_id, game_player_id, generation_number, event_order,
    event_type, card_id, resource_type, resource_amount, tile_type, board_space,
    confidence_level, line_classification, raw_line, payload, player_id,
    colony_id, event_identity, parameter_steps, parameter_before,
    parameter_after, source_entity, parser_version, event_provenance, map_id,
    placement_action, placement_board, placement_format, source_space_id,
    board_row, board_position, source_line_number, ownership_state,
    owner_player_id, owner_game_player_id
  )
  select
    p_game_log_import_id,
    nullif(event_item ->> 'game_player_id', '')::uuid,
    nullif(event_item ->> 'generation_number', '')::integer,
    (event_item ->> 'event_order')::integer,
    event_item ->> 'event_type',
    nullif(event_item ->> 'card_id', '')::uuid,
    nullif(event_item ->> 'resource_type', ''),
    nullif(event_item ->> 'resource_amount', '')::integer,
    nullif(event_item ->> 'tile_type', ''),
    nullif(event_item ->> 'board_space', ''),
    event_item ->> 'confidence_level',
    nullif(event_item ->> 'line_classification', ''),
    event_item ->> 'raw_line',
    coalesce(event_item -> 'payload', '{}'::jsonb),
    nullif(event_item ->> 'player_id', '')::uuid,
    nullif(event_item ->> 'colony_id', ''),
    nullif(event_item ->> 'event_identity', ''),
    nullif(event_item ->> 'parameter_steps', '')::smallint,
    nullif(event_item ->> 'parameter_before', '')::smallint,
    nullif(event_item ->> 'parameter_after', '')::smallint,
    nullif(event_item ->> 'source_entity', ''),
    nullif(event_item ->> 'parser_version', ''),
    nullif(event_item ->> 'event_provenance', ''),
    coalesce(nullif(event_item ->> 'map_id', '')::uuid, v_map_id),
    nullif(event_item ->> 'placement_action', ''),
    nullif(event_item ->> 'placement_board', ''),
    nullif(event_item ->> 'placement_format', ''),
    nullif(event_item ->> 'source_space_id', ''),
    nullif(event_item ->> 'board_row', '')::smallint,
    nullif(event_item ->> 'board_position', '')::smallint,
    nullif(event_item ->> 'source_line_number', '')::integer,
    nullif(event_item ->> 'ownership_state', ''),
    nullif(event_item ->> 'owner_player_id', '')::uuid,
    nullif(event_item ->> 'owner_game_player_id', '')::uuid
  from jsonb_array_elements(normalized_events) event_item
  on conflict on constraint game_log_events_import_order_unique do update
  set
    game_player_id = excluded.game_player_id,
    generation_number = excluded.generation_number,
    event_type = excluded.event_type,
    card_id = excluded.card_id,
    resource_type = excluded.resource_type,
    resource_amount = excluded.resource_amount,
    tile_type = excluded.tile_type,
    board_space = excluded.board_space,
    confidence_level = excluded.confidence_level,
    line_classification = excluded.line_classification,
    raw_line = excluded.raw_line,
    payload = excluded.payload,
    player_id = excluded.player_id,
    colony_id = excluded.colony_id,
    event_identity = excluded.event_identity,
    parameter_steps = excluded.parameter_steps,
    parameter_before = excluded.parameter_before,
    parameter_after = excluded.parameter_after,
    source_entity = excluded.source_entity,
    parser_version = excluded.parser_version,
    event_provenance = excluded.event_provenance,
    map_id = excluded.map_id,
    placement_action = excluded.placement_action,
    placement_board = excluded.placement_board,
    placement_format = excluded.placement_format,
    source_space_id = excluded.source_space_id,
    board_row = excluded.board_row,
    board_position = excluded.board_position,
    source_line_number = excluded.source_line_number,
    ownership_state = excluded.ownership_state,
    owner_player_id = excluded.owner_player_id,
    owner_game_player_id = excluded.owner_game_player_id;

  return query
  select gle.id, gle.event_order
  from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
  order by gle.event_order;
end;
$$;

revoke execute on function public.replace_game_log_events(uuid, jsonb) from public;
revoke execute on function public.replace_game_log_events(uuid, jsonb) from anon;
grant execute on function public.replace_game_log_events(uuid, jsonb) to authenticated;
grant execute on function public.replace_game_log_events(uuid, jsonb) to service_role;

-- Private import aliases remain available only to guarded SECURITY DEFINER
-- resolvers and service-role maintenance.
revoke all on public.player_import_aliases from public;
revoke all on public.player_import_aliases from anon;
revoke all on public.player_import_aliases from authenticated;
grant all on public.player_import_aliases to service_role;

