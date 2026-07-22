-- AFTER half of the linked-player matching regression proof. Runs against the
-- same fixtures the BEFORE half installed, after run.sh re-applies the
-- expansion migration and restores the shipped matcher definition.
--
-- Every probe here is the exact counterpart of a BEFORE probe that failed.

create temporary table after_probe_results (
  probe text primary key,
  outcome text,
  resolved_player uuid,
  public_label text
);

do $$
declare
  stage_id uuid;
  r record;
  before_players integer;
  after_players integer;
begin
  set local role service_role;
  select public.stage_import_player_identity_evidence(
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    array[
      'Linked Aliasowner',
      'Legacyfull Personname',
      'legacyusernameonly',
      'Legacyrow Personname',
      'Linked'
    ],
    'executable-parser-v1',
    'terraforming_mars_exported_log'
  ) into stage_id;
  reset role;
  if stage_id is null then
    raise exception 'AFTER FAIL: could not stage the source evidence';
  end if;

  -- 1. The linked-player alias seat now resolves automatically.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into after_probe_results
  values ('1_linked_alias_auto', r.outcome, r.player_id, r.public_label);

  -- 2. Explicit user selection of the same player now succeeds.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'existing_player', null, null, null,
    '0ac1e005-0ac1-4005-8005-000000000005', false
  );
  reset role;
  insert into after_probe_results
  values ('2_linked_alias_explicit', r.outcome, r.player_id, r.public_label);

  -- 3. The create-new path no longer mints a duplicate for a linked user: the
  --    existing player is found first, so no player row is added at all.
  select count(*) into before_players from public.players
  where group_id = '22222222-2222-4222-8222-222222222222';
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'personal_name', null, 'Linked', 'Aliasowner', null, true
  );
  reset role;
  select count(*) into after_players from public.players
  where group_id = '22222222-2222-4222-8222-222222222222';
  insert into after_probe_results
  values ('3_create_new_reuses', r.outcome, r.player_id, r.public_label);
  if after_players <> before_players then
    raise exception
      'AFTER FAIL: create-new still changed the player population %->%',
      before_players, after_players;
  end if;

  -- 4. Username mode matches the space-normalized multi-token alias. 44 of the
  --    110 production alias rows are multi-token, and none is stored in the
  --    username normalizer's hyphen form, so this path stayed dead even with
  --    the linked gate removed until both normalized forms were compared.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'username', 'Linked Aliasowner', null, null, null, false
  );
  reset role;
  insert into after_probe_results
  values ('4_username_mode_alias', r.outcome, r.player_id, r.public_label);

  -- 5. public.players.full_name. The seat text also exists on a player in a
  --    group the caller is not staging into, so a single resolved candidate
  --    here is also the cross-group isolation proof: a leak would surface as
  --    `ambiguous`, not as a wrong player.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 2,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into after_probe_results
  values ('5_players_full_name', r.outcome, r.player_id, r.public_label);

  -- 6. public.players.username, the only evidence one production unlinked
  --    player has.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 3,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into after_probe_results
  values ('6_players_username', r.outcome, r.player_id, r.public_label);

  -- 7. private.player_legacy_identities.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 4,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into after_probe_results
  values ('7_legacy_identities_row', r.outcome, r.player_id, r.public_label);

  -- 8. First-name-only still never auto-links, even though the full name now
  --    matches an alias. Widening the evidence must not widen what counts as
  --    an unattended match.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 5,
    'personal_name', null, 'Linked', 'Aliasowner', null, true
  );
  reset role;
  insert into after_probe_results
  values ('8_first_name_only_auto', r.outcome, r.player_id, r.public_label);

  -- 9. ... and the sanctioned override for it still resolves.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 5,
    'personal_name', null, 'Linked', 'Aliasowner',
    '0ac1e005-0ac1-4005-8005-000000000005', false
  );
  reset role;
  insert into after_probe_results
  values ('9_first_name_only_explicit', r.outcome, r.player_id, r.public_label);
