-- AFTER proof for blocker ID-READER-CLIENT, once gated migration
-- 20260722160000 has been applied (twice, for repeat-safety).
--
-- Proves, in order:
--   1. GRANT MODEL      — service_role only; authenticated/anon (and therefore
--                         PUBLIC, since neither holds a direct grant) cannot
--                         execute it.
--   2. ADDITIVE         — the deployed 7-argument resolver is still present and
--                         was NOT dropped. Dropping it is the CONTRACT phase.
--   3. AUTHORIZATION    — a non-member requesting id is REJECTED (42501) and
--                         writes nothing; a null requesting id is rejected too.
--   4. SUCCESS          — a group member creates a guest, with a neutral label.
--   5. NO IMPORT ALIAS  — creation writes NO public.player_import_aliases row.
--   6. ATTRIBUTION      — created_by_user_id equals the passed requesting id.
--   7. REUSE BRANCH     — the second call reuses the same player id and still
--                         writes no import alias.
--
-- Sentinel names only. No real personal name, alias, or identifying value is
-- used or printed anywhere in this file.

-- 1. Grant model. anon/authenticated hold no direct grant, so their inability
--    to execute also proves the `revoke ... from public` removed CREATE
--    FUNCTION's implicit PUBLIC grant.
do $$
declare
  fn oid := 'public.create_or_reuse_guest_identity(uuid,uuid,text,text,text,text,uuid,boolean)'::regprocedure;
  result_columns text;
begin
  if has_function_privilege('authenticated', fn, 'execute') then
    raise exception 'ID-READER AFTER FAIL: authenticated can execute the replacement';
  end if;
  if has_function_privilege('anon', fn, 'execute') then
    raise exception 'ID-READER AFTER FAIL: anon can execute the replacement';
  end if;
  if not has_function_privilege('service_role', fn, 'execute') then
    raise exception 'ID-READER AFTER FAIL: service_role cannot execute the replacement';
  end if;

  select pg_get_function_result(fn) into result_columns;
  if result_columns <> 'TABLE(player_id uuid, public_name text, resolution_state text, normalized_imported_value text)' then
    raise exception 'ID-READER AFTER FAIL: unexpected return shape %', result_columns;
  end if;

  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_or_reuse_guest_identity'
      and p.prosecdef
  ) then
    raise exception 'ID-READER AFTER FAIL: the replacement is not SECURITY DEFINER';
  end if;
end $$;

-- 2. Additive: this migration must NOT drop the deployed 7-argument resolver.
do $$
begin
  if to_regprocedure(
    'public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)'
  ) is null then
    raise exception 'ID-READER AFTER FAIL: the deployed 7-argument resolver was dropped by the expand migration';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)'::regprocedure,
    'execute'
  ) then
    raise exception 'ID-READER AFTER FAIL: the expand migration re-granted authenticated on the old resolver';
  end if;
end $$;

-- 3a. AUTHORIZATION HELD: a non-member requesting id is rejected.
do $$
declare r record;
begin
  set local role service_role;
  select * into r from public.create_or_reuse_guest_identity(
    '22222222-2222-4222-8222-222222222222'::uuid,
    '99999999-9999-4999-8999-999999999999'::uuid,  -- real auth user, NOT a member
    'personal_name',
    null::text,
    'Outsider',
    'Fixture',
    null::uuid,
    true
  );
  reset role;
  raise exception 'ID-READER AUTHZ FAIL: a non-member created a guest identity';
exception
  when insufficient_privilege then
    null; -- 42501: the membership gate held
end $$;

-- 3b. The rejected call wrote nothing at all.
do $$
begin
  if exists (
    select 1 from private.player_private_identities
    where created_by_user_id = '99999999-9999-4999-8999-999999999999'::uuid
  ) then
    raise exception 'ID-READER AUTHZ FAIL: the rejected non-member call still wrote a private identity';
  end if;
end $$;

