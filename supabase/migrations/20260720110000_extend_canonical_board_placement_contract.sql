-- Phase 4, Step 4.3 remediation (F-02): complete the redesign-owned canonical
-- board-placement contract so replay and future board analytics never require
-- reparsing raw logs.
--
-- What was missing (independent audit):
--   * placement_action permitted only 'placed'/'removed' — no vocabulary for
--     replace / convert / ownership-change / unresolved evidence;
--   * ownership_state had no neutral / unowned / unresolved values;
--   * the raw actor text survived only inside the JSON payload;
--   * the coarse tile class (ocean/city/greenery/special/neutral/unresolved)
--     existed only as fine upstream codes;
--   * the original-source SHA-256, byte length, and deterministic parser-run
--     identity lived only inside confidence_summary JSON.
--
-- The redesign extends its own canonical persistence (public.game_log_events
-- + public.game_log_imports) to the full contract instead of writing the
-- live-site game_capture_* tables: the versioned read adapter already unifies
-- both origins, and a second producer with a different event vocabulary would
-- recreate the two-incompatible-placement-systems problem.
--
-- Vocabulary note: repository naming keeps the established past-tense values;
-- the adapter maps them onto the shared canonical vocabulary as pure renames
-- (placed→place, removed→remove, replaced→replace, converted→convert,
-- ownership_changed→ownership_change, unresolved→unresolved).
--
-- Historical rows: additive only. The 1,500 backfilled placements keep their
-- existing values; the new columns stay null there (no fabricated actor text
-- or tile class). Enriching historical rows would be a separately authorized
-- backfill.
--
-- GATED: prepared and executable-tested, NOT applied to production.
-- Repeat-safe: guarded DDL throughout; re-running converges.

-- 1. First-class placement evidence columns.
alter table public.game_log_events
  add column if not exists raw_actor_text text;
alter table public.game_log_events
  add column if not exists tile_type_class text;

comment on column public.game_log_events.raw_actor_text is
  'Verbatim actor text from the source line for placement/attribution evidence. Null when the source line names no actor or the row predates this column.';
comment on column public.game_log_events.tile_type_class is
  'Coarse canonical tile class (ocean/city/greenery/special/neutral/unresolved) derived from the upstream tile catalog; tile_type keeps the fine upstream code. Null on rows that predate this column.';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'game_log_events_tile_type_class_check'
      and conrelid = 'public.game_log_events'::regclass
  ) then
    alter table public.game_log_events
      add constraint game_log_events_tile_type_class_check
      check (
        tile_type_class is null
        or tile_type_class in
          ('ocean', 'city', 'greenery', 'special', 'neutral', 'unresolved')
      );
  end if;
end $$;

-- 2. Full placement-action vocabulary (repository past-tense naming).
alter table public.game_log_events
  drop constraint if exists game_log_events_placement_action_check;
alter table public.game_log_events
  add constraint game_log_events_placement_action_check
  check (
    placement_action is null
    or placement_action in (
      'placed', 'removed', 'replaced', 'converted',
      'ownership_changed', 'unresolved'
    )
  );

-- 3. Full ownership-state vocabulary. 'explicit_owner' requires owner ids to
-- be meaningful; every other state carries no fabricated owner.
alter table public.game_log_events
  drop constraint if exists game_log_events_ownership_state_check;
alter table public.game_log_events
  add constraint game_log_events_ownership_state_check
  check (
    ownership_state is null
    or ownership_state in (
      'explicit_owner', 'neutral', 'unowned',
      'unknown', 'not_applicable', 'unresolved'
    )
  );

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'game_log_events_owner_requires_explicit_state'
      and conrelid = 'public.game_log_events'::regclass
  ) then
    alter table public.game_log_events
      add constraint game_log_events_owner_requires_explicit_state
      check (
        (owner_player_id is null and owner_game_player_id is null)
        or ownership_state = 'explicit_owner'
      );
  end if;
end $$;

-- 4. First-class original-source identity on the import row. The values are
-- the SHA-256 and UTF-8 byte length of the ORIGINAL submitted text (before
-- any trimming) and the deterministic parser-run identity
-- '<original sha256>:<parser version>' mirroring the live-capture v2 rerun
-- rule. The server-derived input_sha256 (digest of the stored text) is a
-- separate fact and is not touched.
alter table public.game_log_imports
  add column if not exists original_source_sha256 text;
alter table public.game_log_imports
  add column if not exists original_source_byte_length integer;
