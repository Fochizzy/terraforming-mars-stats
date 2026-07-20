-- Executable assertions run after seed.sql, the 212342 alias migration, the
-- legacy overloaded-confidence seed rows, and the 20260719234500
-- confidence/review-state split migration.

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

-- C) the split contract (WS4): confidence is strictly evidence strength and
-- review_state is a separate lifecycle. 'reviewed' is no longer a confidence.
do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, payload)
    values ('44444444-4444-4444-8444-444444444444', 1000, 'generation_started', 'Generation 4', 'reviewed', '{}'::jsonb);
    raise exception 'ASSERT FAIL: overloaded confidence ''reviewed'' accepted after split';
  exception when check_violation then null; end;
end $$;

-- C2) an unsupported confidence value is rejected.
do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, payload)
    values ('44444444-4444-4444-8444-444444444444', 1001, 'generation_started', 'x', 'bogus', '{}'::jsonb);
    raise exception 'ASSERT FAIL: unsupported confidence accepted';
  exception when check_violation then null; end;
end $$;

-- C3) every canonical review_state persists; an unsupported one is rejected.
insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, review_state, event_identity, payload)
values
  ('44444444-4444-4444-8444-444444444444', 1010, 'generation_started', 'Generation 5', 'high', 'not_required', null, '{}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 1011, 'colony_traded', 'X traded with Fake Colony', 'low', 'needs_review', '1011:colony_traded:none', '{"canonical_colony_name":"Fake Colony"}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 1012, 'milestone_claimed', 'X claimed Mayor', 'high', 'reviewed', null, '{"resolution":"corrected"}'::jsonb),
  ('44444444-4444-4444-8444-444444444444', 1013, 'card_played', 'X played Unknown Card', 'low', 'rejected', null, '{}'::jsonb);

do $$ begin
  begin
    insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, review_state, payload)
    values ('44444444-4444-4444-8444-444444444444', 1014, 'generation_started', 'x', 'high', 'maybe_later', '{}'::jsonb);
    raise exception 'ASSERT FAIL: unsupported review_state accepted';
  exception when check_violation then null; end;
end $$;

-- C4) the migration split the pre-seeded legacy overloaded rows
-- deterministically: an importer-corrected row became high/reviewed, an
-- unresolved-colony row became low/needs_review, and no 'reviewed'
-- confidence value survives anywhere.
do $$
declare v_conf text; v_state text; n int;
begin
  select confidence_level, review_state into v_conf, v_state
  from public.game_log_events
  where game_log_import_id = '44444444-4444-4444-8444-444444444444' and event_order = 900;
  if v_conf <> 'high' or v_state <> 'reviewed' then
    raise exception 'ASSERT FAIL: corrected legacy row mapped to %/%, expected high/reviewed', v_conf, v_state;
  end if;

  select confidence_level, review_state into v_conf, v_state
  from public.game_log_events
  where game_log_import_id = '44444444-4444-4444-8444-444444444444' and event_order = 901;
  if v_conf <> 'low' or v_state <> 'needs_review' then
    raise exception 'ASSERT FAIL: unresolved legacy row mapped to %/%, expected low/needs_review', v_conf, v_state;
  end if;

  select count(*) into n from public.game_log_events where confidence_level = 'reviewed';
  if n <> 0 then
    raise exception 'ASSERT FAIL: % rows still carry overloaded confidence ''reviewed''', n;
  end if;
end $$;

-- C5) an event inserted without review_state defaults to not_required
-- (pre-split RPC payload compatibility).
do $$
declare v_state text;
begin
  insert into public.game_log_events (game_log_import_id, event_order, event_type, raw_line, confidence_level, payload)
  values ('44444444-4444-4444-8444-444444444444', 1015, 'generation_started', 'Generation 6', 'medium', '{}'::jsonb)
  returning review_state into v_state;
  if v_state <> 'not_required' then
    raise exception 'ASSERT FAIL: default review_state was %, expected not_required', v_state;
  end if;
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

-- I) replace_game_log_events authorization: an authenticated caller who is
-- not a member of the game's group is rejected before any write (F-07 / WS8).
do $$ begin
  perform set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);
  set local role authenticated;
  begin
    perform public.replace_game_log_events(
      '44444444-4444-4444-8444-444444444444',
      '[{"event_order": 1, "event_type": "generation_started", "raw_line": "Generation 1", "confidence_level": "high", "payload": {}}]'::jsonb
    );
    raise exception 'ASSERT FAIL: non-member executed replace_game_log_events';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

