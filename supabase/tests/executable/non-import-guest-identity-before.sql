-- BEFORE proof for blocker ID-READER-CLIENT.
--
-- Runs against PRODUCTION HISTORY ONLY — nothing gated has been applied above
-- this line. It measures the state production is in today: the deployed
-- 7-argument public.resolve_import_guest_identity, with `authenticated`
-- EXECUTE revoked (repo file 20260722153000, ledger 20260722153233).
--
-- It reproduces the failure three independent ways, which together are why the
-- repair is a new function and not a client swap:
--
--   (a) ACL      — `authenticated` no longer holds EXECUTE, so the user-session
--                  client is locked out.
--   (b) 42883    — the reader's actual 8-key payload (with p_record_import_alias)
--                  matches no deployed signature. PostgREST surfaces this as
--                  PGRST202. This is the FIRST error the reader hits.
--   (c) 42501    — and moving to the admin client does NOT help either.
--
-- ACL NOTE (a real repo-vs-record divergence, recorded rather than assumed).
-- The migration that created the deployed 7-argument function
-- (20260718212339, applied as ledger 20260719191911) grants EXECUTE to
-- `authenticated` ONLY — it never grants `service_role`
-- (20260718212339:290-298). So on a clean replay of repo history service_role
-- has NO EXECUTE here. The 20260722153000 header, by contrast, records the
-- observed PRODUCTION pre-state ACL as including `service_role=X/postgres`
-- [PRIOR, unverifiable from here — no production read is authorized].
--
-- The reader is broken under BOTH readings, which is why this file asserts the
-- outcome rather than the ACL:
--   * without the grant, service_role fails 42501 at the privilege check;
--   * with the grant, service_role enters the body and the auth.uid() gate
--     raises 42501 anyway, because auth.uid() is NULL off a JWT.
-- Step (d) isolates that second, body-level failure by calling as the owner,
-- which bypasses the privilege check entirely.
--
-- Sentinel names only. No real personal name, alias, or identifying value is
-- used or printed anywhere in this file.

-- (a) The revoke is in force: neither authenticated nor anon may execute.
do $$
declare
  fn oid := 'public.resolve_import_guest_identity(uuid,text,text,text,text,uuid,boolean)'::regprocedure;
begin
  if has_function_privilege('authenticated', fn, 'execute') then
    raise exception 'ID-READER BEFORE FAIL: authenticated still holds EXECUTE on the deployed resolver';
  end if;
  if has_function_privilege('anon', fn, 'execute') then
    raise exception 'ID-READER BEFORE FAIL: anon holds EXECUTE on the deployed resolver';
  end if;
end $$;

-- (b) The pre-change reader's exact payload resolves to no function (42883).
do $$
begin
  perform public.resolve_import_guest_identity(
    p_create_new => true,
    p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
    p_guest_first_name => 'Nonimport',
    p_guest_last_name => 'Fixture',
    p_guest_username => null::text,
    p_identity_mode => 'personal_name',
    p_record_import_alias => false,
    p_selected_player_id => null::uuid
  );
  raise exception 'ID-READER BEFORE FAIL: the 8-key reader payload unexpectedly resolved';
exception
  when undefined_function then
    null; -- 42883 as expected; PostgREST reports PGRST202
end $$;

-- (c) The admin-client swap alone does not repair it: a service_role call still
--     ends in 42501 (here at the privilege check; in production, per the
--     recorded ACL, from the body's auth.uid() gate).
do $$
begin
  set local role service_role;
  perform public.resolve_import_guest_identity(
    '22222222-2222-4222-8222-222222222222'::uuid,
    'personal_name',
    null::text,
    'Nonimport',
    'Fixture',
    null::uuid,
    true
  );
  reset role;
  raise exception 'ID-READER BEFORE FAIL: the service_role call unexpectedly succeeded';
exception
  when insufficient_privilege then
    null; -- 42501
end $$;

-- (d) Isolate the BODY-level failure, independent of the ACL: call as the owner
--     (superuser), which skips the privilege check entirely. The auth.uid()
--     gate still rejects with 42501 because there is no JWT claim. This is the
--     finding that makes a client-only swap impossible — and it is why the
--     replacement takes an explicit requesting-user id instead.
do $$
begin
  perform public.resolve_import_guest_identity(
    '22222222-2222-4222-8222-222222222222'::uuid,
    'personal_name',
    null::text,
    'Nonimport',
    'Fixture',
    null::uuid,
    true
  );
  raise exception 'ID-READER BEFORE FAIL: the auth.uid() gate admitted a caller with no JWT';
exception
  when insufficient_privilege then
    null; -- 42501 from the body: auth.uid() is NULL
end $$;

-- (e) And auth.uid() really is NULL for such a caller, so the gate's first
--     disjunct is what fired.
do $$
begin
  if (select auth.uid()) is not null then
    raise exception 'ID-READER BEFORE FAIL: auth.uid() is unexpectedly non-null without a JWT';
  end if;
end $$;

-- The replacement does not exist yet.
do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_or_reuse_guest_identity'
  ) then
    raise exception 'ID-READER BEFORE FAIL: the replacement exists before its gated migration';
  end if;
end $$;

select 'ID_READER_CLIENT_BEFORE_REPRODUCED' as result;
