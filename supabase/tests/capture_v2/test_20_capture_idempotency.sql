-- Capture writes the full snapshot; a retry is deterministic and idempotent.
create function pg_temp.sample_capture() returns jsonb language sql as $$
  select jsonb_build_object(
    'parser_version', 'tm-data-capture-v2',
    'workflow_version', 'web-import-capture-v2',
    'provenance', 'parser_derived',
    'coverage_state', 'complete',
    'coverage', jsonb_build_object('totalLines', 5, 'unresolvedPlayers', 0),
    'venus_state', 'confirmed_present',
    'colonies_state', 'confirmed_absent',
    'final_venus_scale', 8,
    'source', jsonb_build_object(
      'text', 'Generation 1', 'sha256', repeat('a', 64),
      'format', 'manual_web_import', 'byte_length', 12, 'route', 'manual_web_import'
    ),
    'events', jsonb_build_array(
      jsonb_build_object(
        'event_uid', 'aaaaaaaaaaaa:venus:0001:2', 'event_sequence', 1, 'generation_number', 1,
        'attribution_status', 'explicit_stable',
        'player_id', '33333333-3333-3333-3333-333333333331',
        'game_player_id', '77777777-7777-7777-7777-777777777771',
        'event_category', 'venus', 'event_type', 'venus_raised', 'canonical_entity_id', 'venus',
        'source_text', 'Ada increased Venus scale 2 step(s)', 'amount', 2,
        'confidence', 'high', 'coverage_state', 'complete', 'provenance', 'parser_derived'
      ),
      jsonb_build_object(
        'event_uid', 'aaaaaaaaaaaa:tile_placement:0002:3', 'event_sequence', 2, 'generation_number', 1,
        'attribution_status', 'explicit_stable',
        'player_id', '33333333-3333-3333-3333-333333333331',
        'game_player_id', '77777777-7777-7777-7777-777777777771',
        'event_category', 'tile_placement', 'event_type', 'tile_placed', 'canonical_entity_id', '19',
        'source_text', 'Ada placed city tile at 19',
        'confidence', 'high', 'coverage_state', 'complete', 'provenance', 'parser_derived'
      )
    ),
    'placements', jsonb_build_array(
      jsonb_build_object(
        'placement_uid', 'aaaaaaaaaaaa:place:0002:3', 'event_uid', 'aaaaaaaaaaaa:tile_placement:0002:3',
        'event_sequence', 2, 'generation_number', 1, 'attribution_status', 'explicit_stable',
        'player_id', '33333333-3333-3333-3333-333333333331',
        'game_player_id', '77777777-7777-7777-7777-777777777771',
        'canonical_board_space_id', '19', 'upstream_numeric_space_id', 19,
        'tile_type', 'city', 'placement_action', 'place', 'ownership_state', 'owned',
        'raw_evidence', 'Ada placed city tile at 19', 'confidence', 'high', 'provenance', 'parser_derived'
      )
    ),
    'map_detection', jsonb_build_object(
      'detection_state', 'confident', 'detected_map_code', 'tharsis',
      'candidate_map_codes', jsonb_build_array('tharsis'),
      'confidence', 'high', 'provenance', 'parser_derived'
    ),
    'unsupported', jsonb_build_array()
  );
$$;

begin;

select public.replace_game_capture_v2(
  '66666666-6666-6666-6666-666666666661',
  '88888888-8888-8888-8888-888888888881',
  pg_temp.sample_capture()
);

do $$
begin
  if (select count(*) from public.game_capture_import_sources where game_id = '66666666-6666-6666-6666-666666666661') <> 1 then
    raise exception 'FAIL: expected exactly 1 immutable source row';
  end if;
  if (select count(*) from public.game_capture_parser_runs where game_id = '66666666-6666-6666-6666-666666666661') <> 1 then
    raise exception 'FAIL: expected exactly 1 parser run';
  end if;
  if (select count(*) from public.game_capture_events where game_id = '66666666-6666-6666-6666-666666666661') <> 2 then
    raise exception 'FAIL: expected 2 capture events, got %',
      (select count(*) from public.game_capture_events where game_id = '66666666-6666-6666-6666-666666666661');
  end if;
  if (select count(*) from public.game_capture_board_placements where game_id = '66666666-6666-6666-6666-666666666661') <> 1 then
    raise exception 'FAIL: expected 1 board placement';
  end if;
  -- Placement is linked to its envelope event.
  if not exists (
    select 1 from public.game_capture_board_placements bp
    join public.game_capture_events e on e.id = bp.event_id
    where bp.game_id = '66666666-6666-6666-6666-666666666661'
  ) then
    raise exception 'FAIL: placement not linked to its envelope event';
  end if;
  -- Game-level Venus/Colonies state + derived counts land in game_expansion_facts.
  if not exists (
    select 1 from public.game_expansion_facts
    where game_id = '66666666-6666-6666-6666-666666666661'
      and venus_next_state = 'confirmed_present'
      and colonies_state = 'confirmed_absent'
      and venus_event_count = 1
      and final_venus_scale = 8
  ) then
    raise exception 'FAIL: game_expansion_facts forward state/counts incorrect';
  end if;
end;
$$;

-- Second, identical capture: retry is idempotent (no duplicates, same ids).
select public.replace_game_capture_v2(
  '66666666-6666-6666-6666-666666666661',
  '88888888-8888-8888-8888-888888888881',
  pg_temp.sample_capture()
);

do $$
begin
  if (select count(*) from public.game_capture_parser_runs where game_id = '66666666-6666-6666-6666-666666666661') <> 1 then
    raise exception 'FAIL: retry created a duplicate parser run';
  end if;
  if (select count(*) from public.game_capture_events where game_id = '66666666-6666-6666-6666-666666666661') <> 2 then
    raise exception 'FAIL: retry duplicated capture events';
  end if;
  if (select count(*) from public.game_capture_board_placements where game_id = '66666666-6666-6666-6666-666666666661') <> 1 then
    raise exception 'FAIL: retry duplicated placements';
  end if;
  if (select count(distinct event_uid) from public.game_capture_events where game_id = '66666666-6666-6666-6666-666666666661') <> 2 then
    raise exception 'FAIL: event uids are not deterministic across retries';
  end if;
  raise notice 'PASS test_20_capture_idempotency';
end;
$$;

rollback;
