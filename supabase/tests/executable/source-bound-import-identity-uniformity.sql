-- Anti-oracle uniformity re-proof, run AFTER the matcher was widened to read
-- import aliases, players.full_name, players.username and the private legacy
-- identity table for linked and unlinked players alike. Widening what a matcher
-- reads is exactly the change that can reopen disclosure, so none of this is
-- assumed to have survived: every property is measured again here.
--
-- The four failure outcomes must differ in the outcome label and in NOTHING
-- else -- not row count, not column count, name, order or nullability, not
-- SQLSTATE, not error text, and not notice or warning output. run.sh runs this
-- file with client_min_messages = notice and fails if the session emits any
-- NOTICE or WARNING line, which is the half of the property SQL cannot assert
-- about itself.

-- run.sh greps this session's combined output for NOTICE/WARNING lines, so the
-- threshold is lowered here rather than left to the server default.
set client_min_messages = notice;

create temporary table uniformity_probe_results (
  probe text primary key,
  row_count integer,
  outcome text,
  player_id uuid,
  public_label text,
  column_keys text,
  sqlstate text,
  error_text text
);

-- ---------------------------------------------------------------------------
-- 1. The four failure modes.
-- ---------------------------------------------------------------------------

do $$
declare
  stage_id uuid;
  r record;
  n integer;
  keys text;
begin
  set local role service_role;
  select public.stage_import_player_identity_evidence(
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    array['Zzzznomatchatall', 'Linked', 'Freshnobody Uniquename'],
    'executable-parser-v1',
    'terraforming_mars_exported_log'
  ) into stage_id;
  reset role;
  perform set_config('tm.uniformity_stage_id', stage_id::text, false);

  -- unresolved: a seat nothing in the group carries.
  begin
    set local role service_role;
    select count(*) into n from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 1,
      'existing_player', null, null, null, null, false);
    select * into r from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 1,
      'existing_player', null, null, null, null, false);
    select string_agg(k, ',') into keys
    from json_object_keys(row_to_json(r)) as k;
    reset role;
    insert into uniformity_probe_results
    values ('unresolved', n, r.outcome, r.player_id, r.public_label, keys, '00000', null);
  exception when others then
    reset role;
    insert into uniformity_probe_results
    values ('unresolved', null, null, null, null, null, sqlstate, sqlerrm);
  end;

  -- ambiguous: a first-name-only seat, which never auto-links.
  begin
    set local role service_role;
    select count(*) into n from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 2,
      'personal_name', null, 'Linked', 'Aliasowner', null, true);
    select * into r from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 2,
      'personal_name', null, 'Linked', 'Aliasowner', null, true);
    select string_agg(k, ',') into keys
    from json_object_keys(row_to_json(r)) as k;
    reset role;
    insert into uniformity_probe_results
    values ('ambiguous', n, r.outcome, r.player_id, r.public_label, keys, '00000', null);
  exception when others then
    reset role;
    insert into uniformity_probe_results
    values ('ambiguous', null, null, null, null, null, sqlstate, sqlerrm);
  end;

  -- invalid_source_match: the entered identity is not the staged seat text.
  begin
    set local role service_role;
    select count(*) into n from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 1,
      'username', 'Different Value', null, null, null, true);
    select * into r from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 1,
      'username', 'Different Value', null, null, null, true);
    select string_agg(k, ',') into keys
    from json_object_keys(row_to_json(r)) as k;
    reset role;
    insert into uniformity_probe_results
    values ('invalid_source_match', n, r.outcome, r.player_id, r.public_label, keys, '00000', null);
  exception when others then
    reset role;
    insert into uniformity_probe_results
    values ('invalid_source_match', null, null, null, null, null, sqlstate, sqlerrm);
  end;

  -- unavailable: a staging row this caller may not read.
  begin
    set local role service_role;
    select count(*) into n from public.resolve_staged_import_player_identity(
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      '11111111-1111-4111-8111-111111111111', 1,
      'existing_player', null, null, null, null, false);
    select * into r from public.resolve_staged_import_player_identity(
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      '11111111-1111-4111-8111-111111111111', 1,
      'existing_player', null, null, null, null, false);
    select string_agg(k, ',') into keys
    from json_object_keys(row_to_json(r)) as k;
    reset role;
    insert into uniformity_probe_results
    values ('unavailable', n, r.outcome, r.player_id, r.public_label, keys, '00000', null);
  exception when others then
    reset role;
    insert into uniformity_probe_results
    values ('unavailable', null, null, null, null, null, sqlstate, sqlerrm);
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 2. An induced database failure collapses to the same uniform shape.
-- ---------------------------------------------------------------------------

