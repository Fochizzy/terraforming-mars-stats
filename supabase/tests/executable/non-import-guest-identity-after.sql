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
  fn oid := 'public.create_or_reuse_guest_identity(uuid,text,text,text,text,uuid,boolean,uuid)'::regprocedure;
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
    'personal_name',
    null::text,
    'Outsider',
    'Fixture',
    null::uuid,
    true,
    '99999999-9999-4999-8999-999999999999'::uuid  -- real auth user, NOT a member
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
    'personal_name',
    null::text,
    'Nullcaller',
    'Fixture',
    null::uuid,
    true,
    null::uuid
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
    'personal_name',
    null::text,
    'Nonimport',
    'Fixture',
    null::uuid,
    true,
    '11111111-1111-4111-8111-111111111111'::uuid  -- seeded group member
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
    'personal_name',
    null::text,
    'Nonimport',
    'Fixture',
    null::uuid,
    true,
    '11111111-1111-4111-8111-111111111111'::uuid
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

select 'ID_READER_CLIENT_AFTER_PROVEN' as result;
