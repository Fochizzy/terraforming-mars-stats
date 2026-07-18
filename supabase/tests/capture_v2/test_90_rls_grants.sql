-- RLS, grants, and function EXECUTE privileges.
do $$
declare t text;
begin
  foreach t in array array[
    'game_capture_import_sources', 'game_capture_parser_runs', 'game_capture_events',
    'game_capture_board_placements', 'game_capture_map_detections',
    'game_capture_unsupported_evidence'
  ] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || t)::regclass) then
      raise exception 'FAIL: RLS not enabled on %', t;
    end if;
    if exists (
      select 1 from information_schema.role_table_grants
      where table_schema = 'public' and table_name = t and grantee = 'anon'
    ) then
      raise exception 'FAIL: anon has grants on %', t;
    end if;
    if not exists (
      select 1 from information_schema.role_table_grants
      where table_schema = 'public' and table_name = t and grantee = 'authenticated'
        and privilege_type = 'SELECT'
    ) then
      raise exception 'FAIL: authenticated lacks SELECT on %', t;
    end if;
  end loop;

  -- Capture writer executable by authenticated, not by anon or public.
  if not has_function_privilege('authenticated', 'public.replace_game_capture_v2(uuid,uuid,jsonb)', 'execute') then
    raise exception 'FAIL: authenticated cannot execute replace_game_capture_v2';
  end if;
  if has_function_privilege('anon', 'public.replace_game_capture_v2(uuid,uuid,jsonb)', 'execute') then
    raise exception 'FAIL: anon can execute replace_game_capture_v2';
  end if;
end;
$$;

-- Behavioural RLS: a group member reads the game's capture events; a non-member
-- does not.
begin;

insert into public.game_capture_parser_runs (
  id, game_id, game_log_import_id, source_sha256, parser_version, coverage_state, coverage, provenance
) values (
  '00000000-0000-0000-0000-0000000000c1',
  '66666666-6666-6666-6666-666666666661',
  '88888888-8888-8888-8888-888888888881',
  repeat('a', 64), 'tm-data-capture-v2', 'complete', '{}'::jsonb, 'test'
);
insert into public.game_capture_events (
  event_uid, game_id, parser_run_id, source_sha256, event_sequence,
  attribution_status, event_category, event_type, source_text, confidence,
  coverage_state, provenance
) values (
  'rls-visible', '66666666-6666-6666-6666-666666666661',
  '00000000-0000-0000-0000-0000000000c1', repeat('a', 64), 0,
  'unattributed', 'pass', 'player_passed', 'Ada passed', 'high', 'complete', 'p'
);

set local role authenticated;

select set_config('test.uid', '22222222-2222-2222-2222-222222222221', true);  -- member
do $$
begin
  if (select count(*) from public.game_capture_events where game_id = '66666666-6666-6666-6666-666666666661') < 1 then
    raise exception 'FAIL: group member cannot read the game capture events';
  end if;
end;
$$;

select set_config('test.uid', '22222222-2222-2222-2222-222222222222', true);  -- non-member
do $$
begin
  if (select count(*) from public.game_capture_events where game_id = '66666666-6666-6666-6666-666666666661') <> 0 then
    raise exception 'FAIL: a non-member could read capture events';
  end if;
  raise notice 'PASS test_90_rls_grants';
end;
$$;

rollback;
