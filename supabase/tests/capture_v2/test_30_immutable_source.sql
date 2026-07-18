-- The immutable source is written once and never overwritten by a re-parse.
begin;

select public.replace_game_capture_v2(
  '66666666-6666-6666-6666-666666666661',
  '88888888-8888-8888-8888-888888888881',
  jsonb_build_object(
    'parser_version', 'tm-data-capture-v2', 'provenance', 'parser_derived',
    'coverage_state', 'complete', 'venus_state', 'confirmed_absent',
    'colonies_state', 'confirmed_absent',
    'source', jsonb_build_object('text', 'Generation 1', 'sha256', repeat('a', 64),
      'format', 'manual_web_import', 'byte_length', 12),
    'events', jsonb_build_array(), 'placements', jsonb_build_array(),
    'unsupported', jsonb_build_array()
  )
);

do $$
declare rejected boolean := false;
begin
  begin
    update public.game_capture_import_sources
    set original_source_text = 'tampered'
    where game_log_import_id = '88888888-8888-8888-8888-888888888881';
  exception when others then rejected := true;
  end;
  if not rejected then
    raise exception 'FAIL: immutable source text was allowed to change';
  end if;
end;
$$;

-- Re-capturing the same import with a different source hash is rejected: the
-- original evidence must not be replaced.
do $$
declare rejected boolean := false;
begin
  begin
    perform public.replace_game_capture_v2(
      '66666666-6666-6666-6666-666666666661',
      '88888888-8888-8888-8888-888888888881',
      jsonb_build_object(
        'parser_version', 'tm-data-capture-v2', 'provenance', 'parser_derived',
        'coverage_state', 'complete', 'venus_state', 'confirmed_absent',
        'colonies_state', 'confirmed_absent',
        'source', jsonb_build_object('text', 'DIFFERENT', 'sha256', repeat('b', 64),
          'format', 'manual_web_import', 'byte_length', 9),
        'events', jsonb_build_array(), 'placements', jsonb_build_array(),
        'unsupported', jsonb_build_array()
      )
    );
  exception when others then rejected := true;
  end;
  if not rejected then
    raise exception 'FAIL: mismatched source hash was accepted';
  end if;
  raise notice 'PASS test_30_immutable_source';
end;
$$;

rollback;
