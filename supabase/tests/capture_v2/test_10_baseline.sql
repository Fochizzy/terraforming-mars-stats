-- Schema, catalogue, and release-marker baseline assertions.
do $$
begin
  -- All capture objects exist.
  if to_regclass('public.game_capture_import_sources') is null
     or to_regclass('public.game_capture_parser_runs') is null
     or to_regclass('public.game_capture_events') is null
     or to_regclass('public.game_capture_board_placements') is null
     or to_regclass('public.game_capture_map_detections') is null
     or to_regclass('public.game_capture_unsupported_evidence') is null then
    raise exception 'FAIL: a capture table is missing';
  end if;

  -- Colony catalogue seeded with the 13 canonical colonies.
  if (select count(*) from public.capture_colony_catalog) <> 13 then
    raise exception 'FAIL: colony catalogue expected 13 rows, got %',
      (select count(*) from public.capture_colony_catalog);
  end if;

  -- Event-type catalogue enforces canonical (category, type) pairs.
  if not exists (
    select 1 from public.capture_event_type_catalog
    where event_category = 'colony' and event_type = 'built_colony'
  ) then
    raise exception 'FAIL: event-type catalogue missing colony/built_colony';
  end if;

  -- v2 release marker present; v1 marker preserved.
  if not exists (
    select 1 from public.game_mechanic_capture_deployments
    where deployment_key = 'data-capture-hardening-v2'
  ) then
    raise exception 'FAIL: v2 deployment marker missing';
  end if;
  if not exists (
    select 1 from public.game_mechanic_capture_deployments
    where deployment_key = 'venus-colonies-capture-v1'
  ) then
    raise exception 'FAIL: v1 deployment marker was disturbed';
  end if;

  raise notice 'PASS test_10_baseline';
end;
$$;
