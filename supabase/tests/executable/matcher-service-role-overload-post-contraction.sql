-- The service-role overload survives the gated contraction 20260722012707, and
-- so does the two-argument function as a service-role-callable object.
--
-- This is the executable form of a statement the project record must keep
-- making in words: the contraction RE-GATES the free-form matcher, it does not
-- CLOSE it. It revokes from public/anon/authenticated only, drops nothing, and
-- leaves service_role's EXECUTE in place — so free-form matching remains live
-- under service_role on the manual-entry paths that still have no designed
-- replacement. Any status line that says the matcher was "closed" or "retired"
-- is contradicted by this assertion.
--
-- The complementary half — that `authenticated` lost its grant, and that
-- service_role kept the TWO-argument one — is already asserted by
-- source-bound-import-identity-contraction.sql, which runs immediately above
-- this file. This file adds only what that one cannot know about: the overload.
--
-- It deliberately does NOT wire in match-oracle-post-contraction.sql; that
-- coverage gap is recorded elsewhere and is out of scope here.

do $$
begin
  if to_regprocedure('public.match_import_player_names(uuid,uuid,text[])') is null then
    raise exception 'RE-GATE FAIL: the contraction removed the service-role overload';
  end if;
  if not pg_catalog.has_function_privilege(
       'service_role',
       'public.match_import_player_names(uuid,uuid,text[])'::regprocedure,
       'execute') then
    raise exception 'RE-GATE FAIL: service_role lost EXECUTE on the overload';
  end if;
  if pg_catalog.has_function_privilege(
       'authenticated',
       'public.match_import_player_names(uuid,uuid,text[])'::regprocedure,
       'execute') then
    raise exception 'RE-GATE FAIL: authenticated gained EXECUTE on the overload';
  end if;
  if to_regprocedure('public.match_import_player_names(uuid,text[])') is null then
    raise exception 'RE-GATE FAIL: the contraction DROPPED the two-argument function — it is documented as an ACL change, not a removal';
  end if;
end $$;

-- The overload still matches after the contraction: the reader that moves to it
-- keeps working while `authenticated` is locked out.
do $$
declare
  v_rows integer;
begin
  perform pg_catalog.set_config('request.jwt.claim.sub', '', true);
  set local role service_role;

  select pg_catalog.count(*) into v_rows
  from public.match_import_player_names(
    p_group_id => '22222222-2222-4222-8222-222222222222'::uuid,
    p_requesting_user_id => '11111111-1111-4111-8111-111111111111'::uuid,
    p_imported_names => array['Matchprobealpha Displayprobe']
  );

  if v_rows <> 1 then
    raise exception 'RE-GATE FAIL: the overload matched % row(s) after the contraction, expected 1', v_rows;
  end if;
  reset role;
end $$;

select 'MATCHER_SERVICE_ROLE_OVERLOAD_RE_GATED_NOT_CLOSED' as result;
