-- AFTER proof for the gated source-bound expansion. The BEFORE oracle is
-- pinned separately by match-oracle-pre-contraction.sql before any new file.

do $$
declare
  fn oid := 'public.resolve_staged_import_player_identity(uuid,uuid,integer,text,text,text,text,uuid,boolean)'::regprocedure;
  result_columns text;
begin
  if has_function_privilege('authenticated', fn, 'execute') then
    raise exception 'SOURCE-BOUND FAIL: authenticated can execute the new matcher';
  end if;
  if not has_function_privilege('service_role', fn, 'execute') then
    raise exception 'SOURCE-BOUND FAIL: service_role cannot execute the new matcher';
  end if;
  if has_table_privilege('service_role', 'private.import_identity_staging', 'select')
     or has_table_privilege('authenticated', 'private.import_identity_staging', 'select') then
    raise exception 'SOURCE-BOUND FAIL: staging table has direct reader grants';
  end if;

  select pg_get_function_result(fn) into result_columns;
  if result_columns <> 'TABLE(outcome text, player_id uuid, public_label text)' then
    raise exception 'SOURCE-BOUND FAIL: unsafe return shape %', result_columns;
  end if;
end $$;

do $$
declare
  stage_id uuid;
  r record;
  created_player uuid;
begin
  set local role service_role;
  select public.stage_import_player_identity_evidence(
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    array['oraclefixture-username', 'Sourcebound Guest', 'Sourcebound', 'No Match'],
    'executable-parser-v1',
    'terraforming_mars_exported_log'
  ) into stage_id;
  if stage_id is null then
    raise exception 'SOURCE-BOUND FAIL: authorized stage returned null';
  end if;

  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 1,
    'username', 'oraclefixture-username', null, null, null, false
  );
  if r.outcome <> 'resolved'
     or r.player_id <> '0ac1e003-0ac1-4003-8003-000000000003'::uuid
     or r.public_label <> 'oraclefixture-username' then
    raise exception 'SOURCE-BOUND FAIL: exact registered username did not resolve: %', row_to_json(r);
  end if;

  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 4,
    'username', 'Different Value', null, null, null, true
  );
  if r.outcome <> 'invalid_source_match' or r.player_id is not null or r.public_label is not null then
    raise exception 'SOURCE-BOUND FAIL: mismatched source leaked detail: %', row_to_json(r);
  end if;

  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 2,
    'personal_name', null, 'Sourcebound', 'Guest', null, true
  );
  if r.outcome <> 'resolved' or r.player_id is null or r.public_label !~ '^Guest [A-F0-9]{8}$' then
    raise exception 'SOURCE-BOUND FAIL: exact full personal name did not create neutral guest: %', row_to_json(r);
  end if;
  created_player := r.player_id;

  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 3,
    'personal_name', null, 'Sourcebound', 'Guest', null, false
  );
  if r.outcome <> 'ambiguous' or r.player_id is not null or r.public_label is not null then
    raise exception 'SOURCE-BOUND FAIL: first-name-only source auto-linked: %', row_to_json(r);
  end if;

  select * into r from public.resolve_staged_import_player_identity(
    stage_id, '11111111-1111-4111-8111-111111111111', 3,
    'personal_name', null, 'Sourcebound', 'Guest', created_player, false
  );
  if r.outcome <> 'resolved' or r.player_id <> created_player then
    raise exception 'SOURCE-BOUND FAIL: explicit first-name selection did not resolve: %', row_to_json(r);
  end if;
  reset role;
end $$;

do $$
declare
  unauthorized_stage uuid;
  overbound_stage uuid;
begin
  set local role service_role;
  select public.stage_import_player_identity_evidence(
    '22222222-2222-4222-8222-222222222222',
    '99999999-9999-4999-8999-999999999999',
    array['Probe'], 'parser', 'log'
  ) into unauthorized_stage;
  select public.stage_import_player_identity_evidence(
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    array['1','2','3','4','5','6'], 'parser', 'log'
  ) into overbound_stage;
  reset role;
  if unauthorized_stage is not null or overbound_stage is not null then
    raise exception 'SOURCE-BOUND FAIL: authorization or 1..5 bound accepted';
  end if;
end $$;

-- Finalization cleanup.
insert into public.games (
  id, group_id, played_on, player_count, generation_count,
  created_by_user_id, updated_by_user_id
) values (
  'a1000000-0000-4000-8000-000000000001',
  '22222222-2222-4222-8222-222222222222', current_date, 1, 1,
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111'
);
insert into public.game_log_imports (id, game_id, created_by_user_id)
values (
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111'
);

do $$
declare stage_id uuid;
begin
  set local role service_role;
  select public.stage_import_player_identity_evidence(
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111', array['Lifecycle'], 'parser', 'log'
  ) into stage_id;
  if not public.attach_import_identity_staging(
    stage_id, '11111111-1111-4111-8111-111111111111',
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001'
  ) then raise exception 'SOURCE-BOUND FAIL: attach failed'; end if;
  reset role;
  update public.games set status='finalized'
  where id='a1000000-0000-4000-8000-000000000001';
  if exists (select 1 from private.import_identity_staging where id=stage_id) then
    raise exception 'SOURCE-BOUND FAIL: finalized staging survived';
  end if;
end $$;

-- Expiry cleanup is deterministic and needs no scheduler extension.
insert into private.import_identity_staging (
  id, group_id, created_by_user_id, source_player_texts,
  parser_identity, source_format, created_at, expires_at
) values (
  'a3000000-0000-4000-8000-000000000001',
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111', array['Expired'],
  'parser', 'log', now() - interval '2 hours', now() - interval '1 hour'
);

do $$
declare stage_id uuid;
begin
  set local role service_role;
  select public.stage_import_player_identity_evidence(
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111', array['Cleanup'], 'parser', 'log'
  ) into stage_id;
  reset role;
  if stage_id is null or exists (
    select 1 from private.import_identity_staging
    where id='a3000000-0000-4000-8000-000000000001'
  ) then raise exception 'SOURCE-BOUND FAIL: opportunistic expiry cleanup failed'; end if;
end $$;

select 'SOURCE_BOUND_IMPORT_IDENTITY_AFTER_PINNED' as result;
