-- BEFORE half of the linked-player matching regression proof.
--
-- WHAT THIS REPRODUCES
-- The production shape, measured by a count-only introspection pass on
-- 2026-07-21: 110 of 110 public.player_import_aliases rows carry
-- identity_mode IS NULL, all 110 belong to players whose linked_user_id is NOT
-- NULL (22 of 28 players), private.player_private_identities holds 0 rows, and
-- private.player_legacy_identities holds 0 rows. Alias normalization is the
-- space form: 110 of 110 rows satisfy
-- normalized_alias = private.normalize_private_personal_name(alias_text, null)
-- while only the 66 single-token rows also satisfy
-- normalized_alias = private.normalize_guest_username(alias_text).
--
-- WHAT IT PROVES
-- Under the matcher as committed at e27fae282, a seat whose log text is carried
-- only by such an alias row does not resolve, cannot be resolved by explicit
-- user selection, and leaves minting a duplicate player for an already-linked
-- registered user as the only remaining path. The AFTER half asserts the fixed
-- behaviour against the same fixtures.
--
-- The function body below is the byte-exact definition from commit e27fae282,
-- reinstalled here so the regression is measured rather than asserted from
-- memory. run.sh re-applies the expansion migration immediately afterwards,
-- which restores the fixed definition and doubles as the repeat-safety apply.

-- ---------------------------------------------------------------------------
-- Fixtures: the production shape, plus the legacy-evidence gaps.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email)
values ('0ac1e0b0-0ac1-40b0-80b0-0000000000b0', 'linked-aliasowner@example.com');

-- A trigger on auth.users already materializes the profile row, so this upserts
-- the registered username rather than creating the row.
insert into public.user_profiles (user_id, username, full_name)
values (
  '0ac1e0b0-0ac1-40b0-80b0-0000000000b0',
  'linkedaliasowner',
  'Linked Profileowner'
)
on conflict (user_id) do update
set username = excluded.username, full_name = excluded.full_name;

-- A LINKED player. Its registered username is the public identity; the log
-- seat text is carried only by the legacy alias row below.
insert into public.players (id, group_id, display_name, full_name, username, linked_user_id)
values (
  '0ac1e005-0ac1-4005-8005-000000000005',
  '22222222-2222-4222-8222-222222222222',
  'Guest Oraclefifth', null, null,
  '0ac1e0b0-0ac1-40b0-80b0-0000000000b0'
);

-- identity_mode IS NULL and the space normalization: exactly the 110 rows that
-- exist in production, and a multi-token one (44 of the 110 are multi-token).
insert into public.player_import_aliases (
  group_id, player_id, source_type, identity_mode, alias_text, normalized_alias
) values (
  '22222222-2222-4222-8222-222222222222',
  '0ac1e005-0ac1-4005-8005-000000000005',
  'game_log', null, 'Linked Aliasowner',
  private.normalize_private_personal_name('Linked Aliasowner', null)
);

-- Unlinked player whose only identity evidence is public.players.full_name.
-- Production has exactly one player in this state.
insert into public.players (id, group_id, display_name, full_name, username, linked_user_id)
values (
  '0ac1e006-0ac1-4006-8006-000000000006',
  '22222222-2222-4222-8222-222222222222',
  'Guest Oraclesixth', 'Legacyfull Personname', null, null
);

-- Unlinked player whose only identity evidence is public.players.username.
-- Production has exactly one player in this state, and it is NOT recoverable
-- from private.player_legacy_identities, which is empty.
insert into public.players (id, group_id, display_name, full_name, username, linked_user_id)
values (
  '0ac1e007-0ac1-4007-8007-000000000007',
  '22222222-2222-4222-8222-222222222222',
  'Guest Oracleseventh', null, 'legacyusernameonly', null
);

-- Unlinked player whose only identity evidence is the private legacy table.
-- No production player is in this state today (the table holds 0 rows), but it
-- is the durable contract that preserves these values once the public columns
-- are dropped, so the path is proved here rather than left untested.
insert into public.players (id, group_id, display_name, full_name, username, linked_user_id)
values (
  '0ac1e008-0ac1-4008-8008-000000000008',
  '22222222-2222-4222-8222-222222222222',
  'Guest Oracleeighth', null, null, null
);

