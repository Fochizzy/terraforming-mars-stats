-- Forward-only event capture. Aggregate Venus/Colonies facts were already
-- backfilled into public.game_expansion_facts by the production migration
-- 20260718200536_add_venus_colonies_import_facts.
do $requirements$
begin
  if to_regclass('public.game_expansion_facts') is null then
    raise exception 'public.game_expansion_facts must exist before game mechanic capture can be deployed';
  end if;
end;
$requirements$;

create table if not exists public.game_venus_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  source_game_log_import_id uuid,
  player_id uuid references public.players(id) on delete set null,
  source_player_name text,
  attribution_status text not null check (attribution_status in ('explicit_stable', 'explicit_unresolved', 'unattributed')),
  generation_number integer check (generation_number is null or generation_number > 0),
  event_key text not null,
  event_order integer not null check (event_order >= 0),
  event_type text not null default 'tracker_change' check (event_type = 'tracker_change'),
  tracker_steps integer not null check (tracker_steps <> 0),
  before_value integer,
  after_value integer,
  source_entity text,
  raw_evidence text not null check (btrim(raw_evidence) <> ''),
  parser_version text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  coverage jsonb not null default '{}'::jsonb check (jsonb_typeof(coverage) = 'object'),
  created_at timestamptz not null default now(),
  unique (game_id, event_key),
  foreign key (game_id, source_game_log_import_id)
    references public.game_log_imports (game_id, id) on delete cascade
);

create index if not exists game_venus_events_game_id_event_order_idx
  on public.game_venus_events (game_id, event_order);

create table if not exists public.game_colony_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  source_game_log_import_id uuid,
  player_id uuid references public.players(id) on delete set null,
  source_player_name text,
  attribution_status text not null check (attribution_status in ('explicit_stable', 'explicit_unresolved', 'unattributed')),
  generation_number integer check (generation_number is null or generation_number > 0),
  event_key text not null,
  event_order integer not null check (event_order >= 0),
  colony_id text not null check (colony_id ~ '^[a-z0-9_]+$'),
  event_type text not null check (event_type in ('built_colony', 'traded_with_colony')),
  payment_or_fleet_info text,
  colony_track_before integer,
  colony_track_after integer,
  event_details jsonb not null default '{}'::jsonb check (jsonb_typeof(event_details) = 'object'),
  raw_evidence text not null check (btrim(raw_evidence) <> ''),
  parser_version text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  coverage jsonb not null default '{}'::jsonb check (jsonb_typeof(coverage) = 'object'),
  created_at timestamptz not null default now(),
  unique (game_id, event_key),
  foreign key (game_id, source_game_log_import_id)
    references public.game_log_imports (game_id, id) on delete cascade
);

create index if not exists game_colony_events_game_id_event_order_idx
  on public.game_colony_events (game_id, event_order);

create table if not exists public.game_mechanic_capture_deployments (
  deployment_key text primary key,
  cutoff_at timestamptz not null,
  schema_migration_version text not null,
  parser_version text not null,
  parser_deployed_at timestamptz,
  production_game_count integer check (production_game_count is null or production_game_count >= 0),
  production_venus_event_count integer check (production_venus_event_count is null or production_venus_event_count >= 0),
  production_colony_event_count integer check (production_colony_event_count is null or production_colony_event_count >= 0),
  recorded_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.game_mechanic_capture_deployments (
  deployment_key,
  cutoff_at,
  schema_migration_version,
  parser_version
)
values (
  'venus-colonies-capture-v1',
  now(),
  '20260718204000_add_game_mechanic_capture',
  'tm-export-log-mechanics-v1'
)
on conflict (deployment_key) do nothing;

alter table public.game_venus_events enable row level security;
alter table public.game_colony_events enable row level security;
alter table public.game_mechanic_capture_deployments enable row level security;

drop policy if exists "members read Venus events" on public.game_venus_events;
drop policy if exists "editors manage Venus events" on public.game_venus_events;
drop policy if exists "members read Colony events" on public.game_colony_events;
drop policy if exists "editors manage Colony events" on public.game_colony_events;

create policy "members read Venus events"
on public.game_venus_events for select
to authenticated
using (public.can_read_game(game_id));

create policy "editors manage Venus events"
on public.game_venus_events for all
to authenticated
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

create policy "members read Colony events"
on public.game_colony_events for select
to authenticated
using (public.can_read_game(game_id));

create policy "editors manage Colony events"
on public.game_colony_events for all
to authenticated
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));