create or replace function private.uniformity_force_player_insert_failure()
returns trigger language plpgsql as $$
begin
  raise exception 'induced failure inside the resolver';
end;
$$;

create trigger uniformity_force_failure
before insert on public.players
for each row execute function private.uniformity_force_player_insert_failure();

do $$
declare
  stage_id uuid := current_setting('tm.uniformity_stage_id')::uuid;
  r record;
  n integer;
  keys text;
begin
  begin
    set local role service_role;
    select count(*) into n from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 3,
      'personal_name', null, 'Freshnobody', 'Uniquename', null, true);
    select * into r from public.resolve_staged_import_player_identity(
      stage_id, '11111111-1111-4111-8111-111111111111', 3,
      'personal_name', null, 'Freshnobody', 'Uniquename', null, true);
    select string_agg(k, ',') into keys
    from json_object_keys(row_to_json(r)) as k;
    reset role;
    insert into uniformity_probe_results
    values ('induced_db_failure', n, r.outcome, r.player_id, r.public_label, keys, '00000', null);
  exception when others then
    reset role;
    insert into uniformity_probe_results
    values ('induced_db_failure', null, null, null, null, null, sqlstate, sqlerrm);
  end;
end $$;

drop trigger uniformity_force_failure on public.players;
drop function private.uniformity_force_player_insert_failure();

-- ---------------------------------------------------------------------------
-- 3. Assertions.
-- ---------------------------------------------------------------------------

do $$
declare
  bad text;
  distinct_shapes integer;
begin
  -- The induced failure must have been caught and reported as `unavailable`,
  -- not propagated to the caller.
  select outcome into bad from uniformity_probe_results where probe = 'induced_db_failure';
  if bad is distinct from 'unavailable' then
    raise exception 'UNIFORMITY FAIL: an induced database failure surfaced as %',
      coalesce(bad, '<exception escaped>');
  end if;

  -- Each probe reached the caller as exactly one row.
  select string_agg(probe || '=' || coalesce(row_count::text, '<exception>'), ', ' order by probe)
  into bad from uniformity_probe_results where row_count is distinct from 1;
  if bad is not null then
    raise exception 'UNIFORMITY FAIL: a failure mode did not return exactly one row: %', bad;
  end if;

  -- No failure mode carries a player id or a label.
  select string_agg(probe, ', ' order by probe) into bad
  from uniformity_probe_results
  where player_id is not null or public_label is not null;
  if bad is not null then
    raise exception 'UNIFORMITY FAIL: a failure mode returned identifying detail: %', bad;
  end if;

  -- No exception escaped, so SQLSTATE and error text disclose nothing.
  select string_agg(probe || '=' || sqlstate, ', ' order by probe) into bad
  from uniformity_probe_results where sqlstate <> '00000' or error_text is not null;
  if bad is not null then
    raise exception 'UNIFORMITY FAIL: a failure mode raised: %', bad;
  end if;

  -- Column names, count and order are byte-identical across every mode.
  select count(distinct column_keys) into distinct_shapes from uniformity_probe_results;
  if distinct_shapes <> 1 then
    raise exception 'UNIFORMITY FAIL: failure modes returned % distinct column shapes',
      distinct_shapes;
  end if;
  select distinct column_keys into bad from uniformity_probe_results;
  if bad <> 'outcome,player_id,public_label' then
    raise exception 'UNIFORMITY FAIL: unexpected column shape %', bad;
  end if;

  -- All five probes are present, so nothing above passed vacuously.
  if (select count(*) from uniformity_probe_results) <> 5 then
    raise exception 'UNIFORMITY FAIL: expected five probes, found %',
      (select count(*) from uniformity_probe_results);
  end if;