alter table public.game_log_imports
  add column if not exists parser_run_identity text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'game_log_imports_original_source_sha256_format'
      and conrelid = 'public.game_log_imports'::regclass
  ) then
    alter table public.game_log_imports
      add constraint game_log_imports_original_source_sha256_format
      check (
        original_source_sha256 is null
        or original_source_sha256 ~ '^[0-9a-f]{64}$'
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'game_log_imports_original_source_byte_length_nonnegative'
      and conrelid = 'public.game_log_imports'::regclass
  ) then
    alter table public.game_log_imports
      add constraint game_log_imports_original_source_byte_length_nonnegative
      check (
        original_source_byte_length is null
        or original_source_byte_length >= 0
      );
  end if;
end $$;

comment on column public.game_log_imports.original_source_sha256 is
  'SHA-256 of the exact original submitted source text (no trimming or normalization). Null on historical imports where the original bytes were never captured.';
comment on column public.game_log_imports.original_source_byte_length is
  'UTF-8 byte length of the exact original submitted source text.';
comment on column public.game_log_imports.parser_run_identity is
  'Deterministic parser-run identity: <original_source_sha256>:<parser_version>, mirroring the live-capture v2 rerun rule.';

-- 5. Deterministic parser-run identity index (diagnostic; reruns of the same
-- source+parser are legitimate and therefore NOT unique).
create index if not exists game_log_imports_parser_run_identity_idx
  on public.game_log_imports (parser_run_identity)
  where parser_run_identity is not null;