-- 3c. A null requesting id is rejected — it is never treated as trusted.
do $$
declare r record;
begin
  set local role service_role;
  select * into r from public.create_or_reuse_guest_identity(
    '22222222-2222-4222-8222-222222222222'::uuid,
    null::uuid,
    'personal_name',
    null::text,
    'Nullcaller',
    'Fixture',
    null::uuid,
    true
  );
  reset role;
  raise exception 'ID-READER AUTHZ FAIL: a null requesting id was accepted';
exception
  when insufficient_privilege then
    null; -- 42501
end $$;

-- 4-6. SUCCESS for a member, neutral label, NO import alias, correct attribution.
do $$
declare
  r record;
  v_alias_count integer;
  v_created_by uuid;
  v_first_player uuid;
  r2 record;
begin
  set local role service_role;
  select * into r from public.create_or_reuse_guest_identity(
    '22222222-2222-4222-8222-222222222222'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,  -- seeded group member
    'personal_name',
    null::text,
    'Nonimport',
    'Fixture',
    null::uuid,
    true
  );
  reset role;

  if r.player_id is null or r.resolution_state <> 'newly_created_unlinked_guest' then
    raise exception 'ID-READER AFTER FAIL: member creation did not succeed (state %)', r.resolution_state;
  end if;
  v_first_player := r.player_id;

  -- Neutral public label: the typed personal name is never a readable value.
  if r.public_name !~ '^Guest [A-F0-9]{8}$' then
    raise exception 'ID-READER AFTER FAIL: public label is not the neutral guest label';
  end if;

  -- 5. NO IMPORT ALIAS on the non-import path. This is the regression the whole
  --    design exists to prevent.
  select count(*) into v_alias_count
  from public.player_import_aliases where player_id = v_first_player;
  if v_alias_count <> 0 then
    raise exception 'ID-READER AFTER FAIL: % import alias row(s) written on the non-import path', v_alias_count;
  end if;

  -- 6. created_by_user_id is the passed requesting id, not null.
  select created_by_user_id into v_created_by
  from private.player_private_identities where player_id = v_first_player;
  if v_created_by is null then
    raise exception 'ID-READER AFTER FAIL: created_by_user_id is null';
  end if;
  if v_created_by <> '11111111-1111-4111-8111-111111111111'::uuid then
    raise exception 'ID-READER AFTER FAIL: created_by_user_id is not the requesting user';
  end if;

  -- 7. REUSE branch: same identity resolves to the same player, still no alias.
  set local role service_role;
  select * into r2 from public.create_or_reuse_guest_identity(
    '22222222-2222-4222-8222-222222222222'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'personal_name',
    null::text,
    'Nonimport',
    'Fixture',
    null::uuid,
    true
  );
  reset role;

  if r2.resolution_state <> 'existing_unlinked_guest' or r2.player_id <> v_first_player then
    raise exception 'ID-READER AFTER FAIL: reuse branch did not reuse the same player (state %)', r2.resolution_state;
  end if;

  select count(*) into v_alias_count
  from public.player_import_aliases where player_id = v_first_player;
  if v_alias_count <> 0 then
    raise exception 'ID-READER AFTER FAIL: reuse branch wrote % import alias row(s)', v_alias_count;
  end if;

  if r2.public_name !~ '^Guest [A-F0-9]{8}$' then
    raise exception 'ID-READER AFTER FAIL: reuse branch returned a non-neutral label';
  end if;
end $$;

-- The whole non-import path added zero import evidence, group-wide.
do $$
declare v_total integer;
begin
  select count(*) into v_total
  from public.player_import_aliases pia
  join private.player_private_identities ppi on ppi.player_id = pia.player_id
  where ppi.created_by_user_id = '11111111-1111-4111-8111-111111111111'::uuid
    and ppi.identity_mode = 'personal_name'
    and ppi.guest_first_name = 'Nonimport';
  if v_total <> 0 then
    raise exception 'ID-READER AFTER FAIL: non-import guest carries % import alias row(s)', v_total;
  end if;