end $$;

-- The declared result type is the only shape any caller can receive.
do $$
declare shape text;
begin
  select pg_get_function_result(
    'public.resolve_staged_import_player_identity(uuid,uuid,integer,text,text,text,text,uuid,boolean)'::regprocedure
  ) into shape;
  if shape <> 'TABLE(outcome text, player_id uuid, public_label text)' then
    raise exception 'UNIFORMITY FAIL: result shape drifted to %', shape;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. The privilege boundary is unchanged by the widening.
-- ---------------------------------------------------------------------------

do $$
declare
  gateway text;
  role_name text;
begin
  foreach gateway in array array[
    'public.stage_import_player_identity_evidence(uuid,uuid,text[],text,text)',
    'public.attach_import_identity_staging(uuid,uuid,uuid,uuid)',
    'public.discard_import_identity_staging(uuid,uuid)',
    'public.resolve_staged_import_player_identity(uuid,uuid,integer,text,text,text,text,uuid,boolean)'
  ] loop
    foreach role_name in array array['anon', 'authenticated', 'public'] loop
      if has_function_privilege(role_name, gateway::regprocedure, 'execute') then
        raise exception 'UNIFORMITY FAIL: % may execute %', role_name, gateway;
      end if;
    end loop;
    if not has_function_privilege('service_role', gateway::regprocedure, 'execute') then
      raise exception 'UNIFORMITY FAIL: service_role lost execute on %', gateway;
    end if;
  end loop;

  -- The matcher itself is reachable by nobody; only the definer gateways call it.
  foreach role_name in array array['anon', 'authenticated', 'service_role', 'public'] loop
    if has_function_privilege(
      role_name,
      'private.import_identity_player_matches(uuid,uuid,text,text,text,text,text)'::regprocedure,
      'execute'
    ) then
      raise exception 'UNIFORMITY FAIL: % may execute the matcher directly', role_name;
    end if;
  end loop;
end $$;

-- The staging table stays unreachable: RLS on, and no grant to any role.
do $$
declare
  role_name text;
  privilege text;
begin
  if not (select relrowsecurity from pg_class where oid = 'private.import_identity_staging'::regclass) then
    raise exception 'UNIFORMITY FAIL: row level security is off on the staging table';
  end if;
  foreach role_name in array array['anon', 'authenticated', 'service_role', 'public'] loop
    foreach privilege in array array['select', 'insert', 'update', 'delete', 'references', 'trigger'] loop
      if has_table_privilege(role_name, 'private.import_identity_staging', privilege) then
        raise exception 'UNIFORMITY FAIL: % holds % on the staging table', role_name, privilege;
      end if;
    end loop;
  end loop;
end $$;

-- The widened evidence sources stay unreadable by client roles, so reading them
-- inside the definer did not make them reachable from outside it.
do $$
declare role_name text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    if has_column_privilege(role_name, 'public.players', 'full_name', 'select')
       or has_column_privilege(role_name, 'public.players', 'username', 'select') then
      raise exception 'UNIFORMITY FAIL: % can read the private players columns', role_name;
    end if;
    if has_table_privilege(role_name, 'private.player_legacy_identities', 'select')
       or has_table_privilege(role_name, 'private.player_private_identities', 'select') then
      raise exception 'UNIFORMITY FAIL: % can read a private identity table', role_name;
    end if;
  end loop;
end $$;

select probe, outcome, row_count, column_keys from uniformity_probe_results order by probe;
select 'SOURCE_BOUND_IMPORT_IDENTITY_UNIFORMITY_PINNED' as result;