-- J) replace_game_log_events persistence contract for an authorized editor:
-- duplicate event identities are rejected, an unrelated player UUID is
-- rejected, and a valid payload persists the split confidence/review values.
do $$
declare v_conf text; v_state text;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;

  begin
    perform public.replace_game_log_events(
      '44444444-4444-4444-8444-444444444444',
      '[{"event_order": 2001, "event_type": "milestone_claimed", "raw_line": "x", "confidence_level": "high", "event_identity": "dup:identity", "payload": {}},
        {"event_order": 2002, "event_type": "milestone_claimed", "raw_line": "y", "confidence_level": "high", "event_identity": "dup:identity", "payload": {}}]'::jsonb
    );
    raise exception 'ASSERT FAIL: duplicate event identities accepted by the RPC';
  exception when unique_violation then null; end;

  begin
    perform public.replace_game_log_events(
      '44444444-4444-4444-8444-444444444444',
      '[{"event_order": 2003, "event_type": "milestone_claimed", "raw_line": "x", "confidence_level": "high", "player_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "payload": {}}]'::jsonb
    );
    raise exception 'ASSERT FAIL: unrelated player UUID accepted by the RPC';
  exception when foreign_key_violation then null; end;

  begin
    perform public.replace_game_log_events(
      '44444444-4444-4444-8444-444444444444',
      '[{"event_order": 2004, "event_type": "milestone_claimed", "raw_line": "x", "confidence_level": "reviewed", "payload": {}}]'::jsonb
    );
    raise exception 'ASSERT FAIL: overloaded confidence accepted by the RPC';
  exception when invalid_parameter_value then null; end;

  perform public.replace_game_log_events(
    '44444444-4444-4444-8444-444444444444',
    '[{"event_order": 2005, "event_type": "milestone_claimed", "raw_line": "X claimed Mayor milestone", "confidence_level": "high", "review_state": "reviewed", "payload": {"resolution": "corrected"}}]'::jsonb
  );
  reset role;

  select confidence_level, review_state into v_conf, v_state
  from public.game_log_events
  where game_log_import_id = '44444444-4444-4444-8444-444444444444' and event_order = 2005;
  if v_conf <> 'high' or v_state <> 'reviewed' then
    raise exception 'ASSERT FAIL: RPC persisted %/%, expected high/reviewed', v_conf, v_state;
  end if;
end $$;

-- K) Guest personal-name privacy lifecycle (F-01 / H5, WS1). A member creates
-- a first-and-last-name guest through the guarded RPC with alias recording
-- off (the roster / manual-entry path). The sentinel personal name must land
-- ONLY in private storage; the public row gets a neutral label; the private
-- normalized value still drives server-side reuse matching; and the alias
-- default remains unchanged for import callers.
create temporary table if not exists k_state (
  key text primary key,
  player_id uuid
);

-- K1: member creates the guest; neutral public name is returned.
do $$
declare v_id uuid; v_public text; v_state text;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select r.player_id, r.public_name, r.resolution_state
  into v_id, v_public, v_state
  from public.resolve_import_guest_identity(
    '22222222-2222-4222-8222-222222222222', 'personal_name',
    null, 'Zzsentinelfirst', 'Zzsentinellast', null, true, false
  ) r;
  reset role;
  if v_id is null then
    raise exception 'ASSERT FAIL K1: guest was not created';
  end if;
  if v_state <> 'newly_created_unlinked_guest' then
    raise exception 'ASSERT FAIL K1: state %, expected newly_created_unlinked_guest', v_state;
  end if;
  if v_public not like 'Guest %' or v_public ilike '%sentinel%' then
    raise exception 'ASSERT FAIL K1: public name % is not a neutral label', v_public;
  end if;
  insert into k_state (key, player_id) values ('guest', v_id);
end $$;

-- K2: the public players row carries only the neutral label.
do $$
declare v_display text; v_norm text;
begin
  select p.display_name, p.normalized_display_name into v_display, v_norm
  from public.players p
  join k_state k on k.player_id = p.id and k.key = 'guest';
  if v_display not like 'Guest %' or v_display ilike '%sentinel%'
     or coalesce(v_norm, '') ilike '%sentinel%' then
    raise exception 'ASSERT FAIL K2: personal name reached public display columns (%/%)', v_display, v_norm;
  end if;
end $$;

