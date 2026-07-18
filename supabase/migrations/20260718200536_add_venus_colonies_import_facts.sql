create table public.game_expansion_facts (
  game_id uuid primary key references public.games(id) on delete cascade,
  source_game_log_import_id uuid,
  venus_next_state text not null,
  colonies_state text not null,
  detection_provenance jsonb not null default '{}'::jsonb,
  parser_version text,
  source_coverage jsonb not null default '{}'::jsonb,
  final_venus_scale smallint,
  venus_event_count integer not null default 0,
  colony_built_count integer not null default 0,
  colony_trade_count integer not null default 0,
  backfill_version text,
  backfilled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_expansion_facts_venus_state_check check (
    venus_next_state in (
      'confirmed_present',
      'confirmed_absent',
      'incomplete_evidence',
      'unsupported_log_pattern',
      'conflicting_evidence',
      'historical_parser_verified_owner_confirmed_absent',
      'historical_owner_confirmed_absent'
    )
  ),
  constraint game_expansion_facts_colonies_state_check check (
    colonies_state in (
      'confirmed_present',
      'confirmed_absent',
      'incomplete_evidence',
      'unsupported_log_pattern',
      'conflicting_evidence',
      'historical_parser_verified_owner_confirmed_absent',
      'historical_owner_confirmed_absent'
    )
  ),
  constraint game_expansion_facts_final_venus_scale_check check (
    final_venus_scale is null
    or (
      final_venus_scale between 0 and 30
      and mod(final_venus_scale, 2) = 0
    )
  ),
  constraint game_expansion_facts_nonnegative_counts_check check (
    venus_event_count >= 0
    and colony_built_count >= 0
    and colony_trade_count >= 0
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'game_log_imports_game_id_id_unique'
      and conrelid = 'public.game_log_imports'::regclass
  ) then
    alter table public.game_log_imports
    add constraint game_log_imports_game_id_id_unique unique (game_id, id);
  end if;
end;
$$;

alter table public.game_expansion_facts
add constraint game_expansion_facts_source_import_check
foreign key (game_id, source_game_log_import_id)
references public.game_log_imports (game_id, id)
on delete set null (source_game_log_import_id);

comment on table public.game_expansion_facts is
  'Parser-derived Venus Next and Colonies state for one game, with source coverage and provenance.';
comment on column public.game_expansion_facts.final_venus_scale is
  'Trusted final Venus scale evidence only. Null means unavailable or not applicable; zero is an explicit value.';

alter table public.game_log_events
  add column player_id uuid references public.players(id) on delete set null,
  add column colony_id text,
  add column event_identity text,
  add column parameter_steps smallint,
  add column parameter_before smallint,
  add column parameter_after smallint,
  add column source_entity text,
  add column parser_version text,
  add column event_provenance text;

alter table public.game_log_events
  add constraint game_log_events_parameter_before_check check (
    parameter_before is null or parameter_before between 0 and 30
  ),
  add constraint game_log_events_parameter_after_check check (
    parameter_after is null or parameter_after between 0 and 30
  );

create unique index game_log_events_import_event_identity_unique
on public.game_log_events (game_log_import_id, event_identity)
where event_identity is not null;

create index game_log_events_player_id_idx
on public.game_log_events (player_id)
where player_id is not null;

create index game_log_events_colony_event_idx
on public.game_log_events (colony_id, event_type)
where colony_id is not null;

create or replace function public.replace_game_log_events(
  p_game_log_import_id uuid,
  p_events jsonb
)
returns table (
  id uuid,
  event_order integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_events jsonb := coalesce(p_events, '[]'::jsonb);
begin
  if jsonb_typeof(normalized_events) <> 'array' then
    raise exception 'p_events must be a JSON array';
  end if;

  if jsonb_array_length(normalized_events) = 0 then
    return query
    select gle.id, gle.event_order
    from public.game_log_events gle
    where gle.game_log_import_id = p_game_log_import_id
    order by gle.event_order;
    return;
  end if;

  perform 1
  from public.game_log_imports gli
  where gli.id = p_game_log_import_id
  for update;

  if not found then
    raise exception 'game_log_import_id % does not exist', p_game_log_import_id;
  end if;

  delete from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
    and not exists (
      select 1
      from jsonb_array_elements(normalized_events) as event_item
      where (event_item ->> 'event_order')::integer = gle.event_order
    );

  insert into public.game_log_events (
    game_log_import_id,
    board_space,
    card_id,
    colony_id,
    confidence_level,
    event_identity,
    event_order,
    event_provenance,
    event_type,
    generation_number,
    line_classification,
    parameter_after,
    parameter_before,
    parameter_steps,
    parser_version,
    payload,
    player_id,
    raw_line,
    resource_amount,
    resource_type,
    source_entity,
    tile_type
  )
  select
    p_game_log_import_id,
    nullif(event_item ->> 'board_space', ''),
    nullif(event_item ->> 'card_id', '')::uuid,
    nullif(event_item ->> 'colony_id', ''),
    event_item ->> 'confidence_level',
    nullif(event_item ->> 'event_identity', ''),
    (event_item ->> 'event_order')::integer,
    nullif(event_item ->> 'event_provenance', ''),
    event_item ->> 'event_type',
    nullif(event_item ->> 'generation_number', '')::integer,
    nullif(event_item ->> 'line_classification', ''),
    nullif(event_item ->> 'parameter_after', '')::smallint,
    nullif(event_item ->> 'parameter_before', '')::smallint,
    nullif(event_item ->> 'parameter_steps', '')::smallint,
    nullif(event_item ->> 'parser_version', ''),
    coalesce(event_item -> 'payload', '{}'::jsonb),
    nullif(event_item ->> 'player_id', '')::uuid,
    event_item ->> 'raw_line',
    nullif(event_item ->> 'resource_amount', '')::integer,
    nullif(event_item ->> 'resource_type', ''),
    nullif(event_item ->> 'source_entity', ''),
    nullif(event_item ->> 'tile_type', '')
  from jsonb_array_elements(normalized_events) as event_item
  on conflict on constraint game_log_events_import_order_unique do update
  set
    board_space = excluded.board_space,
    card_id = excluded.card_id,
    colony_id = excluded.colony_id,
    confidence_level = excluded.confidence_level,
    event_identity = excluded.event_identity,
    event_provenance = excluded.event_provenance,
    event_type = excluded.event_type,
    generation_number = excluded.generation_number,
    line_classification = excluded.line_classification,
    parameter_after = excluded.parameter_after,
    parameter_before = excluded.parameter_before,
    parameter_steps = excluded.parameter_steps,
    parser_version = excluded.parser_version,
    payload = excluded.payload,
    player_id = excluded.player_id,
    raw_line = excluded.raw_line,
    resource_amount = excluded.resource_amount,
    resource_type = excluded.resource_type,
    source_entity = excluded.source_entity,
    tile_type = excluded.tile_type;

  return query
  select gle.id, gle.event_order
  from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
  order by gle.event_order;
end;
$$;

alter table public.game_expansion_facts enable row level security;

revoke all on table public.game_expansion_facts from anon;
grant select, insert, update, delete on table public.game_expansion_facts to authenticated;
grant all on table public.game_expansion_facts to service_role;

create policy "members read game expansion facts"
on public.game_expansion_facts for select
to authenticated
using (public.can_read_game(game_id));

create policy "editors manage game expansion facts"
on public.game_expansion_facts for all
to authenticated
using (public.can_edit_game(game_id))
with check (public.can_edit_game(game_id));
