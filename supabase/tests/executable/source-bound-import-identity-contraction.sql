do $$
begin
  if has_function_privilege(
    'authenticated',
    'public.match_import_player_names(uuid,text[])',
    'execute'
  ) then
    raise exception 'SOURCE-BOUND CONTRACTION FAIL: authenticated retains old matcher execute';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.match_import_player_names(uuid,text[])',
    'execute'
  ) then
    raise exception 'SOURCE-BOUND CONTRACTION FAIL: service_role compatibility access missing';
  end if;
end $$;

do $$
begin
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  set local role authenticated;
  begin
    perform public.match_import_player_names(
      '22222222-2222-4222-8222-222222222222',
      array['Oraclefixture Fullmatch']
    );
    raise exception 'SOURCE-BOUND CONTRACTION FAIL: old matcher remained callable';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

select 'SOURCE_BOUND_IMPORT_IDENTITY_CONTRACTION_PINNED' as result;