end $$;

do $$
declare
  expected_probe text;
  expected_outcome text;
  expected_player uuid;
  actual record;
begin
  for expected_probe, expected_outcome, expected_player in
    select * from (values
      ('1_linked_alias_auto', 'resolved', '0ac1e005-0ac1-4005-8005-000000000005'::uuid),
      ('2_linked_alias_explicit', 'resolved', '0ac1e005-0ac1-4005-8005-000000000005'::uuid),
      ('3_create_new_reuses', 'resolved', '0ac1e005-0ac1-4005-8005-000000000005'::uuid),
      ('4_username_mode_alias', 'resolved', '0ac1e005-0ac1-4005-8005-000000000005'::uuid),
      ('5_players_full_name', 'resolved', '0ac1e006-0ac1-4006-8006-000000000006'::uuid),
      ('6_players_username', 'resolved', '0ac1e007-0ac1-4007-8007-000000000007'::uuid),
      ('7_legacy_identities_row', 'resolved', '0ac1e008-0ac1-4008-8008-000000000008'::uuid),
      ('8_first_name_only_auto', 'ambiguous', null::uuid),
      ('9_first_name_only_explicit', 'resolved', '0ac1e005-0ac1-4005-8005-000000000005'::uuid)
    ) as e(probe, outcome, player)
  loop
    select * into actual from after_probe_results where probe = expected_probe;
    if actual.outcome is distinct from expected_outcome
       or actual.resolved_player is distinct from expected_player then
      raise exception 'AFTER FAIL: probe % returned outcome=% player=%, expected outcome=% player=%',
        expected_probe, coalesce(actual.outcome, '<no row>'), actual.resolved_player,
        expected_outcome, expected_player;
    end if;
  end loop;
end $$;

-- No private value crosses the boundary. The label returned for the linked
-- player is the registered username -- the public identity -- and never the
-- alias text, the profile full name, or any normalized key derived from them.
do $$
declare
  bad text;
begin
  select string_agg(probe || '=' || coalesce(public_label, '<null>'), ', ' order by probe)
  into bad
  from after_probe_results
  where resolved_player = '0ac1e005-0ac1-4005-8005-000000000005'
    and public_label is distinct from 'linkedaliasowner';
  if bad is not null then
    raise exception 'AFTER FAIL: linked player label was not the registered username: %', bad;
  end if;

  select string_agg(probe || '=' || public_label, ', ' order by probe)
  into bad
  from after_probe_results
  where public_label ilike '%aliasowner %'
     or public_label ilike '%profileowner%'
     or public_label ilike '%legacyfull%'
     or public_label ilike '%legacyrow%'
     or public_label ilike '%legacyusernameonly%';
  if bad is not null then
    raise exception 'AFTER FAIL: a private identity value crossed the boundary: %', bad;
  end if;

  -- Unlinked players keep their neutral label.
  select string_agg(probe || '=' || coalesce(public_label, '<null>'), ', ' order by probe)
  into bad
  from after_probe_results ap
  join public.players p on p.id = ap.resolved_player
  where p.linked_user_id is null and ap.public_label !~ '^Guest [A-F0-9]{8}$';
  if bad is not null then
    raise exception 'AFTER FAIL: an unlinked player label was not neutral: %', bad;
  end if;
end $$;

-- The BEFORE half minted a duplicate and deleted it again; nothing here may
-- have added one. 0ac1e005 must still be the only player carrying the alias.
do $$
declare n int;
begin
  select count(*) into n
  from public.player_import_aliases
  where group_id = '22222222-2222-4222-8222-222222222222'
    and normalized_alias = private.normalize_private_personal_name('Linked Aliasowner', null);
  if n <> 1 then
    raise exception 'AFTER FAIL: expected exactly one alias row for the seat, found %', n;
  end if;
end $$;

select probe, outcome from after_probe_results order by probe;
select 'SOURCE_BOUND_LINKED_ALIAS_AFTER_PINNED' as result;