grant select, insert, update, delete on public.game_venus_events to authenticated;
grant select, insert, update, delete on public.game_colony_events to authenticated;

create or replace function public.replace_game_mechanic_capture(
  p_game_id uuid,
  p_game_log_import_id uuid,
  p_venus_next_state text,
  p_colonies_state text,
  p_parser_version text,
  p_source_coverage jsonb,
  p_provenance text,
  p_final_venus_scale integer,
  p_venus_events jsonb,
  p_colony_events jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_venus_event_count integer := 0;
  v_colony_event_count integer := 0;
  v_colony_built_count integer := 0;
  v_colony_trade_count integer := 0;
begin
  if p_venus_next_state is null or p_colonies_state is null then
    raise exception 'mechanic states must be explicit';
  end if;

  if p_venus_next_state not in (
    'confirmed_present', 'confirmed_absent', 'incomplete_evidence',
    'unsupported_log_pattern', 'conflicting_evidence'
  ) or p_colonies_state not in (
    'confirmed_present', 'confirmed_absent', 'incomplete_evidence',
    'unsupported_log_pattern', 'conflicting_evidence'
  ) then
    raise exception 'mechanic states are invalid';
  end if;

  if p_parser_version is null or btrim(p_parser_version) = '' then
    raise exception 'parser version is required';
  end if;

  if p_provenance is null or btrim(p_provenance) = '' then
    raise exception 'mechanic provenance is required';
  end if;

  if jsonb_typeof(coalesce(p_source_coverage, '{}'::jsonb)) <> 'object' then
    raise exception 'mechanic source coverage must be a JSON object';
  end if;

  if jsonb_typeof(coalesce(p_venus_events, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_colony_events, '[]'::jsonb)) <> 'array' then
    raise exception 'mechanic events must be JSON arrays';
  end if;

  if p_game_log_import_id is null
    and (jsonb_array_length(coalesce(p_venus_events, '[]'::jsonb)) > 0
      or jsonb_array_length(coalesce(p_colony_events, '[]'::jsonb)) > 0) then
    raise exception 'mechanic events require a source game log import';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_venus_events, '[]'::jsonb)) as event_item
    where coalesce(btrim(event_item ->> 'event_key'), '') = ''
      or coalesce(btrim(event_item ->> 'raw_evidence'), '') = ''
  ) or exists (
    select 1
    from jsonb_array_elements(coalesce(p_colony_events, '[]'::jsonb)) as event_item
    where coalesce(btrim(event_item ->> 'event_key'), '') = ''
      or coalesce(btrim(event_item ->> 'raw_evidence'), '') = ''
  ) then
    raise exception 'mechanic event keys and evidence must not be blank';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_venus_events, '[]'::jsonb)) as event_item
    group by event_item ->> 'event_key'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(coalesce(p_colony_events, '[]'::jsonb)) as event_item
    group by event_item ->> 'event_key'
    having count(*) > 1
  ) then
    raise exception 'mechanic event keys must be unique per capture';
  end if;

  perform 1
  from public.games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'game % does not exist or is not editable', p_game_id;
  end if;

  if p_game_log_import_id is not null then
    perform 1
    from public.game_log_imports
    where id = p_game_log_import_id and game_id = p_game_id;

    if not found then
      raise exception 'game log import % does not belong to game %', p_game_log_import_id, p_game_id;
    end if;
  end if;

  delete from public.game_venus_events where game_id = p_game_id;
  delete from public.game_colony_events where game_id = p_game_id;

  insert into public.game_venus_events (
    attribution_status, before_value, confidence, coverage, event_key, event_order,
    event_type, game_id, generation_number, parser_version, player_id, raw_evidence,
    source_entity, source_game_log_import_id, source_player_name, tracker_steps
  )
  select
    event_item ->> 'attribution_status',
    nullif(event_item ->> 'before_value', '')::integer,
    event_item ->> 'confidence',
    coalesce(event_item -> 'coverage', '{}'::jsonb),
    event_item ->> 'event_key',
    (event_item ->> 'event_order')::integer,
    coalesce(event_item ->> 'event_type', 'tracker_change'),
    p_game_id,
    nullif(event_item ->> 'generation_number', '')::integer,
    p_parser_version,
    nullif(event_item ->> 'player_id', '')::uuid,
    event_item ->> 'raw_evidence',
    nullif(event_item ->> 'source_entity', ''),
    p_game_log_import_id,
    nullif(event_item ->> 'source_player_name', ''),
    (event_item ->> 'tracker_steps')::integer
  from jsonb_array_elements(coalesce(p_venus_events, '[]'::jsonb)) as event_item;

  get diagnostics v_venus_event_count = row_count;

  insert into public.game_colony_events (
    attribution_status, colony_id, colony_track_after, colony_track_before, confidence,
    coverage, event_details, event_key, event_order, event_type, game_id,
    generation_number, parser_version, payment_or_fleet_info, player_id, raw_evidence,
    source_game_log_import_id, source_player_name
  )
  select
    event_item ->> 'attribution_status',
    event_item ->> 'colony_id',
    nullif(event_item ->> 'colony_track_after', '')::integer,
    nullif(event_item ->> 'colony_track_before', '')::integer,
    event_item ->> 'confidence',
    coalesce(event_item -> 'coverage', '{}'::jsonb),
    coalesce(event_item -> 'event_details', '{}'::jsonb),
    event_item ->> 'event_key',
    (event_item ->> 'event_order')::integer,
    event_item ->> 'event_type',
    p_game_id,
    nullif(event_item ->> 'generation_number', '')::integer,
    p_parser_version,
    nullif(event_item ->> 'payment_or_fleet_info', ''),
    nullif(event_item ->> 'player_id', '')::uuid,
    event_item ->> 'raw_evidence',
    p_game_log_import_id,
    nullif(event_item ->> 'source_player_name', '')
  from jsonb_array_elements(coalesce(p_colony_events, '[]'::jsonb)) as event_item;

  get diagnostics v_colony_event_count = row_count;

  select
    count(*) filter (where event_item ->> 'event_type' = 'built_colony'),
    count(*) filter (where event_item ->> 'event_type' = 'traded_with_colony')
  into v_colony_built_count, v_colony_trade_count
  from jsonb_array_elements(coalesce(p_colony_events, '[]'::jsonb)) as event_item;

  insert into public.game_expansion_facts (
    game_id,
    source_game_log_import_id,
    venus_next_state,
    colonies_state,
    detection_provenance,
    parser_version,
    source_coverage,
    final_venus_scale,
    venus_event_count,
    colony_built_count,
    colony_trade_count,
    updated_at
  )
  values (
    p_game_id,
    p_game_log_import_id,
    p_venus_next_state,
    p_colonies_state,
    jsonb_build_object(
      'capture_source', p_provenance,
      'capture_parser_version', p_parser_version
    ),
    p_parser_version,
    coalesce(p_source_coverage, '{}'::jsonb),
    p_final_venus_scale,
    v_venus_event_count,
    v_colony_built_count,
    v_colony_trade_count,
    now()
  )
  on conflict (game_id) do update
  set
    source_game_log_import_id = excluded.source_game_log_import_id,
    venus_next_state = excluded.venus_next_state,
    colonies_state = excluded.colonies_state,
    detection_provenance = coalesce(public.game_expansion_facts.detection_provenance, '{}'::jsonb)
      || excluded.detection_provenance,
    parser_version = excluded.parser_version,
    source_coverage = excluded.source_coverage,
    final_venus_scale = excluded.final_venus_scale,
    venus_event_count = excluded.venus_event_count,
    colony_built_count = excluded.colony_built_count,
    colony_trade_count = excluded.colony_trade_count,
    updated_at = now();

  return jsonb_build_object(
    'venus_event_count', v_venus_event_count,
    'colony_event_count', v_colony_event_count,
    'colony_built_count', v_colony_built_count,
    'colony_trade_count', v_colony_trade_count,
    'venus_next_state', p_venus_next_state,
    'colonies_state', p_colonies_state
  );
end;
$function$;

revoke all on function public.replace_game_mechanic_capture(
  uuid, uuid, text, text, text, jsonb, text, integer, jsonb, jsonb
) from public;

grant execute on function public.replace_game_mechanic_capture(
  uuid, uuid, text, text, text, jsonb, text, integer, jsonb, jsonb
) to authenticated;