-- 6. The replacement RPC persists and validates the completed contract.
--    Body extends the 20260719234500 version with: raw_actor_text,
--    tile_type_class, the widened action/ownership vocabularies, an
--    owner-consistency rule, and the map-independent board-layout format
--    check for placement spaces (per-map semantics stay in the application
--    detection layer, which owns board geometry).
create or replace function public.replace_game_log_events(
  p_game_log_import_id uuid,
  p_events jsonb
)
returns table (
  id uuid,
  event_order integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_events jsonb := coalesce(p_events, '[]'::jsonb);
  v_game_id uuid;
  v_group_id uuid;
  v_map_id uuid;
begin
  if jsonb_typeof(normalized_events) <> 'array' then
    raise exception 'p_events must be a JSON array' using errcode = '22023';
  end if;

  select gli.game_id, g.group_id, g.map_id
  into v_game_id, v_group_id, v_map_id
  from public.game_log_imports gli
  join public.games g on g.id = gli.game_id
  where gli.id = p_game_log_import_id
    and public.can_edit_game(gli.game_id)
  for update of gli;

  if not found then
    raise exception 'The game-log import is unavailable or not editable.'
      using errcode = '42501';
  end if;

  if jsonb_array_length(normalized_events) = 0 then
    return query
    select gle.id, gle.event_order
    from public.game_log_events gle
    where gle.game_log_import_id = p_game_log_import_id
    order by gle.event_order;
    return;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where (event_item ->> 'event_order')::integer < 0
       or event_item ->> 'event_type' not in (
         'award_funded', 'card_bought', 'card_drawn', 'card_hand_initialized',
         'card_hand_snapshot', 'card_played', 'card_returned_to_hand',
         'cards_discarded', 'colony_built', 'colony_setup_added',
         'colony_track_decreased', 'colony_track_increased', 'colony_traded',
         'corporation_selected', 'first_player_selected', 'generation_started',
         'global_parameter_changed', 'milestone_claimed', 'player_identified',
         'prelude_played', 'resource_changed', 'terraforming_rating_changed',
         'terraforming_rating_snapshot', 'tile_placed', 'tile_removed',
         'venus_scale_decreased', 'venus_scale_increased'
       )
       or event_item ->> 'confidence_level' not in ('high', 'medium', 'low')
       or coalesce(nullif(event_item ->> 'review_state', ''), 'not_required')
          not in ('not_required', 'needs_review', 'reviewed', 'rejected')
       or jsonb_typeof(coalesce(event_item -> 'payload', '{}'::jsonb)) <> 'object'
  ) then
    raise exception 'One or more events use an invalid order, type, confidence, review state, or payload.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'placement_action', '') is not null
      and event_item ->> 'placement_action' not in (
        'placed', 'removed', 'replaced', 'converted',
        'ownership_changed', 'unresolved'
      )
  ) then
    raise exception 'One or more events use an unsupported placement action.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'ownership_state', '') is not null
      and event_item ->> 'ownership_state' not in (
        'explicit_owner', 'neutral', 'unowned',
        'unknown', 'not_applicable', 'unresolved'
      )
  ) then
    raise exception 'One or more events use an unsupported ownership state.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'tile_type_class', '') is not null
      and event_item ->> 'tile_type_class' not in (
        'ocean', 'city', 'greenery', 'special', 'neutral', 'unresolved'
      )
  ) then
    raise exception 'One or more events use an unsupported tile class.'
      using errcode = '22023';
  end if;

  -- An owner id is meaningful only with explicit-owner evidence; every other
  -- ownership state must not carry a fabricated owner.
  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where (
        nullif(event_item ->> 'owner_player_id', '') is not null
        or nullif(event_item ->> 'owner_game_player_id', '') is not null
      )
      and coalesce(event_item ->> 'ownership_state', '') <> 'explicit_owner'
  ) then
    raise exception 'Owner identifiers require explicit_owner ownership evidence.'
      using errcode = '23514';
  end if;

  -- Map-independent board-layout contract: a Mars flat-id space is the
  -- two-digit app space id 03..63; a Moon space is m<number>. Which spaces a
  -- specific map reserves remains application-layer knowledge.
  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where event_item ->> 'event_type' in ('tile_placed', 'tile_removed')
      and event_item ->> 'placement_board' = 'mars'
      and nullif(event_item ->> 'board_space', '') is not null
      and (
        event_item ->> 'board_space' !~ '^[0-9]{2}$'
        or (event_item ->> 'board_space')::integer < 3
        or (event_item ->> 'board_space')::integer > 63
      )
  ) then
    raise exception 'A Mars placement uses a space outside the board layout.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where event_item ->> 'event_type' in ('tile_placed', 'tile_removed')
      and event_item ->> 'placement_board' = 'moon'
      and nullif(event_item ->> 'board_space', '') is not null
      and event_item ->> 'board_space' !~ '^m[0-9]{1,2}$'
  ) then
    raise exception 'A Moon placement uses a space outside the board layout.'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from (
      select event_item ->> 'event_order' as event_order
      from jsonb_array_elements(normalized_events) event_item
      group by event_item ->> 'event_order'
      having count(*) > 1
    ) duplicate_order
  ) then
    raise exception 'Event order values must be unique within one import.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from (
      select nullif(event_item ->> 'event_identity', '') as event_identity
      from jsonb_array_elements(normalized_events) event_item
      where nullif(event_item ->> 'event_identity', '') is not null
      group by nullif(event_item ->> 'event_identity', '')
      having count(*) > 1
    ) duplicate_identity
  ) then
    raise exception 'Event identities must be unique within one import.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'player_id', '') is not null
      and not exists (
        select 1
        from public.players p
        where p.id = (event_item ->> 'player_id')::uuid
          and p.group_id = v_group_id
      )
  ) then
    raise exception 'An event player does not belong to the game group.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'game_player_id', '') is not null
      and not exists (
        select 1
        from public.game_players gp
        where gp.id = (event_item ->> 'game_player_id')::uuid
          and gp.game_id = v_game_id
          and (
            nullif(event_item ->> 'player_id', '') is null
            or gp.player_id = (event_item ->> 'player_id')::uuid
          )
      )
  ) then
    raise exception 'An event game-player does not belong to the game.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'owner_player_id', '') is not null
      and not exists (
        select 1
        from public.players p
        where p.id = (event_item ->> 'owner_player_id')::uuid
          and p.group_id = v_group_id
      )
  ) then
    raise exception 'A placement owner does not belong to the game group.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'owner_game_player_id', '') is not null
      and not exists (
        select 1
        from public.game_players gp
        where gp.id = (event_item ->> 'owner_game_player_id')::uuid
          and gp.game_id = v_game_id
          and (
            nullif(event_item ->> 'owner_player_id', '') is null
            or gp.player_id = (event_item ->> 'owner_player_id')::uuid
          )
      )
  ) then
    raise exception 'A placement owner game-player does not belong to the game.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'colony_id', '') is not null
      and not exists (
        select 1
        from public.terraforming_mars_colonies c
        where c.id = event_item ->> 'colony_id'
      )
  ) then
    raise exception 'An event colony does not resolve to the canonical catalogue.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where nullif(event_item ->> 'map_id', '') is not null
      and (event_item ->> 'map_id')::uuid is distinct from v_map_id
  ) then
    raise exception 'An event map does not match the game map.'
      using errcode = '23503';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(normalized_events) event_item
    where event_item ->> 'event_type' in ('tile_placed', 'tile_removed')
      and (
        nullif(event_item ->> 'event_identity', '') is null
        or nullif(event_item ->> 'source_line_number', '') is null
        or nullif(event_item ->> 'source_space_id', '') is null
        or nullif(event_item ->> 'placement_action', '') is null
        or nullif(event_item ->> 'placement_board', '') is null
        or nullif(event_item ->> 'placement_format', '') is null
        or nullif(event_item ->> 'ownership_state', '') is null
      )
  ) then
    raise exception 'Tile events require typed placement identity, coordinates, provenance, and ownership state.'
      using errcode = '23514';
  end if;

  delete from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
    and not exists (
      select 1
      from jsonb_array_elements(normalized_events) event_item
      where (event_item ->> 'event_order')::integer = gle.event_order
    );

  insert into public.game_log_events (
    game_log_import_id, game_player_id, generation_number, event_order,
    event_type, card_id, resource_type, resource_amount, tile_type, board_space,
    confidence_level, review_state, line_classification, raw_line, payload,
    player_id, colony_id, event_identity, parameter_steps, parameter_before,
    parameter_after, source_entity, parser_version, event_provenance, map_id,
    placement_action, placement_board, placement_format, source_space_id,
    board_row, board_position, source_line_number, ownership_state,
    owner_player_id, owner_game_player_id, raw_actor_text, tile_type_class
  )
  select
    p_game_log_import_id,
    nullif(event_item ->> 'game_player_id', '')::uuid,
    nullif(event_item ->> 'generation_number', '')::integer,
    (event_item ->> 'event_order')::integer,
    event_item ->> 'event_type',
    nullif(event_item ->> 'card_id', '')::uuid,
    nullif(event_item ->> 'resource_type', ''),
    nullif(event_item ->> 'resource_amount', '')::integer,
    nullif(event_item ->> 'tile_type', ''),
    nullif(event_item ->> 'board_space', ''),
    event_item ->> 'confidence_level',
    coalesce(nullif(event_item ->> 'review_state', ''), 'not_required'),
    nullif(event_item ->> 'line_classification', ''),
    event_item ->> 'raw_line',
    coalesce(event_item -> 'payload', '{}'::jsonb),
    nullif(event_item ->> 'player_id', '')::uuid,
    nullif(event_item ->> 'colony_id', ''),
    nullif(event_item ->> 'event_identity', ''),
    nullif(event_item ->> 'parameter_steps', '')::smallint,
    nullif(event_item ->> 'parameter_before', '')::smallint,
    nullif(event_item ->> 'parameter_after', '')::smallint,
    nullif(event_item ->> 'source_entity', ''),
    nullif(event_item ->> 'parser_version', ''),
    nullif(event_item ->> 'event_provenance', ''),
    coalesce(nullif(event_item ->> 'map_id', '')::uuid, v_map_id),
    nullif(event_item ->> 'placement_action', ''),
    nullif(event_item ->> 'placement_board', ''),
    nullif(event_item ->> 'placement_format', ''),
    nullif(event_item ->> 'source_space_id', ''),
    nullif(event_item ->> 'board_row', '')::smallint,
    nullif(event_item ->> 'board_position', '')::smallint,
    nullif(event_item ->> 'source_line_number', '')::integer,
    nullif(event_item ->> 'ownership_state', ''),
    nullif(event_item ->> 'owner_player_id', '')::uuid,
    nullif(event_item ->> 'owner_game_player_id', '')::uuid,
    nullif(event_item ->> 'raw_actor_text', ''),
    nullif(event_item ->> 'tile_type_class', '')
  from jsonb_array_elements(normalized_events) event_item
  on conflict on constraint game_log_events_import_order_unique do update
  set
    game_player_id = excluded.game_player_id,
    generation_number = excluded.generation_number,
    event_type = excluded.event_type,
    card_id = excluded.card_id,
    resource_type = excluded.resource_type,
    resource_amount = excluded.resource_amount,
    tile_type = excluded.tile_type,
    board_space = excluded.board_space,
    confidence_level = excluded.confidence_level,
    review_state = excluded.review_state,
    line_classification = excluded.line_classification,
    raw_line = excluded.raw_line,
    payload = excluded.payload,
    player_id = excluded.player_id,
    colony_id = excluded.colony_id,
    event_identity = excluded.event_identity,
    parameter_steps = excluded.parameter_steps,
    parameter_before = excluded.parameter_before,
    parameter_after = excluded.parameter_after,
    source_entity = excluded.source_entity,
    parser_version = excluded.parser_version,
    event_provenance = excluded.event_provenance,
    map_id = excluded.map_id,
    placement_action = excluded.placement_action,
    placement_board = excluded.placement_board,
    placement_format = excluded.placement_format,
    source_space_id = excluded.source_space_id,
    board_row = excluded.board_row,
    board_position = excluded.board_position,
    source_line_number = excluded.source_line_number,
    ownership_state = excluded.ownership_state,
    owner_player_id = excluded.owner_player_id,
    owner_game_player_id = excluded.owner_game_player_id,
    raw_actor_text = excluded.raw_actor_text,
    tile_type_class = excluded.tile_type_class;

  return query
  select gle.id, gle.event_order
  from public.game_log_events gle
  where gle.game_log_import_id = p_game_log_import_id
  order by gle.event_order;
end;
$$;

revoke execute on function public.replace_game_log_events(uuid, jsonb) from public;
revoke execute on function public.replace_game_log_events(uuid, jsonb) from anon;
grant execute on function public.replace_game_log_events(uuid, jsonb) to authenticated;
grant execute on function public.replace_game_log_events(uuid, jsonb) to service_role;