end $$;

-- 8. CANDIDATE-PREDICATE COLLISION (regression proof for the audit's FINDING-1).
--
-- The state: ONE group holding an unlinked guest AND an already-claimed player
-- whose RETAINED private identity row carries the SAME normalized personal
-- name. This is reachable because normalized_personal_name is indexed
-- NON-uniquely (20260718050924:111-113) — unlike normalized_guest_username,
-- which is unique per group — and personal_name is the only mode either
-- non-import call site uses.
--
-- Before the fix the function asked "how many candidates?" and "which
-- candidate?" with two different predicates: the count excluded players with a
-- non-null linked_user_id, the auto-selection did not. Measured on a disposable
-- cluster in exactly this state, the count was 1 while the selection set was 2,
-- `limit 1` returned the CLAIMED player, and the revalidation then rejected it
-- with P0002 — so reuse of a legitimate guest failed outright.
--
-- Runs inside an explicit transaction and ROLLS BACK, so it leaves no residue
-- for assertions.sql or the fixture bridge that follow.
--
-- Sentinel names only.
begin;

-- The already-claimed player. linked_user_id is NOT NULL; it reuses the seeded
-- non-member auth user purely as a real FK target.
insert into public.players (id, group_id, linked_user_id, display_name)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '22222222-2222-4222-8222-222222222222',
  '99999999-9999-4999-8999-999999999999',
  'Registered Account'
);

-- The unlinked guest that MUST be the one reused.
insert into public.players (id, group_id, linked_user_id, display_name)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '22222222-2222-4222-8222-222222222222',
  null,
  'Guest DDDDDDDD'
);

insert into private.player_private_identities (
  player_id, group_id, identity_mode, guest_first_name, guest_last_name,
  normalized_personal_name, created_by_user_id
) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',
   '22222222-2222-4222-8222-222222222222', 'personal_name',
   'Zzcollide', 'Zzfixture',
   private.normalize_private_personal_name('Zzcollide', 'Zzfixture'),
   '11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   '22222222-2222-4222-8222-222222222222', 'personal_name',
   'Zzcollide', 'Zzfixture',
   private.normalize_private_personal_name('Zzcollide', 'Zzfixture'),
   '11111111-1111-4111-8111-111111111111');

-- 8a. The collision state really exists, so a pass below is not vacuous.
do $$
declare v_unlinked integer; v_claimed integer;
begin
  select
    count(*) filter (where p.linked_user_id is null),
    count(*) filter (where p.linked_user_id is not null)
  into v_unlinked, v_claimed
  from private.player_private_identities ppi
  join public.players p on p.id = ppi.player_id
  where ppi.group_id = '22222222-2222-4222-8222-222222222222'
    and ppi.normalized_personal_name =
        private.normalize_private_personal_name('Zzcollide', 'Zzfixture');
  if v_unlinked <> 1 or v_claimed <> 1 then
    raise exception
      'ID-READER COLLISION FAIL: fixture is not the collision state (unlinked %, claimed %)',
      v_unlinked, v_claimed;
  end if;
end $$;

