-- Data-capture hardening v2 (additive, forward-only).
--
-- Purpose: capture migration-ready game facts for the redesigned site without
-- reparsing raw logs later. This migration is additive and idempotent. It is
-- compatible with:
--   * the 42 historical public.game_expansion_facts rows (owner-confirmed
--     absence) -- it never rewrites their state, provenance, or backfill columns;
--   * the 14,816 existing public.game_log_events rows -- left untouched;
--   * the empty v1 public.game_venus_events / public.game_colony_events tables;
--   * current import/scoring behaviour -- no existing object is dropped.
--
-- It introduces one canonical capture contract: an immutable source record, a
-- versioned parser run, a shared event envelope, canonical board placements,
-- map-detection state + evidence, and private unsupported evidence. Game-level
-- Venus/Colonies state continues to live in public.game_expansion_facts.

-- ---------------------------------------------------------------------------
-- 0. Prerequisites and hygiene on existing objects
-- ---------------------------------------------------------------------------

-- Composite FK target so an event/placement game_player_id must belong to the
-- same game. game_players only had PRIMARY KEY (id); add the (game_id, id)
-- unique constraint the composite foreign keys reference.
do $prep$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.game_players'::regclass
      and conname = 'game_players_game_id_id_key'
  ) then
    alter table public.game_players
      add constraint game_players_game_id_id_key unique (game_id, id);
  end if;
end;
$prep$;

-- Security hygiene: the v1 event tables inherited the default public-schema
-- anon table grant. RLS blocks anon (there are no anon policies), but the grant
-- is unnecessary surface. Revoke it. This does not touch RLS or authenticated.
revoke all on public.game_venus_events from anon;
revoke all on public.game_colony_events from anon;

-- ---------------------------------------------------------------------------
-- 1. Canonical catalogues (enforce canonical event types and colony IDs)
-- ---------------------------------------------------------------------------

create table if not exists public.capture_colony_catalog (
  colony_id text primary key check (colony_id ~ '^[a-z0-9_]+$')
);

insert into public.capture_colony_catalog (colony_id)
values
  ('callisto'), ('ceres'), ('enceladus'), ('europa'), ('ganymede'), ('io'),
  ('leavitt'), ('luna'), ('miranda'), ('pluto'), ('titan'), ('triton'), ('venus')
on conflict (colony_id) do nothing;

create table if not exists public.capture_event_type_catalog (
  event_category text not null,
  event_type text not null,
  primary key (event_category, event_type)
);

insert into public.capture_event_type_catalog (event_category, event_type)
values
  ('card_play', 'card_played'),
  ('tile_placement', 'tile_placed'),
  ('global_parameter', 'temperature_raised'),
  ('global_parameter', 'oxygen_raised'),
  ('global_parameter', 'ocean_raised'),
  ('global_parameter', 'ocean_placed'),
  ('global_parameter', 'parameter_changed'),
  ('venus', 'venus_raised'),
  ('venus', 'venus_tracker_change'),
  ('colony', 'built_colony'),
  ('colony', 'traded_with_colony'),
  ('colony', 'colony_setup'),
  ('milestone', 'milestone_claimed'),
  ('award', 'award_funded'),
  ('award', 'award_result'),
  ('standard_project', 'standard_project'),
  ('generation', 'generation_started'),
  ('generation', 'generation_ended'),
  ('pass', 'player_passed'),
  ('action_order', 'action_taken'),
  ('card_points', 'card_points_breakdown'),
  ('resource', 'resource_changed'),
  ('unsupported', 'unsupported_line')
on conflict (event_category, event_type) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Immutable source retention
-- ---------------------------------------------------------------------------

create table if not exists public.game_capture_import_sources (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_log_import_id uuid not null,
  source_format text not null check (source_format in (
    'manual_web_import', 'serialized_game', 'upstream_log', 'unknown'
  )),
  source_route text,
  original_source_text text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_byte_length integer not null check (source_byte_length >= 0),
  upstream_app_version text,
  export_generated_at timestamptz,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (game_log_import_id),
  foreign key (game_id, game_log_import_id)
    references public.game_log_imports (game_id, id) on delete cascade
);

create index if not exists game_capture_import_sources_game_id_idx
  on public.game_capture_import_sources (game_id);

