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
  on conflict on constraint game_log_events_import_order_unique do update
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