insert into private.player_legacy_identities (
  player_id, group_id, legacy_full_name, legacy_username, capture_source
) values (
  '0ac1e008-0ac1-4008-8008-000000000008',
  '22222222-2222-4222-8222-222222222222',
  'Legacyrow Personname', 'legacyrowusername',
  'executable proof fixture'
);

-- A second group the test caller does NOT belong to, carrying an alias with the
-- same normalized value. Widening the evidence the matcher reads is exactly the
-- change that could leak across a group boundary, so both halves probe it.
insert into public.groups (id, name)
values ('2b2b2b2b-2b2b-42b2-8b2b-2b2b2b2b2b2b', 'Other Group');

insert into public.players (id, group_id, display_name, full_name, username, linked_user_id)
values (
  '0ac1e009-0ac1-4009-8009-000000000009',
  '2b2b2b2b-2b2b-42b2-8b2b-2b2b2b2b2b2b',
  'Guest Oracleninth', 'Legacyfull Personname', null, null
);

insert into public.player_import_aliases (
  group_id, player_id, source_type, identity_mode, alias_text, normalized_alias
) values (
  '2b2b2b2b-2b2b-42b2-8b2b-2b2b2b2b2b2b',
  '0ac1e009-0ac1-4009-8009-000000000009',
  'game_log', null, 'Linked Aliasowner',
  private.normalize_private_personal_name('Linked Aliasowner', null)
);

-- ---------------------------------------------------------------------------
-- Pinned pre-image: the matcher exactly as committed at e27fae282.
-- ---------------------------------------------------------------------------