-- Enforce byte-for-byte immutability: once written, the original text and its
-- hash may never be rewritten (a re-parse must not overwrite the evidence).
create or replace function public.enforce_capture_source_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.original_source_text is distinct from old.original_source_text
     or new.source_sha256 is distinct from old.source_sha256 then
    raise exception 'game_capture_import_sources original text/hash is immutable'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists game_capture_import_sources_immutable
  on public.game_capture_import_sources;
create trigger game_capture_import_sources_immutable
  before update on public.game_capture_import_sources
  for each row execute function public.enforce_capture_source_immutability();

-- ---------------------------------------------------------------------------
-- 3. Versioned parser runs
-- ---------------------------------------------------------------------------

create table if not exists public.game_capture_parser_runs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_log_import_id uuid,
  source_id uuid references public.game_capture_import_sources(id) on delete cascade,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  parser_version text not null check (btrim(parser_version) <> ''),
  workflow_version text,
  coverage_state text not null check (coverage_state in (
    'complete', 'partial', 'unsupported_pattern', 'conflicting', 'parser_failure'
  )),
  coverage jsonb not null default '{}'::jsonb check (jsonb_typeof(coverage) = 'object'),
  provenance text not null check (btrim(provenance) <> ''),
  parser_ran_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (game_id, parser_version, source_sha256),
  foreign key (game_id, game_log_import_id)
    references public.game_log_imports (game_id, id) on delete set null
);

create index if not exists game_capture_parser_runs_game_id_idx
  on public.game_capture_parser_runs (game_id);

-- ---------------------------------------------------------------------------
-- 4. Shared canonical event envelope
-- ---------------------------------------------------------------------------

create table if not exists public.game_capture_events (
  id uuid primary key default gen_random_uuid(),
  event_uid text not null check (btrim(event_uid) <> ''),
  game_id uuid not null references public.games(id) on delete cascade,
  game_log_import_id uuid,
  parser_run_id uuid not null references public.game_capture_parser_runs(id) on delete cascade,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  event_sequence integer not null check (event_sequence >= 0),
  generation_number integer check (generation_number is null or generation_number > 0),
  player_id uuid references public.players(id) on delete set null,
  game_player_id uuid references public.game_players(id) on delete set null,
  attribution_status text not null check (attribution_status in (
    'explicit_stable', 'explicit_unresolved', 'unattributed', 'not_applicable'
  )),
  event_category text not null check (event_category in (
    'card_play', 'tile_placement', 'global_parameter', 'venus', 'colony',
    'milestone', 'award', 'standard_project', 'generation', 'pass',
    'action_order', 'card_points', 'resource', 'unsupported'
  )),
  event_type text not null,
  canonical_entity_id text,
  source_line_number integer check (source_line_number is null or source_line_number >= 0),
  source_text text not null check (btrim(source_text) <> ''),
  normalized_text text,
  parameter_type text check (parameter_type is null or parameter_type in (
    'temperature', 'oxygen', 'ocean', 'venus'
  )),
  value_before integer,
  value_after integer,
  amount integer,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  coverage_state text not null check (coverage_state in (
    'complete', 'partial', 'unsupported_pattern', 'conflicting', 'parser_failure'
  )),
  provenance text not null check (btrim(provenance) <> ''),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now(),
  unique (game_id, event_uid),
  foreign key (event_category, event_type)
    references public.capture_event_type_catalog (event_category, event_type),
  foreign key (game_id, game_player_id)
    references public.game_players (game_id, id) on delete set null,
  foreign key (game_id, game_log_import_id)
    references public.game_log_imports (game_id, id) on delete set null
);

create index if not exists game_capture_events_game_seq_idx
  on public.game_capture_events (game_id, event_sequence);
create index if not exists game_capture_events_game_generation_idx
  on public.game_capture_events (game_id, generation_number);
create index if not exists game_capture_events_player_idx
  on public.game_capture_events (player_id);
create index if not exists game_capture_events_game_category_type_idx
  on public.game_capture_events (game_id, event_category, event_type);
create index if not exists game_capture_events_entity_idx
  on public.game_capture_events (canonical_entity_id);
create index if not exists game_capture_events_parser_run_idx
  on public.game_capture_events (parser_run_id);

