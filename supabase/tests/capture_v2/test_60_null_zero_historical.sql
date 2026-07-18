-- Missing-versus-zero semantics and historical-cutoff preservation.
begin;

-- Capture a confirmed-absent game with no Venus scale and no Venus events.
select public.replace_game_capture_v2(
  '66666666-6666-6666-6666-666666666661',
  '88888888-8888-8888-8888-888888888881',
  jsonb_build_object(
    'parser_version', 'tm-data-capture-v2', 'provenance', 'parser_derived',
    'coverage_state', 'complete', 'venus_state', 'confirmed_absent',
    'colonies_state', 'confirmed_absent', 'final_venus_scale', null,
    'source', jsonb_build_object('text', 'Generation 1', 'sha256', repeat('a', 64),
      'format', 'manual_web_import', 'byte_length', 12),
    'events', jsonb_build_array(), 'placements', jsonb_build_array(),
    'unsupported', jsonb_build_array()
  )
);

do $$
declare v_scale smallint; v_count integer;
begin
  select final_venus_scale, venus_event_count into v_scale, v_count
  from public.game_expansion_facts
  where game_id = '66666666-6666-6666-6666-666666666661';

  -- Missing Venus scale is NULL, never coalesced to zero.
  if v_scale is not null then
    raise exception 'FAIL: absent Venus final scale should be NULL, got %', v_scale;
  end if;
  -- Event count is a real zero (no events happened), distinct from unknown scale.
  if v_count <> 0 then
    raise exception 'FAIL: venus_event_count should be 0, got %', v_count;
  end if;
end;
$$;

-- Historical game (pre-cutoff) is untouched by a forward capture on another game.
do $$
begin
  if not exists (
    select 1 from public.game_expansion_facts
    where game_id = '66666666-6666-6666-6666-666666666662'
      and venus_next_state = 'historical_parser_verified_owner_confirmed_absent'
      and colonies_state = 'historical_parser_verified_owner_confirmed_absent'
      and backfill_version = 'phase-04-step-03b-owner-confirmed-absence-v1'
      and backfilled_at is not null
  ) then
    raise exception 'FAIL: historical owner-confirmed absence row was disturbed';
  end if;
  raise notice 'PASS test_60_null_zero_historical';
end;
$$;

rollback;