-- K3: no import alias row was recorded for the non-import creation.
do $$
declare n int;
begin
  select count(*) into n
  from public.player_import_aliases pia
  join k_state k on k.player_id = pia.player_id and k.key = 'guest';
  if n <> 0 then
    raise exception 'ASSERT FAIL K3: % false import-alias rows recorded for a roster creation', n;
  end if;
end $$;

-- K4: the personal name and its normalized matching value exist ONLY in the
-- private identity store (server-side authorized matching data).
do $$
declare n int;
begin
  select count(*) into n
  from private.player_private_identities ppi
  join k_state k on k.player_id = ppi.player_id and k.key = 'guest'
  where ppi.identity_mode = 'personal_name'
    and ppi.guest_first_name = 'Zzsentinelfirst'
    and ppi.guest_last_name = 'Zzsentinellast'
    and ppi.normalized_personal_name = 'zzsentinelfirst zzsentinellast';
  if n <> 1 then
    raise exception 'ASSERT FAIL K4: private identity row missing or wrong (count %)', n;
  end if;
end $$;

-- K5: with private rows now present, an authenticated member still cannot
-- read the private identity table.
do $$ begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  begin
    perform 1 from private.player_private_identities;
    raise exception 'ASSERT FAIL K5: authenticated read private.player_private_identities with rows present';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

-- K6: no players column readable by the member contains the sentinel.
do $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select count(*) into n
  from public.players p
  where p.display_name ilike '%sentinel%'
     or p.normalized_display_name ilike '%sentinel%';
  reset role;
  if n <> 0 then
    raise exception 'ASSERT FAIL K6: sentinel personal name readable through players (% rows)', n;
  end if;
end $$;

-- K7: re-resolving the same personal name reuses the same stable player ID —
-- the private normalized value performs authorized server-side matching.
do $$
declare v_id uuid; v_state text; v_expected uuid;
begin
  select player_id into v_expected from k_state where key = 'guest';
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select r.player_id, r.resolution_state into v_id, v_state
  from public.resolve_import_guest_identity(
    '22222222-2222-4222-8222-222222222222', 'personal_name',
    null, '  zzSENTINELfirst ', ' zzsentinelLAST  ', null, true, false
  ) r;
  reset role;
  if v_id is distinct from v_expected then
    raise exception 'ASSERT FAIL K7: reuse resolved % instead of the existing guest %', v_id, v_expected;
  end if;
  if v_state <> 'existing_unlinked_guest' then
    raise exception 'ASSERT FAIL K7: state %, expected existing_unlinked_guest', v_state;
  end if;
end $$;

-- K8: the public name resolver returns the neutral label for the guest and
-- the registered username for a linked player; never a personal name.
insert into public.user_profiles (user_id, username, full_name)
values (
  '11111111-1111-4111-8111-111111111111',
  'registered-handle-k',
  'Zzsentinel Linkedprofile'
)
on conflict (user_id) do update set username = excluded.username;
insert into public.players (id, group_id, linked_user_id, display_name)
values (
  '66666666-6666-4666-8666-666666666666',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'registered-handle-k'
)
on conflict (id) do nothing;

do $$
declare v_guest text; v_linked text; v_guest_id uuid;
begin
  select player_id into v_guest_id from k_state where key = 'guest';
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select public_name into v_guest
  from public.get_public_player_names(array[v_guest_id]);
  select public_name into v_linked
  from public.get_public_player_names(array['66666666-6666-4666-8666-666666666666'::uuid]);
  reset role;
  if v_guest not like 'Guest %' or v_guest ilike '%sentinel%' then
    raise exception 'ASSERT FAIL K8: guest public name % is not neutral', v_guest;
  end if;
  if v_linked <> 'registered-handle-k' then
    raise exception 'ASSERT FAIL K8: linked player resolved to % instead of the registered username', v_linked;
  end if;
end $$;

-- K9: the import path's alias recording is unchanged — omitting the new
-- parameter records the game_log alias exactly as before.
do $$
declare v_id uuid; n int;
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  select r.player_id into v_id
  from public.resolve_import_guest_identity(
    '22222222-2222-4222-8222-222222222222', 'username',
    'import-guest-k9', null, null, null, true
  ) r;
  reset role;
  select count(*) into n
  from public.player_import_aliases
  where player_id = v_id
    and source_type = 'game_log'
    and identity_mode = 'username';
  if n <> 1 then
    raise exception 'ASSERT FAIL K9: expected 1 game_log alias for the import-path guest, got %', n;
  end if;
end $$;

select 'ALL_ASSERTIONS_PASSED' as result;