-- ---------------------------------------------------------------------------
-- 5. Canonical board placements
-- ---------------------------------------------------------------------------

create table if not exists public.game_capture_board_placements (
  id uuid primary key default gen_random_uuid(),
  placement_uid text not null check (btrim(placement_uid) <> ''),
  game_id uuid not null references public.games(id) on delete cascade,
  event_id uuid references public.game_capture_events(id) on delete cascade,
  parser_run_id uuid not null references public.game_capture_parser_runs(id) on delete cascade,
  event_sequence integer not null check (event_sequence >= 0),
  generation_number integer check (generation_number is null or generation_number > 0),
  player_id uuid references public.players(id) on delete set null,
  game_player_id uuid references public.game_players(id) on delete set null,
  raw_actor_text text,
  attribution_status text not null check (attribution_status in (
    'explicit_stable', 'explicit_unresolved', 'unattributed', 'not_applicable'
  )),
  map_id uuid references public.maps(id) on delete set null,
  map_code text,
  canonical_board_space_id text,
  upstream_numeric_space_id integer,
  board_row integer check (board_row is null or board_row > 0),
  board_position integer check (board_position is null or board_position > 0),
  tile_type text not null check (tile_type in (
    'ocean', 'city', 'greenery', 'special', 'neutral', 'unresolved'
  )),
  placement_action text not null check (placement_action in (
    'place', 'replace', 'remove', 'convert', 'ownership_change', 'unresolved'
  )),
  ownership_state text check (ownership_state is null or ownership_state in (
    'owned', 'neutral', 'unowned', 'unresolved'
  )),
  source_card_or_action text,
  raw_evidence text not null check (btrim(raw_evidence) <> ''),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  parser_version text not null check (btrim(parser_version) <> ''),
  provenance text not null check (btrim(provenance) <> ''),
  created_at timestamptz not null default now(),
  unique (game_id, placement_uid),
  foreign key (game_id, game_player_id)
    references public.game_players (game_id, id) on delete set null
);

create index if not exists game_capture_board_placements_game_seq_idx
  on public.game_capture_board_placements (game_id, event_sequence);
create index if not exists game_capture_board_placements_game_space_idx
  on public.game_capture_board_placements (game_id, canonical_board_space_id);
create index if not exists game_capture_board_placements_parser_run_idx
  on public.game_capture_board_placements (parser_run_id);

-- ---------------------------------------------------------------------------
-- 6. Map detection state + evidence
-- ---------------------------------------------------------------------------

create table if not exists public.game_capture_map_detections (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  parser_run_id uuid not null references public.game_capture_parser_runs(id) on delete cascade,
  game_log_import_id uuid,
  exported_map_value text,
  detection_state text not null check (detection_state in (
    'confident', 'ambiguous', 'conflicting', 'missing', 'unsupported'
  )),
  detected_map_id uuid references public.maps(id) on delete set null,
  detected_map_code text,
  candidate_map_codes text[] not null default '{}'::text[],
  ocean_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(ocean_evidence) = 'object'),
  objective_evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(objective_evidence) = 'object'),
  randomized_objectives boolean,
  conflict_state text check (conflict_state is null or conflict_state in (
    'none', 'log_vs_screenshot', 'multiple_candidates', 'unresolved'
  )),
  unsupported_map boolean not null default false,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  parser_version text not null check (btrim(parser_version) <> ''),
  provenance text not null check (btrim(provenance) <> ''),
  created_at timestamptz not null default now(),
  unique (game_id, parser_run_id),
  foreign key (game_id, game_log_import_id)
    references public.game_log_imports (game_id, id) on delete set null
);

create index if not exists game_capture_map_detections_game_idx
  on public.game_capture_map_detections (game_id);

-- ---------------------------------------------------------------------------
-- 7. Private unsupported evidence (retained, never discarded)
-- ---------------------------------------------------------------------------

create table if not exists public.game_capture_unsupported_evidence (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  parser_run_id uuid not null references public.game_capture_parser_runs(id) on delete cascade,
  game_log_import_id uuid,
  source_line_number integer check (source_line_number is null or source_line_number >= 0),
  raw_evidence text not null check (btrim(raw_evidence) <> ''),
  normalized_pattern text,
  reason text not null check (btrim(reason) <> ''),
  parser_version text not null check (btrim(parser_version) <> ''),
  created_at timestamptz not null default now(),
  unique (game_id, parser_run_id, source_line_number, reason),
  foreign key (game_id, game_log_import_id)
    references public.game_log_imports (game_id, id) on delete set null
);