create or replace function private.import_identity_player_matches(
  p_group_id uuid,
  p_player_id uuid,
  p_source_text text,
  p_identity_mode text,
  p_guest_username text default null,
  p_guest_first_name text default null,
  p_guest_last_name text default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with values_to_match as (
    select
      nullif(btrim(regexp_replace(coalesce(p_source_text, ''), '[[:space:]]+', ' ', 'g')), '') as source_exact,
      private.normalize_guest_username(p_source_text) as source_username,
      private.normalize_private_personal_name(p_source_text, null) as source_personal,
      private.normalize_guest_username(p_guest_username) as entered_username,
      private.normalize_private_personal_name(p_guest_first_name, p_guest_last_name) as entered_personal,
      nullif(btrim(regexp_replace(coalesce(p_guest_first_name, ''), '[[:space:]]+', ' ', 'g')), '') as entered_first,
      nullif(btrim(regexp_replace(coalesce(p_guest_last_name, ''), '[[:space:]]+', ' ', 'g')), '') as entered_last,
      nullif(btrim(regexp_replace(concat_ws(' ', p_guest_first_name, p_guest_last_name), '[[:space:]]+', ' ', 'g')), '') as entered_full
  )
  select exists (
    select 1
    from public.players p
    cross join values_to_match v
    left join public.user_profiles up on up.user_id = p.linked_user_id
    left join private.player_private_identities ppi on ppi.player_id = p.id
    where p.id = p_player_id
      and p.group_id = p_group_id
      and v.source_exact is not null
      and (
        (
          p_identity_mode = 'username'
          and v.entered_username <> ''
          and v.source_username = v.entered_username
          and (
            private.normalize_guest_username(up.username) = v.entered_username
            or (p.linked_user_id is null and ppi.normalized_guest_username = v.entered_username)
            or (p.linked_user_id is null and exists (
              select 1 from public.player_import_aliases pia
              where pia.player_id = p.id and pia.group_id = p_group_id
                and pia.identity_mode = 'username'
                and pia.normalized_alias = v.entered_username
            ))
          )
        )
        or (
          p_identity_mode = 'personal_name'
          and v.entered_first is not null and v.entered_last is not null
          and v.source_exact in (v.entered_first, v.entered_last, v.entered_full)
          and (
            private.normalize_private_personal_name(up.full_name, null) = v.entered_personal
            or (p.linked_user_id is null and ppi.normalized_personal_name = v.entered_personal)
            or (p.linked_user_id is null and exists (
              select 1 from public.player_import_aliases pia
              where pia.player_id = p.id and pia.group_id = p_group_id
                and pia.identity_mode = 'personal_name'
                and pia.normalized_alias = v.entered_personal
            ))
          )
        )
        or (
          p_identity_mode = 'existing_player'
          and (
            private.normalize_guest_username(up.username) = v.source_username
            or private.normalize_private_personal_name(up.full_name, null) = v.source_personal
            or (p.linked_user_id is null and (
              ppi.normalized_guest_username = v.source_username
              or ppi.normalized_personal_name = v.source_personal
              or exists (
                select 1 from public.player_import_aliases pia
                where pia.player_id = p.id and pia.group_id = p_group_id
                  and pia.normalized_alias in (v.source_username, v.source_personal)
              )
            ))
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- BEFORE probes. Measured against the pinned pre-image above.
-- ---------------------------------------------------------------------------

create temporary table before_probe_results (
  probe text primary key,
  outcome text,
  resolved_player uuid
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
    raise exception 'BEFORE FAIL: could not stage the source evidence';
  end if;
  perform set_config('tm.before_stage_id', stage_id::text, false);

  -- 1. The linked-player alias seat, resolved automatically.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into before_probe_results values ('1_linked_alias_auto', r.outcome, r.player_id);

  -- 2. The same seat with the correct player selected explicitly.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'existing_player', null, null, null,
    '0ac1e005-0ac1-4005-8005-000000000005', false
  );
  reset role;
  insert into before_probe_results values ('2_linked_alias_explicit', r.outcome, r.player_id);

  -- 3. The path the review UI still leaves open once 1 and 2 fail.
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
  insert into before_probe_results values ('3_create_new_mints', r.outcome, r.player_id);
  if r.outcome = 'resolved' and r.player_id is distinct from
     '0ac1e005-0ac1-4005-8005-000000000005'::uuid
     and after_players = before_players + 1 then
    -- The duplicate is the defect. Remove it so the AFTER half starts from the
    -- same fixtures rather than from a group this probe has already polluted.
    delete from public.player_import_aliases where player_id = r.player_id;
    delete from private.player_private_identities where player_id = r.player_id;
    delete from public.players where id = r.player_id;
  else
    raise exception
      'BEFORE FAIL: expected a duplicate player to be minted, got outcome=% player=% players %->%',
      r.outcome, r.player_id, before_players, after_players;
  end if;

  -- 4. Username mode against the multi-token alias (space-normalized).
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'username', 'Linked Aliasowner', null, null, null, false
  );
  reset role;
  insert into before_probe_results values ('4_username_mode_alias', r.outcome, r.player_id);

  -- 5-7. Legacy identity evidence the matcher does not read at all.
  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 2,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into before_probe_results values ('5_players_full_name', r.outcome, r.player_id);

  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 3,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into before_probe_results values ('6_players_username', r.outcome, r.player_id);

  set local role service_role;
  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 4,
    'existing_player', null, null, null, null, false
  );
  reset role;
  insert into before_probe_results values ('7_legacy_identities_row', r.outcome, r.player_id);
end $$;

-- Every one of these must be a failure outcome for the AFTER half to have
-- anything to prove. If any of them already resolves, the regression this file
-- pins is not the regression being fixed and the pairing must be re-derived.
-- Probe 2 is `unavailable` rather than `unresolved` because an explicitly
-- selected player that the matcher rejects takes the selection branch: that is
-- the dead end an operator hits after choosing the right player by hand.
do $$
declare
  expected_probe text;
  expected_outcome text;
  actual_outcome text;
begin
  for expected_probe, expected_outcome in
    select * from (values
      ('1_linked_alias_auto', 'unresolved'),
      ('2_linked_alias_explicit', 'unavailable'),
      ('4_username_mode_alias', 'unresolved'),
      ('5_players_full_name', 'unresolved'),
      ('6_players_username', 'unresolved'),
      ('7_legacy_identities_row', 'unresolved')
    ) as e(probe, outcome)
  loop
    select outcome into actual_outcome
    from before_probe_results where probe = expected_probe;
    if actual_outcome is distinct from expected_outcome then
      raise exception 'BEFORE FAIL: probe % returned %, expected %',
        expected_probe, coalesce(actual_outcome, '<no row>'), expected_outcome;
    end if;
  end loop;

  if exists (
    select 1 from before_probe_results
    where probe <> '3_create_new_mints' and resolved_player is not null
  ) then
    raise exception 'BEFORE FAIL: a failed probe still returned a player id';
  end if;
end $$;

select probe, outcome from before_probe_results order by probe;
select 'SOURCE_BOUND_LINKED_ALIAS_BEFORE_PINNED' as result;
