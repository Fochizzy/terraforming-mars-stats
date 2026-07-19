-- Executable assertions run after seed.sql and the 212342 alias migration.

-- A) exactly the seven catalog aliases were inserted.
do $$
declare n int;
begin
  select count(*) into n from public.domain_text_aliases where source = 'catalog';
  if n <> 7 then raise exception 'ASSERT FAIL: expected 7 catalog aliases, got %', n; end if;
end $$;

-- B) 23 canonical colonies seeded by the event-contract migration.
do $$
declare n int;
begin
  select count(*) into n from public.terraforming_mars_colonies;
  if n <> 23 then raise exception 'ASSERT FAIL: expected 23 colonies, got %', n; end if;
end $$;

-- C) confidence 'reviewed' persists on a non-tile event (F-03 TS -> RPC -> DB).
insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, payload)
values ('44444444-4444-4444-8444-444444444444', 1000, 'generation_started', 'Generation 4', 'reviewed', '{}'::jsonb);

-- C2) an unsupported confidence value is rejected.
do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, payload)
    values ('44444444-4444-4444-8444-444444444444', 1001, 'generation_started', 'x', 'bogus', '{}'::jsonb);
    raise exception 'ASSERT FAIL: unsupported confidence accepted';
  exception when check_violation then null; end;
end $$;

-- D) event_type allowlist rejects an unknown type.
do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, payload)
    values ('44444444-4444-4444-8444-444444444444', 1002, 'not_a_real_type', 'x', 'high', '{}'::jsonb);
    raise exception 'ASSERT FAIL: unknown event_type accepted';
  exception when check_violation then null; end;
end $$;

-- E) a tile event without typed placement identity/provenance is rejected (F-02).
do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, board_space, tile_type, payload)
    values ('44444444-4444-4444-8444-444444444444', 1003, 'tile_placed', 'X placed ocean tile at 07', 'high', '07', 'ocean', '{}'::jsonb);
    raise exception 'ASSERT FAIL: tile_placed without typed placement fields accepted';
  exception when check_violation then null; end;
end $$;

-- F) a malformed deterministic event_identity is rejected (F-07).
do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, event_identity, payload)
    values ('44444444-4444-4444-8444-444444444444', 1004, 'generation_started', 'x', 'high', 'BAD IDENTITY!!', '{}'::jsonb);
    raise exception 'ASSERT FAIL: malformed event_identity accepted';
  exception when check_violation then null; end;
end $$;

-- G) a colony_id outside the canonical catalogue is rejected (F-07).
do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, colony_id, event_identity, payload)
    values ('44444444-4444-4444-8444-444444444444', 1005, 'colony_traded', 'x', 'high', 'not_a_colony', '5:colony_traded:not_a_colony', '{}'::jsonb);
    raise exception 'ASSERT FAIL: unknown colony_id accepted';
  exception when foreign_key_violation then null; end;
end $$;

-- G2) a canonical colony_id with a well-formed identity is accepted.
insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, colony_id, event_identity, payload)
values ('44444444-4444-4444-8444-444444444444', 1006, 'colony_traded', 'X traded with Luna', 'high', 'luna', '6:colony_traded:luna', '{}'::jsonb);

-- H) privacy boundary: an ordinary authenticated member cannot directly read
-- the private identity table or the private import-alias table (F-01).
do $$ begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  begin
    perform 1 from private.player_private_identities;
    raise exception 'ASSERT FAIL: authenticated read private.player_private_identities';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.player_import_aliases;
    raise exception 'ASSERT FAIL: authenticated read public.player_import_aliases';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

select 'ALL_ASSERTIONS_PASSED' as result;