create index if not exists game_capture_unsupported_evidence_game_idx
  on public.game_capture_unsupported_evidence (game_id);

-- ---------------------------------------------------------------------------
-- 8. Player-scope integrity trigger
-- ---------------------------------------------------------------------------

-- A supplied player_id must belong to the game's group. Runs security definer
-- so the guarantee holds regardless of the writing role (including service
-- role, which bypasses RLS). game_player_id scope is enforced by the composite
-- foreign key to game_players (game_id, id).
create or replace function public.enforce_capture_player_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.player_id is not null then
    if not exists (
      select 1
      from public.players p
      join public.games g on g.group_id = p.group_id
      where p.id = new.player_id
        and g.id = new.game_id
    ) then
      raise exception 'player % does not belong to the group of game %',
        new.player_id, new.game_id
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists game_capture_events_player_scope on public.game_capture_events;
create trigger game_capture_events_player_scope
  before insert or update on public.game_capture_events
  for each row execute function public.enforce_capture_player_scope();

drop trigger if exists game_capture_board_placements_player_scope
  on public.game_capture_board_placements;
create trigger game_capture_board_placements_player_scope
  before insert or update on public.game_capture_board_placements
  for each row execute function public.enforce_capture_player_scope();

-- Colony events must name a canonical colony from the catalogue. A conditional
-- catalogue reference cannot be a plain foreign key, so enforce it by trigger.
create or replace function public.enforce_capture_colony_catalog()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.event_category = 'colony'
     and new.event_type in ('built_colony', 'traded_with_colony') then
    if new.canonical_entity_id is null
       or not exists (
         select 1 from public.capture_colony_catalog
         where colony_id = new.canonical_entity_id
       ) then
      raise exception 'colony event % references unknown colony %',
        new.event_uid, coalesce(new.canonical_entity_id, '<null>')
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists game_capture_events_colony_catalog on public.game_capture_events;
create trigger game_capture_events_colony_catalog
  before insert or update on public.game_capture_events
  for each row execute function public.enforce_capture_colony_catalog();

-- ---------------------------------------------------------------------------
-- 9. Row level security + grants (authenticated only; no anon)
-- ---------------------------------------------------------------------------

alter table public.capture_colony_catalog enable row level security;
alter table public.capture_event_type_catalog enable row level security;
alter table public.game_capture_import_sources enable row level security;
alter table public.game_capture_parser_runs enable row level security;
alter table public.game_capture_events enable row level security;
alter table public.game_capture_board_placements enable row level security;
alter table public.game_capture_map_detections enable row level security;
alter table public.game_capture_unsupported_evidence enable row level security;

drop policy if exists "read colony catalog" on public.capture_colony_catalog;
create policy "read colony catalog" on public.capture_colony_catalog
  for select to authenticated using (true);

drop policy if exists "read event type catalog" on public.capture_event_type_catalog;
create policy "read event type catalog" on public.capture_event_type_catalog
  for select to authenticated using (true);

drop policy if exists "members read capture sources" on public.game_capture_import_sources;
drop policy if exists "editors manage capture sources" on public.game_capture_import_sources;
create policy "members read capture sources" on public.game_capture_import_sources
  for select to authenticated using (public.can_read_game(game_id));
create policy "editors manage capture sources" on public.game_capture_import_sources
  for all to authenticated using (public.can_edit_game(game_id)) with check (public.can_edit_game(game_id));

drop policy if exists "members read capture runs" on public.game_capture_parser_runs;
drop policy if exists "editors manage capture runs" on public.game_capture_parser_runs;
create policy "members read capture runs" on public.game_capture_parser_runs
  for select to authenticated using (public.can_read_game(game_id));
create policy "editors manage capture runs" on public.game_capture_parser_runs
  for all to authenticated using (public.can_edit_game(game_id)) with check (public.can_edit_game(game_id));

drop policy if exists "members read capture events" on public.game_capture_events;
drop policy if exists "editors manage capture events" on public.game_capture_events;
create policy "members read capture events" on public.game_capture_events
  for select to authenticated using (public.can_read_game(game_id));
