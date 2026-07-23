-- AFTER half of the service-role matcher overload proof
-- (20260723130000_add_service_role_import_name_matcher_overload.sql).
--
-- Runs after that migration has been applied twice (repeat-safety), against the
-- fixtures matcher-service-role-overload-before.sql installed and the
-- two-argument identity it pinned.
--
-- EVERY assertion below is written to FAIL if the property it names is removed.
-- Each one records, in its own header, the mutation of the migration that must
-- break it. An assertion that passes with and without the property is
-- worthless, so the ones that could pass vacuously — the equivalence check and
-- the match check — assert a NON-ZERO row count explicitly rather than the
-- absence of an error.
--
-- Identifiers are written as literals, not psql `\set` variables: psql does not
-- interpolate into dollar-quoted bodies, so a variable inside a DO block is a
-- syntax error rather than a substitution.
--
-- SENTINELS ONLY. No personal name, real username, alias text, or other
-- identifying value appears in this file or in anything it prints.
--
--   group A   22222222-2222-4222-8222-222222222222  (seed.sql)
--   member A  11111111-1111-4111-8111-111111111111  (seed.sql, member of A)
--   outsider  99999999-9999-4999-8999-999999999999  (seed.sql, member of nothing)
--   group B   2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b  (BEFORE half)
--   member B  b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0  (BEFORE half, member of B only)

-- ===========================================================================
-- Overload inventory — the expand added EXACTLY ONE object and the two-argument
-- signature still exists as its own resolvable function.
--
-- BREAKS IF: the migration is written as a rename, a drop-and-recreate, or a
--            replacement of the two-argument signature instead of an overload.
-- ===========================================================================
do $$
declare
  v_overloads integer;
  v_before integer;
begin
  select pg_catalog.count(*) into v_overloads
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'match_import_player_names';

  select overload_count into v_before from harness.matcher_two_arg_snapshot;

  if v_overloads <> v_before + 1 then
    raise exception
      'FAIL overload-inventory: expected % overloads after the expand, found %',
      v_before + 1, v_overloads;
  end if;
  if to_regprocedure('public.match_import_player_names(uuid,text[])') is null then
    raise exception 'FAIL overload-inventory: the two-argument signature no longer exists';
  end if;
  if to_regprocedure('public.match_import_player_names(uuid,uuid,text[])') is null then
    raise exception 'FAIL overload-inventory: the three-argument overload was not created';
  end if;
  raise notice 'PASS overload-inventory: % -> % overloads, both signatures resolvable',
    v_before, v_overloads;
end $$;

-- ===========================================================================
-- 3f — the two-argument function is UNTOUCHED: same object, same body, same
--      ACL, same comment, same security/volatility/settings.
--
-- BREAKS IF: the migration `create or replace`s the two-argument body, revokes
--            or grants anything on (uuid, text[]), or re-comments it.
-- ===========================================================================
do $$
declare
  s harness.matcher_two_arg_snapshot%rowtype;
  n record;
begin
  select * into s from harness.matcher_two_arg_snapshot;

  select
    p.oid                                 as fn_oid,
    pg_catalog.md5(p.prosrc)              as body_md5,
    coalesce(p.proacl::text, '<default>') as acl,
    p.prosecdef                           as security_definer,
    p.provolatile                         as volatility,
    coalesce(p.proconfig::text, '<none>') as settings,
    p.prorettype                          as return_type,
    coalesce(pg_catalog.obj_description(p.oid, 'pg_proc'), '<none>') as fn_comment
  into n
  from pg_catalog.pg_proc p
  where p.oid = 'public.match_import_player_names(uuid,text[])'::regprocedure;

  if n.fn_oid <> s.fn_oid then
    raise exception 'FAIL 3f: the two-argument function is a DIFFERENT object (oid % -> %)',
      s.fn_oid, n.fn_oid;
  end if;
  if n.body_md5 <> s.body_md5 then
    raise exception 'FAIL 3f: the two-argument body changed (md5 % -> %)',
      s.body_md5, n.body_md5;
  end if;
  if n.acl <> s.acl then
    raise exception 'FAIL 3f: the two-argument ACL changed (% -> %)', s.acl, n.acl;
  end if;
  if n.fn_comment <> s.fn_comment then
    raise exception 'FAIL 3f: the two-argument comment changed';
  end if;
  if n.security_definer <> s.security_definer
     or n.volatility <> s.volatility
     or n.settings <> s.settings
     or n.return_type <> s.return_type then
    raise exception 'FAIL 3f: a two-argument function attribute changed';
  end if;

  -- The ACL must still carry `authenticated`: the expand may not pre-empt the
  -- separately-gated contraction 20260722012707.
  if not pg_catalog.has_function_privilege(
       'authenticated',
       'public.match_import_player_names(uuid,text[])'::regprocedure,
       'execute') then
    raise exception 'FAIL 3f: the expand removed authenticated EXECUTE on the two-argument function — that is the gated contraction''s job';
  end if;

  raise notice 'PASS 3f: two-argument function byte-identical, ACL % preserved', s.acl;
