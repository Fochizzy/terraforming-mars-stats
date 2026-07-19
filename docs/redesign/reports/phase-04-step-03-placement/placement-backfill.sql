-- Phase 4 Step 4.3 canonical placement backfill — exact production statement.
-- Applied once to project qjtwgrjjwnqafbvkkfex on 2026-07-19 after migration
-- 20260718212340 (harden_game_log_event_contract) added the typed columns and
-- NOT VALID constraints. Self-verifying: it rolls back unless it updates exactly
-- 1500 tile events with 1467 player/game-player attributions and 100/1400
-- grid/flat placements. Idempotent: re-running derives identical values.
--
-- Player/game-player resolution is alias-only (public.player_import_aliases),
-- which stays correct after the privacy migration neutralized unlinked
-- players.display_name. The 33 unresolved placements remain null.

do $$
declare v_updated int; v_players int; v_gplayers int; v_grid int; v_flat int;
begin
  with base as (
    select gle.id as event_id, gle.event_order, gle.event_type, gle.board_space, gle.tile_type, gle.raw_line,
      g.map_id, g.group_id, g.id as game_id,
      case when gle.board_space like 'm%' then 'moon' else 'mars' end as board,
      case when gle.event_type='tile_placed' then 'placed' else 'removed' end as action,
      case when gle.raw_line ~ 'on row [0-9]+ position [0-9]+' then 'grid' else 'flat-id' end as fmt,
      (regexp_match(gle.raw_line,'on row ([0-9]+) position ([0-9]+)'))[1]::smallint as row_num,
      (regexp_match(gle.raw_line,'on row ([0-9]+) position ([0-9]+)'))[2]::smallint as pos_num,
      case when gle.raw_line ~ 'on row [0-9]+ position [0-9]+'
        then (regexp_match(gle.raw_line,'on row ([0-9]+) position ([0-9]+)'))[1]||':'||(regexp_match(gle.raw_line,'on row ([0-9]+) position ([0-9]+)'))[2]
        else gle.board_space end as src_space_id,
      'tile:'||gle.event_order||':'||(case when gle.event_type='tile_placed' then 'placed' else 'removed' end)||':'||(case when gle.board_space like 'm%' then 'moon' else 'mars' end)||':'||lower(gle.board_space)||':'||coalesce(nullif(btrim(regexp_replace(lower(coalesce(gle.tile_type,'')),'[^a-z0-9]+','_','g'),'_'),''),'unknown') as event_identity,
      btrim(regexp_replace(lower(coalesce(gle.payload->>'actor','')),'[^a-z0-9]+',' ','g')) as norm_actor
    from public.game_log_events gle
    join public.game_log_imports gli on gli.id=gle.game_log_import_id
    join public.games g on g.id=gli.game_id
    where gle.event_type in ('tile_placed','tile_removed')
  ),
  resolved as (
    select b.*, r.player_id, r.game_player_id
    from base b
    left join lateral (
      select case when count(distinct gp.player_id)=1 then (array_agg(distinct gp.player_id))[1] end as player_id,
             case when count(distinct gp.player_id)=1 then (array_agg(distinct gp.id))[1] end as game_player_id
      from public.game_players gp
      join public.player_import_aliases pia on pia.player_id=gp.player_id and pia.group_id=b.group_id
      where gp.game_id=b.game_id and pia.normalized_alias=b.norm_actor
    ) r on true
  )
  update public.game_log_events gle set
    map_id=resolved.map_id,
    placement_action=resolved.action,
    placement_board=resolved.board,
    placement_format=resolved.fmt,
    source_space_id=resolved.src_space_id,
    board_row=resolved.row_num,
    board_position=resolved.pos_num,
    source_line_number=gle.event_order,
    ownership_state='unknown',
    event_identity=resolved.event_identity,
    player_id=resolved.player_id,
    game_player_id=resolved.game_player_id
  from resolved where resolved.event_id=gle.id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1500 then raise exception 'STOP: expected 1500 updated tile events, got %', v_updated; end if;

  select count(*) filter (where player_id is not null),
         count(*) filter (where game_player_id is not null),
         count(*) filter (where placement_format='grid'),
         count(*) filter (where placement_format='flat-id')
  into v_players, v_gplayers, v_grid, v_flat
  from public.game_log_events where event_type in ('tile_placed','tile_removed');

  if v_players <> 1467 then raise exception 'STOP: expected 1467 player attributions, got %', v_players; end if;
  if v_gplayers <> 1467 then raise exception 'STOP: expected 1467 game-player attributions, got %', v_gplayers; end if;
  if v_grid <> 100 or v_flat <> 1400 then raise exception 'STOP: expected 100 grid / 1400 flat, got % / %', v_grid, v_flat; end if;
end $$;

-- After the backfill matches the preflight, validate the pending constraints.
alter table public.game_log_events validate constraint game_log_events_typed_placement_required;
alter table public.game_log_events validate constraint game_log_events_expansion_identity_required;
alter table public.game_log_events validate constraint game_log_events_colony_id_fk;