create policy "editors manage capture events" on public.game_capture_events
  for all to authenticated using (public.can_edit_game(game_id)) with check (public.can_edit_game(game_id));

drop policy if exists "members read capture placements" on public.game_capture_board_placements;
drop policy if exists "editors manage capture placements" on public.game_capture_board_placements;
create policy "members read capture placements" on public.game_capture_board_placements
  for select to authenticated using (public.can_read_game(game_id));
create policy "editors manage capture placements" on public.game_capture_board_placements
  for all to authenticated using (public.can_edit_game(game_id)) with check (public.can_edit_game(game_id));

drop policy if exists "members read capture map" on public.game_capture_map_detections;
drop policy if exists "editors manage capture map" on public.game_capture_map_detections;
create policy "members read capture map" on public.game_capture_map_detections
  for select to authenticated using (public.can_read_game(game_id));
create policy "editors manage capture map" on public.game_capture_map_detections
  for all to authenticated using (public.can_edit_game(game_id)) with check (public.can_edit_game(game_id));

-- Unsupported evidence may contain raw player names; keep it editor-only.
drop policy if exists "editors manage capture unsupported" on public.game_capture_unsupported_evidence;
create policy "editors manage capture unsupported" on public.game_capture_unsupported_evidence
  for all to authenticated using (public.can_edit_game(game_id)) with check (public.can_edit_game(game_id));

revoke all on public.capture_colony_catalog from anon;
revoke all on public.capture_event_type_catalog from anon;
revoke all on public.game_capture_import_sources from anon;
revoke all on public.game_capture_parser_runs from anon;
revoke all on public.game_capture_events from anon;
revoke all on public.game_capture_board_placements from anon;
revoke all on public.game_capture_map_detections from anon;
revoke all on public.game_capture_unsupported_evidence from anon;

grant select on public.capture_colony_catalog to authenticated;
grant select on public.capture_event_type_catalog to authenticated;
grant select, insert, update, delete on public.game_capture_import_sources to authenticated;
grant select, insert, update, delete on public.game_capture_parser_runs to authenticated;
grant select, insert, update, delete on public.game_capture_events to authenticated;
grant select, insert, update, delete on public.game_capture_board_placements to authenticated;
grant select, insert, update, delete on public.game_capture_map_detections to authenticated;
grant select, insert, update, delete on public.game_capture_unsupported_evidence to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Atomic capture writer
-- ---------------------------------------------------------------------------

