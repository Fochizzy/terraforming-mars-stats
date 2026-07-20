-- Phase 4, Step 4.3 remediation: one shared confidence + review-state contract.
--
-- The previous event contract overloaded confidence with review status: the
-- constraint accepted 'reviewed' as a confidence level, and parsers emitted
-- 'reviewed' both for evidence that still NEEDS review (unknown tile labels,
-- unknown colony names) and for evidence a human had already corrected. This
-- migration separates the two concepts:
--
--   confidence_level : 'high' | 'medium' | 'low'          (evidence strength)
--   review_state     : 'not_required' | 'needs_review'
--                    | 'reviewed' | 'rejected'             (review lifecycle)
--
-- Production fact (verified read-only 2026-07-19 before this migration was
-- written): public.game_log_events contains ZERO rows with
-- confidence_level = 'reviewed' (12,373 high / 2,443 medium), so the legacy
-- mapping below rewrites no production rows. It still runs, deterministically,
-- so any environment that did persist overloaded rows is normalized:
--
--   payload->>'resolution' = 'corrected'  -> confidence 'high', state 'reviewed'
--     (an importer-corrected objective/played entity: a human explicitly chose
--      the canonical value in the review UI)
--   any other 'reviewed' row               -> confidence 'low', state 'needs_review'
--     (unknown tile label / unknown colony evidence preserved for review;
--      payload->>'is_known_tile_type' = 'false' or a null colony_id with raw
--      colony text — the parser could not resolve a canonical identity)
--
-- This mapping is exercised by the executable migration harness
-- (supabase/tests/executable/run.sh), which seeds overloaded legacy rows
-- before applying this migration, asserts the split afterwards, and applies
-- this file TWICE to prove repeat safety.
--
-- Repeat-safety contract (audit F-03/H2): every operation below is guarded,
-- so the file is safe on a clean baseline, on an upgrade from the prior
-- redesign schema, on a partially applied local development state, and on
-- repeat execution. Invalid legacy values are never hidden: the legacy
-- split UPDATE runs before the constraint tightens, and the re-added CHECK
-- validates every existing row (it is never created NOT VALID).
--
-- Ordering note: migration 20260720110000 later redefines
-- replace_game_log_events with the completed placement contract. Repeat
-- execution therefore means replaying the pending sequence in version order
-- (as migration tooling does); the harness proves that ordered replay
-- converges.

-- 1. Review-state column (existing rows are canonical parses: not_required).
alter table public.game_log_events
  add column if not exists review_state text;

update public.game_log_events
set review_state = 'not_required'
where review_state is null;

alter table public.game_log_events
  alter column review_state set default 'not_required';
alter table public.game_log_events
  alter column review_state set not null;

alter table public.game_log_events
  drop constraint if exists game_log_events_review_state_valid;
alter table public.game_log_events
  add constraint game_log_events_review_state_valid
  check (review_state in ('not_required', 'needs_review', 'reviewed', 'rejected'));

comment on column public.game_log_events.review_state is
  'Human-review lifecycle for this event: not_required, needs_review, reviewed, or rejected. Never overloaded into confidence_level.';
comment on column public.game_log_events.confidence_level is
  'Evidence strength only: high, medium, or low. Review status lives in review_state.';

-- 2. Deterministically split any legacy overloaded rows.
update public.game_log_events
set
  review_state = case
    when payload ->> 'resolution' = 'corrected' then 'reviewed'
    else 'needs_review'
  end,
  confidence_level = case
    when payload ->> 'resolution' = 'corrected' then 'high'
    else 'low'
  end
where confidence_level = 'reviewed';

-- 3. Confidence is now strictly evidence strength. The guarded drop/re-add
-- pair converges on repeat execution; the re-added CHECK validates every
-- existing row, so an out-of-contract value that somehow survived step 2
-- fails the migration loudly instead of being hidden.
alter table public.game_log_events
  drop constraint if exists game_log_events_confidence_level_valid;

alter table public.game_log_events
  add constraint game_log_events_confidence_level_valid
    check (confidence_level in ('high', 'medium', 'low'));

-- 4. The hardened replacement RPC validates and persists both values.
--    Body is identical to 20260718212340 except for the split contract:
--    confidence no longer accepts 'reviewed', and review_state is validated
--    and persisted (missing review_state defaults to 'not_required' so the
--    payload remains compatible with callers that predate the split).
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
       or event_item ->> 'confidence_level' not in ('high', 'medium', 'low')
       or coalesce(nullif(event_item ->> 'review_state', ''), 'not_required')
          not in ('not_required', 'needs_review', 'reviewed', 'rejected')
       or jsonb_typeof(coalesce(event_item -> 'payload', '{}'::jsonb)) <> 'object'
  ) then
    raise exception 'One or more events use an invalid order, type, confidence, review state, or payload.'
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
    confidence_level, review_state, line_classification, raw_line, payload,
    player_id, colony_id, event_identity, parameter_steps, parameter_before,
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
    coalesce(nullif(event_item ->> 'review_state', ''), 'not_required'),
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
    review_state = excluded.review_state,
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
