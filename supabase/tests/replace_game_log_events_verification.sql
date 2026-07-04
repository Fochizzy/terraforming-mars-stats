begin;

insert into auth.users (
  id,
  email
)
values (
  '11111111-1111-4111-8111-111111111111',
  'replace-game-log-events@example.com'
);

insert into public.groups (
  id,
  name
)
values (
  '22222222-2222-4222-8222-222222222222',
  'Replace Game Log Events Verification'
);

insert into public.games (
  id,
  group_id,
  played_on,
  player_count,
  generation_count,
  status,
  created_by_user_id,
  updated_by_user_id,
  notes
)
values (
  '33333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  date '2026-07-04',
  2,
  10,
  'draft',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  ''
);

insert into public.game_log_imports (
  id,
  game_id,
  created_by_user_id,
  raw_log_text,
  line_count,
  unparsed_line_count
)
values (
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Generation 1',
  1,
  1
);

do $$
declare
  initial_orders integer[];
  shorter_orders integer[];
  zero_event_orders integer[];
  stored_orders integer[];
begin
  select coalesce(array_agg(event_order order by event_order), '{}'::integer[])
  into initial_orders
  from public.replace_game_log_events(
    '44444444-4444-4444-8444-444444444444',
    jsonb_build_array(
      jsonb_build_object(
        'confidence_level', 'high',
        'event_order', 1,
        'event_type', 'generation_started',
        'generation_number', 1,
        'line_classification', 'event',
        'payload', jsonb_build_object('generation', 1),
        'raw_line', 'Generation 1'
      ),
      jsonb_build_object(
        'confidence_level', 'medium',
        'event_order', 2,
        'event_type', 'resource_change',
        'line_classification', 'event',
        'payload', jsonb_build_object('resourceType', 'plants'),
        'raw_line', 'Plants increased by 2',
        'resource_amount', 2,
        'resource_type', 'plants'
      ),
      jsonb_build_object(
        'board_space', '29',
        'confidence_level', 'medium',
        'event_order', 3,
        'event_type', 'tile_placed',
        'line_classification', 'event',
        'payload', jsonb_build_object('tileType', 'greenery'),
        'raw_line', 'Greenery placed at 29',
        'tile_type', 'greenery'
      )
    )
  );

  if initial_orders <> array[1, 2, 3] then
    raise exception 'Expected initial event orders {1,2,3}, got %', initial_orders;
  end if;

  select coalesce(array_agg(event_order order by event_order), '{}'::integer[])
  into shorter_orders
  from public.replace_game_log_events(
    '44444444-4444-4444-8444-444444444444',
    jsonb_build_array(
      jsonb_build_object(
        'confidence_level', 'high',
        'event_order', 1,
        'event_type', 'generation_started',
        'generation_number', 1,
        'line_classification', 'event',
        'payload', jsonb_build_object('generation', 1),
        'raw_line', 'Generation 1'
      ),
      jsonb_build_object(
        'board_space', '29',
        'confidence_level', 'high',
        'event_order', 2,
        'event_type', 'tile_placed',
        'line_classification', 'event',
        'payload', jsonb_build_object('tileType', 'greenery'),
        'raw_line', 'Greenery placed at 29',
        'tile_type', 'greenery'
      )
    )
  );

  if shorter_orders <> array[1, 2] then
    raise exception 'Expected shorter reparse orders {1,2}, got %', shorter_orders;
  end if;

  select coalesce(array_agg(event_order order by event_order), '{}'::integer[])
  into stored_orders
  from public.game_log_events
  where game_log_import_id = '44444444-4444-4444-8444-444444444444';

  if stored_orders <> array[1, 2] then
    raise exception 'Expected stored orders after shorter reparse {1,2}, got %', stored_orders;
  end if;

  select coalesce(array_agg(event_order order by event_order), '{}'::integer[])
  into zero_event_orders
  from public.replace_game_log_events(
    '44444444-4444-4444-8444-444444444444',
    '[]'::jsonb
  );

  if zero_event_orders <> array[1, 2] then
    raise exception 'Expected zero-event reparse to preserve {1,2}, got %', zero_event_orders;
  end if;

  select coalesce(array_agg(event_order order by event_order), '{}'::integer[])
  into stored_orders
  from public.game_log_events
  where game_log_import_id = '44444444-4444-4444-8444-444444444444';

  if stored_orders <> array[1, 2] then
    raise exception 'Expected stored orders after zero-event reparse {1,2}, got %', stored_orders;
  end if;
end
$$;

select 'replace_game_log_events_verification_passed' as verification_status;

rollback;
