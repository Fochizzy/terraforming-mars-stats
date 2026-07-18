-- Attribution scope: only players/game-players belonging to the game are
-- accepted; unrelated ids are rejected; unattributed is allowed.
begin;

insert into public.game_capture_parser_runs (
  id, game_id, game_log_import_id, source_sha256, parser_version, coverage_state, coverage, provenance
) values (
  '00000000-0000-0000-0000-0000000000b1',
  '66666666-6666-6666-6666-666666666661',
  '88888888-8888-8888-8888-888888888881',
  repeat('a', 64), 'tm-data-capture-v2', 'complete', '{}'::jsonb, 'test'
);

-- A player from a different group cannot be attached (player-scope trigger).
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.game_capture_events (
      event_uid, game_id, parser_run_id, source_sha256, event_sequence, player_id,
      attribution_status, event_category, event_type, source_text, confidence,
      coverage_state, provenance
    ) values (
      'unrelated-player', '66666666-6666-6666-6666-666666666661',
      '00000000-0000-0000-0000-0000000000b1', repeat('a', 64), 0,
      '33333333-3333-3333-3333-33333333333a',  -- Outsider, group 2
      'explicit_stable', 'pass', 'player_passed', 'x', 'high', 'complete', 'p'
    );
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: unrelated player id accepted'; end if;
end;
$$;

-- A game_player from a different game cannot be attached (composite FK).
do $$
declare rejected boolean := false;
begin
  begin
    insert into public.game_capture_events (
      event_uid, game_id, parser_run_id, source_sha256, event_sequence, game_player_id,
      attribution_status, event_category, event_type, source_text, confidence,
      coverage_state, provenance
    ) values (
      'cross-game-gp', '66666666-6666-6666-6666-666666666661',
      '00000000-0000-0000-0000-0000000000b1', repeat('a', 64), 0,
      '77777777-7777-7777-7777-77777777777a',  -- game_player of a different game
      'explicit_stable', 'pass', 'player_passed', 'x', 'high', 'complete', 'p'
    );
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'FAIL: cross-game game_player id accepted'; end if;
end;
$$;

-- An unattributed event (no player) is allowed and is not a parser failure.
insert into public.game_capture_events (
  event_uid, game_id, parser_run_id, source_sha256, event_sequence,
  attribution_status, event_category, event_type, source_text, confidence,
  coverage_state, provenance
) values (
  'unattributed-ok', '66666666-6666-6666-6666-666666666661',
  '00000000-0000-0000-0000-0000000000b1', repeat('a', 64), 0,
  'unattributed', 'global_parameter', 'oxygen_raised', 'World Government raised oxygen',
  'high', 'complete', 'p'
);

-- A valid participant of the game is accepted with both ids.
insert into public.game_capture_events (
  event_uid, game_id, parser_run_id, source_sha256, event_sequence, player_id, game_player_id,
  attribution_status, event_category, event_type, source_text, confidence,
  coverage_state, provenance
) values (
  'participant-ok', '66666666-6666-6666-6666-666666666661',
  '00000000-0000-0000-0000-0000000000b1', repeat('a', 64), 1,
  '33333333-3333-3333-3333-333333333331', '77777777-7777-7777-7777-777777777771',
  'explicit_stable', 'pass', 'player_passed', 'Ada passed', 'high', 'complete', 'p'
);

do $$
begin
  if (select count(*) from public.game_capture_events where parser_run_id = '00000000-0000-0000-0000-0000000000b1') <> 2 then
    raise exception 'FAIL: expected the two valid events to persist';
  end if;
  raise notice 'PASS test_50_attribution_scope';
end;
$$;

rollback;