-- 8b. THE PROOF. The single candidate is the unlinked guest, so the function
--     must reuse it. A claimed player must never be auto-selected, and the call
--     must not fail.
do $$
declare r record;
begin
  begin
    set local role service_role;
    select * into r from public.create_or_reuse_guest_identity(
      '22222222-2222-4222-8222-222222222222'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'personal_name',
      null::text,
      'Zzcollide',
      'Zzfixture',
      null::uuid,
      true
    );
    reset role;
  exception when others then
    -- P0002 specifically means a claimed same-name player was auto-selected and
    -- then rejected by the revalidation below — i.e. the counting and selection
    -- predicates have diverged again. Any other sqlstate is a different defect
    -- and is reported as itself rather than attributed to that divergence.
    raise exception
      'ID-READER COLLISION FAIL: the call errored with sqlstate % (%)%',
      SQLSTATE, SQLERRM,
      case when SQLSTATE = 'P0002'
        then ' -- this is the candidate-predicate divergence: the count and the auto-selection no longer agree.'
        else '' end;
  end;

  if r.player_id is distinct from 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid then
    raise exception
      'ID-READER COLLISION FAIL: auto-selection returned % instead of the unlinked guest', r.player_id;
  end if;
  if r.resolution_state <> 'existing_unlinked_guest' then
    raise exception
      'ID-READER COLLISION FAIL: state %, expected existing_unlinked_guest', r.resolution_state;
  end if;
  if r.public_name !~ '^Guest [A-F0-9]{8}$' then
    raise exception 'ID-READER COLLISION FAIL: reuse returned a non-neutral label';
  end if;
end $$;

-- 8c. No duplicate guest was created, and the claimed player was neither
--     relinked nor mutated.
do $$
declare v_unlinked integer; v_linked_user uuid;
begin
  select count(*) into v_unlinked
  from private.player_private_identities ppi
  join public.players p on p.id = ppi.player_id
  where ppi.group_id = '22222222-2222-4222-8222-222222222222'
    and p.linked_user_id is null
    and ppi.normalized_personal_name =
        private.normalize_private_personal_name('Zzcollide', 'Zzfixture');
  if v_unlinked <> 1 then
    raise exception
      'ID-READER COLLISION FAIL: % unlinked guests carry this name; reuse must not create a duplicate',
      v_unlinked;
  end if;

  select p.linked_user_id into v_linked_user
  from public.players p where p.id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  if v_linked_user is distinct from '99999999-9999-4999-8999-999999999999'::uuid then
    raise exception 'ID-READER COLLISION FAIL: the claimed player was relinked or unlinked';
  end if;
end $$;

-- 8d. Still no import evidence on this non-import path.
--
-- REDUNDANCY GUARD, not an independent proof. Mutation probe P4 (a reuse branch
-- that writes a player_import_aliases row) is caught by section 7's alias
-- assertion above, which runs first on the same code path, so this clause was
-- never reached. It is kept because the collision fixture is the one case where
-- a candidate is auto-selected out of a set containing a CLAIMED player, and a
-- future change could plausibly special-case that path; it must not be mistaken
-- for the load-bearing no-import-evidence check, which is section 7's.
do $$
declare v_aliases integer;
begin
  select count(*) into v_aliases
  from public.player_import_aliases
  where player_id in (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  );
  if v_aliases <> 0 then
    raise exception 'ID-READER COLLISION FAIL: % import alias row(s) written', v_aliases;
  end if;
end $$;

rollback;