create or replace function public.replace_game_capture_v2(
  p_game_id uuid,
  p_game_log_import_id uuid,
  p_capture jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_source jsonb := coalesce(p_capture -> 'source', 'null'::jsonb);
  v_events jsonb := coalesce(p_capture -> 'events', '[]'::jsonb);
  v_placements jsonb := coalesce(p_capture -> 'placements', '[]'::jsonb);
  v_unsupported jsonb := coalesce(p_capture -> 'unsupported', '[]'::jsonb);
  v_map jsonb := p_capture -> 'map_detection';
  v_parser_version text := p_capture ->> 'parser_version';
  v_provenance text := p_capture ->> 'provenance';
  v_coverage_state text := p_capture ->> 'coverage_state';
  v_source_sha text := v_source ->> 'sha256';
  v_venus_state text := p_capture ->> 'venus_state';
  v_colonies_state text := p_capture ->> 'colonies_state';
  v_source_id uuid;
  v_existing_sha text;
  v_run_id uuid;
  v_event_count integer := 0;
  v_placement_count integer := 0;
  v_venus_count integer := 0;
  v_built_count integer := 0;
  v_trade_count integer := 0;
  v_forward_states constant text[] := array[
    'confirmed_present', 'confirmed_absent', 'incomplete_evidence',
    'unsupported_log_pattern', 'conflicting_evidence'
  ];
begin
  -- Structural validation ---------------------------------------------------
  if v_parser_version is null or btrim(v_parser_version) = '' then
    raise exception 'capture parser_version is required';
  end if;
  if v_provenance is null or btrim(v_provenance) = '' then
    raise exception 'capture provenance is required';
  end if;
  if v_coverage_state is null or v_coverage_state not in (
    'complete', 'partial', 'unsupported_pattern', 'conflicting', 'parser_failure'
  ) then
    raise exception 'capture coverage_state is invalid: %', coalesce(v_coverage_state, '<null>');
  end if;
  if v_venus_state is null or v_colonies_state is null
     or not (v_venus_state = any (v_forward_states))
     or not (v_colonies_state = any (v_forward_states)) then
    raise exception 'forward Venus/Colonies states must be explicit and canonical';
  end if;
  if jsonb_typeof(v_source) <> 'object' then
    raise exception 'capture source object is required';
  end if;
  if v_source_sha is null or v_source_sha !~ '^[0-9a-f]{64}$' then
    raise exception 'capture source sha256 must be a 64-char hex digest';
  end if;
  if jsonb_typeof(v_events) <> 'array' or jsonb_typeof(v_placements) <> 'array'
     or jsonb_typeof(v_unsupported) <> 'array' then
    raise exception 'capture events/placements/unsupported must be JSON arrays';
  end if;

  -- No blank canonical children.
  if exists (
    select 1 from jsonb_array_elements(v_events) e
    where coalesce(btrim(e ->> 'event_uid'), '') = ''
       or coalesce(btrim(e ->> 'source_text'), '') = ''
  ) then
    raise exception 'capture events must have non-blank event_uid and source_text';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_placements) p
    where coalesce(btrim(p ->> 'placement_uid'), '') = ''
       or coalesce(btrim(p ->> 'raw_evidence'), '') = ''
  ) then
    raise exception 'capture placements must have non-blank placement_uid and raw_evidence';
  end if;

  -- Deterministic identity: uids unique within the payload.
  if exists (
    select 1 from jsonb_array_elements(v_events) e
    group by e ->> 'event_uid' having count(*) > 1
  ) then
    raise exception 'capture event_uid values must be unique per capture';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_placements) p
    group by p ->> 'placement_uid' having count(*) > 1
  ) then
    raise exception 'capture placement_uid values must be unique per capture';
  end if;

  -- Ownership / existence ---------------------------------------------------
  perform 1 from public.games where id = p_game_id for update;
  if not found then
    raise exception 'game % does not exist or is not editable', p_game_id;
  end if;

  if p_game_log_import_id is not null then
    perform 1 from public.game_log_imports
    where id = p_game_log_import_id and game_id = p_game_id;
    if not found then
      raise exception 'game log import % does not belong to game %',
        p_game_log_import_id, p_game_id;
    end if;
  elsif jsonb_array_length(v_events) > 0 or jsonb_array_length(v_placements) > 0 then
    raise exception 'capture events require a source game log import';
  end if;

  -- Immutable source: insert once; never overwrite existing evidence -------
  if p_game_log_import_id is not null then
    select id, source_sha256 into v_source_id, v_existing_sha
    from public.game_capture_import_sources
    where game_log_import_id = p_game_log_import_id;

    if v_source_id is null then
      insert into public.game_capture_import_sources (
        game_id, game_log_import_id, source_format, source_route,
        original_source_text, source_sha256, source_byte_length,
        upstream_app_version, export_generated_at
      )
      values (
        p_game_id,
        p_game_log_import_id,
        coalesce(v_source ->> 'format', 'unknown'),
        v_source ->> 'route',
        coalesce(v_source ->> 'text', ''),
        v_source_sha,
        coalesce((v_source ->> 'byte_length')::integer, 0),
        v_source ->> 'upstream_app_version',
        nullif(v_source ->> 'export_generated_at', '')::timestamptz
      )
      returning id into v_source_id;
    elsif v_existing_sha is distinct from v_source_sha then
      raise exception 'immutable source hash mismatch for import % (stored %, got %)',
        p_game_log_import_id, v_existing_sha, v_source_sha;
    end if;
  end if;

  -- Versioned parser run (one per game + version + source) -----------------
  insert into public.game_capture_parser_runs (
    game_id, game_log_import_id, source_id, source_sha256, parser_version,
    workflow_version, coverage_state, coverage, provenance, parser_ran_at
  )
  values (
    p_game_id, p_game_log_import_id, v_source_id, v_source_sha, v_parser_version,
    p_capture ->> 'workflow_version', v_coverage_state,
    coalesce(p_capture -> 'coverage', '{}'::jsonb), v_provenance, now()
  )
  on conflict (game_id, parser_version, source_sha256) do update
  set
    game_log_import_id = excluded.game_log_import_id,
    source_id = excluded.source_id,
    workflow_version = excluded.workflow_version,
    coverage_state = excluded.coverage_state,
    coverage = excluded.coverage,
    provenance = excluded.provenance,
    parser_ran_at = now()
  returning id into v_run_id;

  -- Replace this run's canonical snapshot atomically (retry-idempotent).
  delete from public.game_capture_board_placements where parser_run_id = v_run_id;
  delete from public.game_capture_events where parser_run_id = v_run_id;
  delete from public.game_capture_map_detections where parser_run_id = v_run_id;
  delete from public.game_capture_unsupported_evidence where parser_run_id = v_run_id;

  insert into public.game_capture_events (
    event_uid, game_id, game_log_import_id, parser_run_id, source_sha256,
    event_sequence, generation_number, player_id, game_player_id,
    attribution_status, event_category, event_type, canonical_entity_id,
    source_line_number, source_text, normalized_text, parameter_type,
    value_before, value_after, amount, confidence, coverage_state,
    provenance, detail
  )
  select
    e ->> 'event_uid',
    p_game_id,
    p_game_log_import_id,
    v_run_id,
    v_source_sha,
    (e ->> 'event_sequence')::integer,
    nullif(e ->> 'generation_number', '')::integer,
    nullif(e ->> 'player_id', '')::uuid,
    nullif(e ->> 'game_player_id', '')::uuid,
    e ->> 'attribution_status',
    e ->> 'event_category',
    e ->> 'event_type',
    nullif(e ->> 'canonical_entity_id', ''),
    nullif(e ->> 'source_line_number', '')::integer,
    e ->> 'source_text',
    nullif(e ->> 'normalized_text', ''),
    nullif(e ->> 'parameter_type', ''),
    nullif(e ->> 'value_before', '')::integer,
    nullif(e ->> 'value_after', '')::integer,
    nullif(e ->> 'amount', '')::integer,
    coalesce(e ->> 'confidence', 'medium'),
    coalesce(e ->> 'coverage_state', v_coverage_state),
    coalesce(e ->> 'provenance', v_provenance),
    coalesce(e -> 'detail', '{}'::jsonb)
  from jsonb_array_elements(v_events) e;
  get diagnostics v_event_count = row_count;

  insert into public.game_capture_board_placements (
    placement_uid, game_id, event_id, parser_run_id, event_sequence,
    generation_number, player_id, game_player_id, raw_actor_text,
    attribution_status, map_id, map_code, canonical_board_space_id,
    upstream_numeric_space_id, board_row, board_position, tile_type,
    placement_action, ownership_state, source_card_or_action, raw_evidence,
    confidence, parser_version, provenance
  )
  select
    p ->> 'placement_uid',
    p_game_id,
    (select ev.id from public.game_capture_events ev
       where ev.parser_run_id = v_run_id and ev.event_uid = p ->> 'event_uid'),
    v_run_id,
    (p ->> 'event_sequence')::integer,
    nullif(p ->> 'generation_number', '')::integer,
    nullif(p ->> 'player_id', '')::uuid,
    nullif(p ->> 'game_player_id', '')::uuid,
    nullif(p ->> 'raw_actor_text', ''),
    p ->> 'attribution_status',
    nullif(p ->> 'map_id', '')::uuid,
    nullif(p ->> 'map_code', ''),
    nullif(p ->> 'canonical_board_space_id', ''),
    nullif(p ->> 'upstream_numeric_space_id', '')::integer,
    nullif(p ->> 'board_row', '')::integer,
    nullif(p ->> 'board_position', '')::integer,
    coalesce(p ->> 'tile_type', 'unresolved'),
    coalesce(p ->> 'placement_action', 'unresolved'),
    nullif(p ->> 'ownership_state', ''),
    nullif(p ->> 'source_card_or_action', ''),
    p ->> 'raw_evidence',
    coalesce(p ->> 'confidence', 'medium'),
    v_parser_version,
    coalesce(p ->> 'provenance', v_provenance)
  from jsonb_array_elements(v_placements) p;
  get diagnostics v_placement_count = row_count;

  if v_map is not null and jsonb_typeof(v_map) = 'object' then
    insert into public.game_capture_map_detections (
      game_id, parser_run_id, game_log_import_id, exported_map_value,
      detection_state, detected_map_id, detected_map_code, candidate_map_codes,
      ocean_evidence, objective_evidence, randomized_objectives, conflict_state,
      unsupported_map, confidence, parser_version, provenance
    )
    values (
      p_game_id, v_run_id, p_game_log_import_id,
      nullif(v_map ->> 'exported_map_value', ''),
      coalesce(v_map ->> 'detection_state', 'missing'),
      nullif(v_map ->> 'detected_map_id', '')::uuid,
      nullif(v_map ->> 'detected_map_code', ''),
      coalesce(
        (select array_agg(value) from jsonb_array_elements_text(coalesce(v_map -> 'candidate_map_codes', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(v_map -> 'ocean_evidence', '{}'::jsonb),
      coalesce(v_map -> 'objective_evidence', '{}'::jsonb),
      case when v_map ? 'randomized_objectives'
        and jsonb_typeof(v_map -> 'randomized_objectives') = 'boolean'
        then (v_map ->> 'randomized_objectives')::boolean else null end,
      nullif(v_map ->> 'conflict_state', ''),
      coalesce((v_map ->> 'unsupported_map')::boolean, false),
      coalesce(v_map ->> 'confidence', 'medium'),
      v_parser_version,
      coalesce(v_map ->> 'provenance', v_provenance)
    );
  end if;

  insert into public.game_capture_unsupported_evidence (
    game_id, parser_run_id, game_log_import_id, source_line_number,
    raw_evidence, normalized_pattern, reason, parser_version
  )
  select
    p_game_id, v_run_id, p_game_log_import_id,
    nullif(u ->> 'source_line_number', '')::integer,
    u ->> 'raw_evidence',
    nullif(u ->> 'normalized_pattern', ''),
    u ->> 'reason',
    v_parser_version
  from jsonb_array_elements(v_unsupported) u
  on conflict (game_id, parser_run_id, source_line_number, reason) do nothing;

  -- Derived game-level Venus/Colonies counts from the canonical envelope.
  select
    count(*) filter (where e ->> 'event_category' = 'venus'),
    count(*) filter (where e ->> 'event_type' = 'built_colony'),
    count(*) filter (where e ->> 'event_type' = 'traded_with_colony')
  into v_venus_count, v_built_count, v_trade_count
  from jsonb_array_elements(v_events) e;

  -- Upsert forward game state without disturbing historical backfill columns.
  insert into public.game_expansion_facts (
    game_id, source_game_log_import_id, venus_next_state, colonies_state,
    detection_provenance, parser_version, source_coverage, final_venus_scale,
    venus_event_count, colony_built_count, colony_trade_count, updated_at
  )
  values (
    p_game_id, p_game_log_import_id, v_venus_state, v_colonies_state,
    jsonb_build_object('capture_source', v_provenance, 'capture_parser_version', v_parser_version),
    v_parser_version, coalesce(p_capture -> 'coverage', '{}'::jsonb),
    nullif(p_capture ->> 'final_venus_scale', '')::smallint,
    v_venus_count, v_built_count, v_trade_count, now()
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
    'parser_run_id', v_run_id,
    'source_id', v_source_id,
    'event_count', v_event_count,
    'placement_count', v_placement_count,
    'venus_event_count', v_venus_count,
    'colony_built_count', v_built_count,
    'colony_trade_count', v_trade_count,
    'venus_next_state', v_venus_state,
    'colonies_state', v_colonies_state,
    'coverage_state', v_coverage_state
  );
end;
$function$;

revoke all on function public.replace_game_capture_v2(uuid, uuid, jsonb) from public;
grant execute on function public.replace_game_capture_v2(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 11. Release cutoff marker (v2)
-- ---------------------------------------------------------------------------

insert into public.game_mechanic_capture_deployments (
  deployment_key, cutoff_at, schema_migration_version, parser_version
)
values (
  'data-capture-hardening-v2',
  now(),
  '20260719120000_data_capture_hardening_v2',
  'tm-data-capture-v2'
)
on conflict (deployment_key) do nothing;