end $$;

-- ===========================================================================
-- Grants on the NEW signature: service_role ONLY, and no surviving PUBLIC grant.
--
-- BREAKS IF: the `revoke ... from public` is dropped (CREATE FUNCTION grants
--            EXECUTE to PUBLIC by default), or `authenticated`/`anon` is granted.
-- ===========================================================================
do $$
declare
  v_acl text;
begin
  select coalesce(p.proacl::text, '<default>') into v_acl
  from pg_catalog.pg_proc p
  where p.oid = 'public.match_import_player_names(uuid,uuid,text[])'::regprocedure;

  if v_acl = '<default>' then
    raise exception 'FAIL grants: the new overload carries the default ACL, so the PUBLIC grant survives';
  end if;
  if not pg_catalog.has_function_privilege(
       'service_role',
       'public.match_import_player_names(uuid,uuid,text[])'::regprocedure, 'execute') then
    raise exception 'FAIL grants: service_role cannot execute the new overload';
  end if;
  if pg_catalog.has_function_privilege(
       'authenticated',
       'public.match_import_player_names(uuid,uuid,text[])'::regprocedure, 'execute') then
    raise exception 'FAIL grants: authenticated can execute the new overload';
  end if;
  if pg_catalog.has_function_privilege(
       'anon',
       'public.match_import_player_names(uuid,uuid,text[])'::regprocedure, 'execute') then
    raise exception 'FAIL grants: anon can execute the new overload';
  end if;
  -- A surviving PUBLIC grant appears in an aclitem list as an entry with an
  -- EMPTY grantee, i.e. a leading '=' after '{' or after a comma.
  if v_acl ~ '(\{|,)=' then
    raise exception 'FAIL grants: a PUBLIC (empty grantee) entry survives in %', v_acl;
  end if;
  raise notice 'PASS grants: new overload ACL is %', v_acl;
end $$;

-- ===========================================================================
-- The new parameter carries NO DEFAULT.
--
-- BREAKS IF: `p_requesting_user_id uuid default null` is used. (In position two
--            that also fails at CREATE time with 42P13, so this assertion is the
--            second line of defence, not the only one.)
-- ===========================================================================
do $$
declare
  v_defaults integer;
  v_args text;
begin
  select p.pronargdefaults, pg_catalog.pg_get_function_arguments(p.oid)
  into v_defaults, v_args
  from pg_catalog.pg_proc p
  where p.oid = 'public.match_import_player_names(uuid,uuid,text[])'::regprocedure;

  if v_defaults <> 0 then
    raise exception
      'FAIL no-default: the new overload declares % defaulted parameter(s): %',
      v_defaults, v_args;
  end if;
  if v_args !~ 'p_requesting_user_id uuid' then
    raise exception 'FAIL no-default: unexpected argument list %', v_args;
  end if;
  raise notice 'PASS no-default: %', v_args;
end $$;

-- ===========================================================================
-- 3g — existing TWO-argument calls still resolve unambiguously with the new
--      overload present, positionally and by name (the PostgREST shape).
--
-- BREAKS IF: the new parameter is given a default (42725 on both call forms).
-- ===========================================================================
do $$
declare
  v_positional integer;
  v_named integer;