-- 9. SIGNATURE SHAPE (regression proof for the audit's FINDING-2).
--
-- p_requesting_user_id is REQUIRED, matching the four applied gateways of
-- 20260722012658. Omitting it must be unresolvable at call time — a signature
-- error (42883, surfaced by PostgREST as PGRST202) — rather than a call that
-- resolves and then fails authorization inside the body at runtime.
--
-- EXECUTE forces resolution at run time rather than at DO-block compile time.
do $$
begin
  execute $q$
    select * from public.create_or_reuse_guest_identity(
      p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
      p_identity_mode => 'personal_name',
      p_guest_first_name => 'Zzomitted',
      p_guest_last_name => 'Zzfixture',
      p_create_new => true
    )
  $q$;
  raise exception
    'ID-READER SIGNATURE FAIL: a call omitting p_requesting_user_id resolved; the argument is not required';
exception
  when undefined_function then
    null; -- 42883, as intended
end $$;

-- 9b. The required-argument form still resolves, so 9 is not passing because
--     the function is simply missing.
do $$
begin
  if to_regprocedure(
    'public.create_or_reuse_guest_identity(uuid,uuid,text,text,text,text,uuid,boolean)'
  ) is null then
    raise exception 'ID-READER SIGNATURE FAIL: the required-argument signature does not exist';
  end if;
  if to_regprocedure(
    'public.create_or_reuse_guest_identity(uuid,text,text,text,text,uuid,boolean,uuid)'
  ) is not null then
    raise exception
      'ID-READER SIGNATURE FAIL: the superseded trailing-defaulted signature is present; named calls would be ambiguous (42725)';
  end if;
end $$;

-- 10. MULTIPLE-CANDIDATE REJECTION.
--
-- The function auto-selects a candidate only when there is EXACTLY ONE. With
-- two or more eligible candidates and no explicit selection it must raise P0003
-- and write nothing.
--
-- WHY THIS EXISTS. Nothing else in this harness reached that branch. Section 8
-- also builds a two-row same-name collision, but only ONE of its rows is an
-- eligible candidate — the other is claimed, and claimed players are excluded
-- from the candidate set — so section 8 exercises the exactly-one path.
-- Relaxing the auto-selection threshold from `= 1` to `>= 1` therefore left the
-- entire harness at exit 0: the multiple-match rejection was asserted nowhere,
-- and a regression that silently auto-selected the lowest-ordered of several
-- same-name guests would have passed clean.
--
-- Runs inside an explicit transaction and ROLLS BACK, so it leaves no residue
-- for assertions.sql or the fixture bridge that follow.
--
-- Sentinel names only.
begin;

-- Two UNLINKED players carrying the same normalized personal name. Reachable
-- for the same reason section 8's fixture is: the personal-name index is
-- NON-unique per group (20260718050924:111-113).
insert into public.players (id, group_id, linked_user_id, display_name)
values
  ('e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
   '22222222-2222-4222-8222-222222222222', null, 'Guest E1E1E1E1'),
  ('e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2',
   '22222222-2222-4222-8222-222222222222', null, 'Guest E2E2E2E2');

insert into private.player_private_identities (
  player_id, group_id, identity_mode, guest_first_name, guest_last_name,
  normalized_personal_name, created_by_user_id
) values
  ('e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
   '22222222-2222-4222-8222-222222222222', 'personal_name',
   'Zzmulti', 'Zzfixture',
   private.normalize_private_personal_name('Zzmulti', 'Zzfixture'),
   '11111111-1111-4111-8111-111111111111'),
  ('e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2',
   '22222222-2222-4222-8222-222222222222', 'personal_name',
   'Zzmulti', 'Zzfixture',
   private.normalize_private_personal_name('Zzmulti', 'Zzfixture'),
   '11111111-1111-4111-8111-111111111111');

-- 10a. The fixture really is a multi-candidate state — BOTH rows unlinked, so
--      both are eligible. Without this, a pass below could come from the
--      candidate set having collapsed to one for some unrelated reason.
do $$
declare v_unlinked integer; v_claimed integer;
begin
  select
    count(*) filter (where p.linked_user_id is null),
    count(*) filter (where p.linked_user_id is not null)
  into v_unlinked, v_claimed
  from private.player_private_identities ppi
  join public.players p on p.id = ppi.player_id
  where ppi.group_id = '22222222-2222-4222-8222-222222222222'
    and ppi.normalized_personal_name =
        private.normalize_private_personal_name('Zzmulti', 'Zzfixture');
  if v_unlinked <> 2 or v_claimed <> 0 then
    raise exception
      'ID-READER MULTI FAIL: fixture is not the multi-candidate state (unlinked %, claimed %)',
      v_unlinked, v_claimed;
  end if;
end $$;

-- 10b. THE PROOF. No explicit selection, two eligible candidates: the call must
--      be REJECTED with P0003, and must create no player row.
--
--      p_create_new is true on purpose, so a pass cannot come from the
--      confirm-creation guard (22023) firing first and masking the branch.
do $$
declare
  r record;
  v_outcome text;
  v_players_before integer;
  v_players_after integer;
begin
  select count(*) into v_players_before
  from public.players
  where group_id = '22222222-2222-4222-8222-222222222222';

  begin
    set local role service_role;
    select * into r from public.create_or_reuse_guest_identity(
      '22222222-2222-4222-8222-222222222222'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'personal_name',
      null::text,
      'Zzmulti',
      'Zzfixture',
      null::uuid,
      true
    );
    reset role;
    v_outcome := format('resolved to %s with state %s',
                        r.player_id, r.resolution_state);
  exception
    when sqlstate 'P0003' then
      v_outcome := 'rejected';
    when others then
      -- Any other sqlstate is a different defect and is reported as itself
      -- rather than counted as the rejection this section asserts.
      v_outcome := format('raised sqlstate %s (%s)', SQLSTATE, SQLERRM);
  end;

  if v_outcome <> 'rejected' then
    raise exception
      'ID-READER MULTI FAIL: two eligible candidates and no explicit selection must raise P0003; instead the call %',
      v_outcome;
  end if;

  select count(*) into v_players_after
  from public.players
  where group_id = '22222222-2222-4222-8222-222222222222';
  if v_players_after <> v_players_before then
    raise exception
      'ID-READER MULTI FAIL: the rejected call created % player row(s)',
      v_players_after - v_players_before;
  end if;
end $$;

-- 10c. The rejected call added no identity row and no import evidence either.
do $$
declare v_identities integer; v_aliases integer;
begin
  select count(*) into v_identities
  from private.player_private_identities ppi
  join public.players p on p.id = ppi.player_id
  where ppi.group_id = '22222222-2222-4222-8222-222222222222'
    and p.linked_user_id is null
    and ppi.normalized_personal_name =
        private.normalize_private_personal_name('Zzmulti', 'Zzfixture');
  if v_identities <> 2 then
    raise exception
      'ID-READER MULTI FAIL: % unlinked identities carry this name after the rejected call (expected the 2 fixtures)',
      v_identities;
  end if;

  select count(*) into v_aliases
  from public.player_import_aliases
  where player_id in (
    'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
    'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2'
  );
  if v_aliases <> 0 then
    raise exception 'ID-READER MULTI FAIL: % import alias row(s) written', v_aliases;
  end if;
end $$;

rollback;

-- 11. AN EXPLICITLY SELECTED CLAIMED PLAYER IS REFUSED.
--
-- The selected-player revalidation requires `p.linked_user_id is null`. That one
-- clause is the sole barrier stopping an explicitly supplied CLAIMED player id
-- from being returned by this function and labelled `existing_unlinked_guest` —
-- a registered account handed back as a reusable guest. Removing it left the
-- whole harness at exit 0.
--
-- LATENT TODAY, DELIBERATELY ASSERTED ANYWAY. Neither non-import call site
-- passes an explicit selection: `/group/players` and the Log-a-Game manual-entry
-- resolver both send p_selected_player_id => null, so today this branch is only
-- reachable by a direct service-role call. It is asserted because the natural
-- fix for the terminal multiple-match state that section 10 covers is a
-- disambiguation UI, and such a UI would pass an explicit selection — turning
-- this dormant path into a live one. The assertion must already be in place
-- when that happens.
--
-- Rolls back, like section 8 and section 10. Sentinel names only.
begin;

-- A CLAIMED player whose private identity row was retained through the claim.
-- It reuses the seeded non-member auth user purely as a real FK target.
insert into public.players (id, group_id, linked_user_id, display_name)
values (
  'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1',
  '22222222-2222-4222-8222-222222222222',
  '99999999-9999-4999-8999-999999999999',
  'Registered Account F1'
);

insert into private.player_private_identities (
  player_id, group_id, identity_mode, guest_first_name, guest_last_name,
  normalized_personal_name, created_by_user_id
) values (
  'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1',
  '22222222-2222-4222-8222-222222222222', 'personal_name',
  'Zzclaimed', 'Zzfixture',
  private.normalize_private_personal_name('Zzclaimed', 'Zzfixture'),
  '11111111-1111-4111-8111-111111111111'
);

-- 11a. Every revalidation conjunct EXCEPT the unlinked-only clause is satisfied:
--      the player exists, is in the queried group, and its retained identity row
--      carries exactly the queried normalized name. So the refusal below can
--      only come from that clause — the assertion is not passing because the
--      fixture failed some other test.
do $$
declare v_ok boolean;
begin
  select exists (
    select 1
    from public.players p
    join private.player_private_identities ppi on ppi.player_id = p.id
    where p.id = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1'
      and p.group_id = '22222222-2222-4222-8222-222222222222'
      and p.linked_user_id is not null
      and ppi.normalized_personal_name =
          private.normalize_private_personal_name('Zzclaimed', 'Zzfixture')
  ) into v_ok;
  if not v_ok then
    raise exception
      'ID-READER CLAIMED-SELECT FAIL: fixture is not a claimed player with a matching retained identity row';
  end if;
end $$;

-- 11b. THE PROOF. Explicitly selecting that claimed player must be REFUSED with
--      P0002, and must write nothing.
do $$
declare
  r record;
  v_outcome text;
  v_players_before integer;
  v_players_after integer;
  v_identities_before integer;
  v_identities_after integer;
begin
  select count(*) into v_players_before
  from public.players
  where group_id = '22222222-2222-4222-8222-222222222222';
  select count(*) into v_identities_before
  from private.player_private_identities
  where group_id = '22222222-2222-4222-8222-222222222222';

  begin
    set local role service_role;
    select * into r from public.create_or_reuse_guest_identity(
      '22222222-2222-4222-8222-222222222222'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      'personal_name',
      null::text,
      'Zzclaimed',
      'Zzfixture',
      'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1'::uuid,  -- the claimed player
      true
    );
    reset role;
    v_outcome := format('returned %s with state %s',
                        r.player_id, r.resolution_state);
  exception
    when sqlstate 'P0002' then
      v_outcome := 'refused';
    when others then
      v_outcome := format('raised sqlstate %s (%s)', SQLSTATE, SQLERRM);
  end;

  if v_outcome <> 'refused' then
    raise exception
      'ID-READER CLAIMED-SELECT FAIL: an explicitly selected CLAIMED player must be refused with P0002; instead the call % — a registered account was handed back as a reusable guest',
      v_outcome;
  end if;

  select count(*) into v_players_after
  from public.players
  where group_id = '22222222-2222-4222-8222-222222222222';
  select count(*) into v_identities_after
  from private.player_private_identities
  where group_id = '22222222-2222-4222-8222-222222222222';

  if v_players_after <> v_players_before then
    raise exception
      'ID-READER CLAIMED-SELECT FAIL: the refused call created % player row(s)',
      v_players_after - v_players_before;
  end if;
  if v_identities_after <> v_identities_before then
    raise exception
      'ID-READER CLAIMED-SELECT FAIL: the refused call wrote % private identity row(s)',
      v_identities_after - v_identities_before;
  end if;
end $$;

-- 11c. The claimed player itself was neither relinked nor stripped, and no
--      import evidence was invented for it.
do $$
declare v_linked_user uuid; v_aliases integer;
begin
  select p.linked_user_id into v_linked_user
  from public.players p
  where p.id = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';
  if v_linked_user is distinct from '99999999-9999-4999-8999-999999999999'::uuid then
    raise exception
      'ID-READER CLAIMED-SELECT FAIL: the claimed player was relinked or unlinked';
  end if;

  select count(*) into v_aliases
  from public.player_import_aliases
  where player_id = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';
  if v_aliases <> 0 then
    raise exception
      'ID-READER CLAIMED-SELECT FAIL: % import alias row(s) written', v_aliases;
  end if;
end $$;

rollback;

select 'ID_READER_CLIENT_AFTER_PROVEN' as result;
