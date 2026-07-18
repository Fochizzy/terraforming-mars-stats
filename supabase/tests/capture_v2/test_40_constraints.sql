-- Canonical constraints: invalid event types, invalid colonies, and blank
-- children are rejected.
begin;

insert into public.game_capture_parser_runs (
  id, game_id, game_log_import_id, source_sha256, parser_version, coverage_state, coverage, provenance
) values (
  '00000000-0000-0000-0000-0000000000a1',
  '66666666-6666-6666-6666-666666666661',
  '88888888-8888-8888-8888-888888888881',
  repeat('a', 64), 'tm-data-capture-v2', 'complete', '{}'::jsonb, 'test'
);

-- Invalid (category, type) pair rejected by the catalogue foreign key.
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.game_capture_events (
      event_uid, game_id, parser_run_id, source_sha256, event_sequence,
      attribution_status, event_category, event_type, source_text, confidence,
      coverage_state, provenance
    ) values (
      'bad-type', '66666666-6666-6666-6666-666666666661',
      '00000000-0000-0000-0000-0000000000a1', repeat('a', 64), 0,
      'not_applicable', 'colony', 'not_a_real_type', 'x', 'high', 'complete', 'p'
    );
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: invalid event type accepted'; end if;
end;
$$;

-- Unknown colony rejected by the colony-catalogue trigger.
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.game_capture_events (
      event_uid, game_id, parser_run_id, source_sha256, event_sequence,
      attribution_status, event_category, event_type, canonical_entity_id,
      source_text, confidence, coverage_state, provenance
    ) values (
      'bad-colony', '66666666-6666-6666-6666-666666666661',
      '00000000-0000-0000-0000-0000000000a1', repeat('a', 64), 0,
      'unattributed', 'colony', 'built_colony', 'atlantis', 'x', 'high', 'complete', 'p'
    );
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: unknown colony id accepted'; end if;
end;
$$;

-- A known colony is accepted.
insert into public.game_capture_events (
  event_uid, game_id, parser_run_id, source_sha256, event_sequence,
  attribution_status, event_category, event_type, canonical_entity_id,
  source_text, confidence, coverage_state, provenance
) values (
  'good-colony', '66666666-6666-6666-6666-666666666661',
  '00000000-0000-0000-0000-0000000000a1', repeat('a', 64), 0,
  'unattributed', 'colony', 'built_colony', 'titan', 'x', 'high', 'complete', 'p'
);

-- Blank event_uid rejected by the RPC's no-blank-children rule.
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
        'source', jsonb_build_object('text', 'x', 'sha256', repeat('a', 64),
          'format', 'manual_web_import', 'byte_length', 1),
        'events', jsonb_build_array(jsonb_build_object(
          'event_uid', '  ', 'event_sequence', 0, 'attribution_status', 'unattributed',
          'event_category', 'pass', 'event_type', 'player_passed', 'source_text', 'x',
          'confidence', 'high', 'coverage_state', 'complete', 'provenance', 'p'
        )),
        'placements', jsonb_build_array(), 'unsupported', jsonb_build_array()
      )
    );
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: blank event_uid accepted'; end if;
  raise notice 'PASS test_40_constraints';
end;
$$;

rollback;