begin
  perform pg_catalog.set_config(
    'request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;

  select pg_catalog.count(*) into v_positional
  from public.match_import_player_names(
    '22222222-2222-4222-8222-222222222222'::uuid,
    array['Matchprobealpha Displayprobe']
  );

  select pg_catalog.count(*) into v_named
  from public.match_import_player_names(
    p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
    p_imported_names => array['Matchprobealpha Displayprobe']
  );

  if v_positional <> 1 or v_named <> 1 then
    raise exception 'FAIL 3g: two-argument calls returned % (positional) / % (named), expected 1 / 1',
      v_positional, v_named;
  end if;
  raise notice 'PASS 3g: positional and named two-argument calls both resolve and match';
end $$;

-- ===========================================================================
-- 3a — a member passing a TRUTHFUL id matches, and returns NON-ZERO rows, with
--      auth.uid() NULL (which is what service_role sees in production).
--
--      The row COUNT and the selected players are asserted, not the absence of
--      an error: the failure this catches is silent.
--
-- BREAKS IF: the candidate pool is left on auth.uid() (0 rows, no error), or the
--            gate is left on is_group_member (42501).
-- ===========================================================================
do $$
declare
  v_actual text[];
  v_expected text[] := array[
    'Matchprobealpha Displayprobe|5e401001-5e40-4001-8001-000000000001|exact|2',
    'Matchprobebravo Fullprobe|5e402002-5e40-4002-8002-000000000002|exact|2',
    'Matchprobecharlie Aliasprobe|5e403003-5e40-4003-8003-000000000003|exact|2',
    'Matchprobedelta|5e404004-5e40-4004-8004-000000000004|partial|1'
  ];
  v_rows integer;
begin
  -- Explicitly clear the claim so auth.uid() is NULL, exactly as it is for a
  -- service-role PostgREST call. Do not remove this: it is what makes the
  -- assertion able to detect an unconverted candidate pool.
  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  set local role service_role;

  if (select auth.uid()) is not null then
    raise exception 'FAIL 3a: the probe is not running with auth.uid() NULL, so it cannot detect an unconverted pool';
  end if;

  select pg_catalog.array_agg(
           m.imported_name || '|' || m.player_id::text || '|' ||
           m.match_reason || '|' || m.match_score::text
           order by m.imported_name)
  into v_actual
  from public.match_import_player_names(
    p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
    p_requesting_user_id => '11111111-1111-4111-8111-111111111111'::uuid,
    p_imported_names => array[
      'Matchprobealpha Displayprobe',
      'Matchprobebravo Fullprobe',
      'Matchprobecharlie Aliasprobe',
      'Matchprobedelta'
    ]
  ) m;

  v_rows := coalesce(pg_catalog.cardinality(v_actual), 0);

  if v_rows = 0 then
    raise exception 'FAIL 3a: a truthful member id matched ZERO rows — this is the silent failure mode';
  end if;
  if v_actual <> (select pg_catalog.array_agg(e order by e) from unnest(v_expected) e) then
    raise exception 'FAIL 3a: expected % got %', v_expected, v_actual;
  end if;

  -- The player that belongs only to the SECOND group must not leak in.
  if pg_catalog.array_to_string(v_actual, ' ')
     like '%5e405005-5e40-4005-8005-000000000005%' then
    raise exception 'FAIL 3a: a player from a group the requesting user does not belong to entered the pool';
  end if;

  raise notice 'PASS 3a: % matched rows, all coarse, all expected, with auth.uid() NULL', v_rows;
end $$;

-- ===========================================================================
-- 3b — a NULL requesting-user id is REJECTED WITH AN ERROR, not zero rows.
--
-- BREAKS IF: the explicit null guard is removed. Without it the naive shape
--            returns 0 rows and raises nothing.
-- ===========================================================================
do $$
declare
  v_state text;
  v_rows integer;
begin
  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  set local role service_role;

  begin
    select pg_catalog.count(*) into v_rows
    from public.match_import_player_names(
      p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
      p_requesting_user_id => null::uuid,
      p_imported_names => array['Matchprobealpha Displayprobe']
    );
    v_state := '00000';
  exception when others then
    v_state := sqlstate;
    v_rows := null;
  end;

  if v_state = '00000' then
    raise exception
      'FAIL 3b: a NULL requesting-user id completed without error and returned % row(s) — the silent failure mode is present',
      v_rows;
  end if;
  if v_state <> '22023' then
    raise exception 'FAIL 3b: expected SQLSTATE 22023 for a null requesting user, got %', v_state;
  end if;
  raise notice 'PASS 3b: NULL requesting-user id raised %', v_state;
end $$;

-- ===========================================================================
-- 3c — a non-member id is rejected.
--
-- BREAKS IF: the authorization gate is removed, or is derived from something
--            other than the requesting-user argument.
-- ===========================================================================
do $$
declare
  v_state text;
  v_rows integer;
begin
  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  set local role service_role;

  begin
    select pg_catalog.count(*) into v_rows
    from public.match_import_player_names(
      p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
      p_requesting_user_id => '99999999-9999-4999-8999-999999999999'::uuid,
      p_imported_names => array['Matchprobealpha Displayprobe']
    );
    v_state := '00000';
  exception when others then
    v_state := sqlstate;
    v_rows := null;
  end;

  if v_state <> '42501' then
    raise exception 'FAIL 3c: expected 42501 for a non-member id, got % (rows %)',
      v_state, coalesce(v_rows::text, 'n/a');
  end if;
  raise notice 'PASS 3c: non-member id raised %', v_state;
end $$;

-- ===========================================================================
-- 3d — a member of a DIFFERENT group is rejected for this group, and the same
--      user is ACCEPTED for their own group.
--
--      The second half is what stops this assertion passing vacuously: a
--      function that rejected everybody would satisfy the rejection alone.
--
-- BREAKS IF: the gate stops joining the requesting user to the target group.
-- ===========================================================================
do $$
declare
  v_state text;
  v_own_rows integer;
begin
  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  set local role service_role;

  begin
    perform 1
    from public.match_import_player_names(
      p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
      p_requesting_user_id => 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0'::uuid,
      p_imported_names => array['Matchprobealpha Displayprobe']
    );
    v_state := '00000';
  exception when others then
    v_state := sqlstate;
  end;

  if v_state <> '42501' then
    raise exception 'FAIL 3d: a member of a different group was not rejected (got %)', v_state;
  end if;

  select pg_catalog.count(*) into v_own_rows
  from public.match_import_player_names(
    p_group_id => '2b2b2b2b-2b2b-42b2-82b2-2b2b2b2b2b2b'::uuid,
    p_requesting_user_id => 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0'::uuid,
    p_imported_names => array['Matchprobeecho Otherprobe']
  );

  if v_own_rows <> 1 then
    raise exception
      'FAIL 3d: the same user matched % row(s) in their OWN group, expected 1 — the rejection above may be blanket rather than group-scoped',
      v_own_rows;
  end if;
  raise notice 'PASS 3d: rejected for the other group (%), matched % row in their own', v_state, v_own_rows;
end $$;

-- ===========================================================================
-- 3e — THE GATE AND THE CANDIDATE POOL AGREE.
--
--      This is the assertion that catches the SILENT variant: a correctly
--      converted gate over a pool still reading auth.uid(). That variant
--      authorizes, then matches nothing, and raises no error.
--
--      Three probes, all required:
--
--      (a)  the TWO-argument function AS INSTALLED IN THIS HARNESS, called as
--           `authenticated` with a real session — the reference selection.
--
--           CORRECTED 2026-07-23. This was previously described as "the
--           deployed TWO-argument function". It is NOT the deployed body.
--           `run.sh` deliberately never applies 20260720120000 (it is excluded
--           from the replay loop and explicitly not applied afterwards), so the
--           two-argument signature standing here is the modelled fine-grained
--           pre-image of production-only ledger 20260720021300 — it emits
--           `display_name_exact` and rank 400, where the deployed coarsened
--           body emits `exact` and 2.
--
--           WHAT THE REFERENCE DOES CARRY, so this probe is not weakened:
--           all seven ranking predicates and their rank values
--           (400/350/300/250/200/175/150) are identical in the two bodies, and
--           the coarsening only relabels output — it retains `internal_rank`
--           for ordering and never emits it. The set this probe compares,
--           (imported_name, player_id, is_linked), is therefore selected
--           identically by both, so PLAYER-SELECTION equivalence transfers to
--           the deployed body.
--
--           WHAT IT DOES NOT CARRY: the coarse disclosure labels and the
--           candidate-input bound. Neither is proven by this file; both remain
--           the recorded harness coverage gap.
--      (b)  EQUIVALENCE. The three-argument overload, called with auth.uid()
--           NULL and the same user passed explicitly, must select the SAME
--           (imported_name, player_id, is_linked) set — and that set must be
--           NON-EMPTY. Two empty sets are equal, so emptiness is failed first.
--           This doubles as the drift guard for the duplicated body.
--      (c)  POISONED auth.uid(). The overload is called while auth.uid() resolves
--           to a DIFFERENT user who belongs to no group, with the truthful id
--           still passed explicitly. A pool reading auth.uid() collapses to
--           empty; a gate reading auth.uid() raises 42501. The correct
--           implementation is unaffected, because neither predicate reads
--           auth.uid() at all.
--
-- BREAKS IF: either identity predicate is left on auth.uid(), or the duplicated
--            body drifts from the two-argument body's selection.
-- ===========================================================================
do $$
declare
  v_two text[];
  v_three text[];
  v_poisoned text[];
  v_probe text[] := array[
    'Matchprobealpha Displayprobe',
    'Matchprobebravo Fullprobe',
    'Matchprobecharlie Aliasprobe',
    'Matchprobedelta'
  ];
begin
  -- (a) the two-argument function as installed here — the fine-grained
  --     pre-image of ledger 20260720021300, NOT the coarsened deployed body;
  --     see the section header for what that reference does and does not
  --     carry. Called as a real signed-in caller.
  perform pg_catalog.set_config(
    'request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;

  select pg_catalog.array_agg(
           m.imported_name || '|' || m.player_id::text || '|' || m.is_linked::text
           order by m.imported_name)
  into v_two
  from public.match_import_player_names(
    '22222222-2222-4222-8222-222222222222'::uuid, v_probe) m;

  -- (b) the new overload, with auth.uid() NULL and the id passed explicitly
  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  set local role service_role;

  if (select auth.uid()) is not null then
    raise exception 'FAIL 3e: probe (b) is not running with auth.uid() NULL';
  end if;

  select pg_catalog.array_agg(
           m.imported_name || '|' || m.player_id::text || '|' || m.is_linked::text
           order by m.imported_name)
  into v_three
  from public.match_import_player_names(
    p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
    p_requesting_user_id => '11111111-1111-4111-8111-111111111111'::uuid,
    p_imported_names => v_probe
  ) m;

  -- "the two-argument reference" below is the two-argument SIGNATURE as
  -- installed here (the ledger-20260720021300 pre-image), not the deployed
  -- coarsened body. The assertion text is left byte-unchanged deliberately:
  -- correcting a description must not alter an executable line.
  if v_two is null or pg_catalog.cardinality(v_two) = 0 then
    raise exception 'FAIL 3e: the two-argument reference selected nothing, so equivalence would be vacuous';
  end if;
  if v_three is null or pg_catalog.cardinality(v_three) = 0 then
    raise exception 'FAIL 3e: the overload selected NOTHING while the two-argument function selected % — the candidate pool is not deriving from the requesting-user argument',
      pg_catalog.cardinality(v_two);
  end if;
  if v_two <> v_three then
    raise exception 'FAIL 3e: gate/pool disagreement or body drift. two-arg=% three-arg=%',
      v_two, v_three;
  end if;

  -- (c) poisoned auth.uid(): a different user, in no group at all
  perform pg_catalog.set_config(
    'request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);

  if (select auth.uid()) <> '99999999-9999-4999-8999-999999999999'::uuid then
    raise exception 'FAIL 3e: probe (c) failed to poison auth.uid(), so it cannot detect an unconverted predicate';
  end if;

  select pg_catalog.array_agg(
           m.imported_name || '|' || m.player_id::text || '|' || m.is_linked::text
           order by m.imported_name)
  into v_poisoned
  from public.match_import_player_names(
    p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
    p_requesting_user_id => '11111111-1111-4111-8111-111111111111'::uuid,
    p_imported_names => v_probe
  ) m;

  if v_poisoned is distinct from v_two then
    raise exception
      'FAIL 3e: with auth.uid() pointing at an unrelated user the overload returned % instead of % — an identity predicate still reads auth.uid()',
      v_poisoned, v_two;
  end if;

  raise notice 'PASS 3e: gate and pool agree; % identical selections across all three probes',
    pg_catalog.cardinality(v_two);
end $$;

select 'MATCHER_SERVICE_ROLE_OVERLOAD_PINNED' as result;
