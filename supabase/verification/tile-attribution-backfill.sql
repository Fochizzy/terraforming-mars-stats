-- Separately gated mutating command for canonical tile-event attribution.
--
-- Do NOT execute without: recorded owner approval, a successful run of
-- `tile-attribution-dry-run.sql` in the same session window, and confirmation
-- that guest re-neutralization has NOT yet run (see the ordering constraint in
-- the dry run — two rows depend on the unlinked guest's `display_name`).
--
-- Writes `player_id` and `game_player_id` only. Ownership columns
-- (`owner_player_id` / `owner_game_player_id`) are deliberately untouched:
-- they are ownership-state evidence, not actor attribution.
--
-- The whole file is one transaction. It self-aborts on any drift.

begin;

-- 1. Immutable pre-write snapshot for rollback.
create table if not exists private.mig_backup_tile_attribution_20260720 (
  event_id             uuid primary key,
  prior_player_id      uuid,
  prior_game_player_id uuid,
  game_id              uuid not null,
  actor_text           text not null,
  captured_at          timestamptz not null default now()
);

create temporary table tile_attribution_resolved on commit drop as
with unattributed as (
  select e.id as event_id, e.game_log_import_id, i.game_id,
         btrim(e.payload->>'actor') as actor_text
  from public.game_log_events e
  join public.game_log_imports i on i.id = e.game_log_import_id
  where e.event_type in ('tile_placed', 'tile_removed')
    and e.player_id is null
    and e.game_player_id is null
    and btrim(coalesce(e.payload->>'actor', '')) <> ''
),
participant_match as (
  select u.event_id, gp.id as game_player_id, gp.player_id
  from unattributed u
  join public.game_players gp on gp.game_id = u.game_id   -- same-game only
  join public.players p       on p.id = gp.player_id
  where lower(btrim(p.display_name)) = lower(u.actor_text)
     or lower(split_part(btrim(p.display_name), ' ', 1)) = lower(u.actor_text)
)
select
  u.event_id,
  u.game_id,
  u.actor_text,
  min(m.player_id)      as resolved_player_id,
  min(m.game_player_id) as resolved_game_player_id
from unattributed u
join participant_match m on m.event_id = u.event_id
group by u.event_id, u.game_id, u.actor_text
having count(distinct m.player_id) = 1
   and count(distinct m.game_player_id) = 1;

-- 2. Abort unless the resolved population matches the reviewed dry run exactly.
do $$
declare v_rows integer;
begin
  select count(*) into v_rows from tile_attribution_resolved;
  if v_rows <> 114 then
    raise exception 'ABORT: resolved rows % (dry run reviewed 114)', v_rows;
  end if;
end
$$;

-- 3. Capture prior state (idempotent: only rows not already snapshotted).
insert into private.mig_backup_tile_attribution_20260720
  (event_id, prior_player_id, prior_game_player_id, game_id, actor_text)
select r.event_id, e.player_id, e.game_player_id, r.game_id, r.actor_text
from tile_attribution_resolved r
join public.game_log_events e on e.id = r.event_id
on conflict (event_id) do nothing;

-- 4. The write.
with changed as (
  update public.game_log_events e
  set player_id      = r.resolved_player_id,
      game_player_id = r.resolved_game_player_id
  from tile_attribution_resolved r
  where e.id = r.event_id
    and e.player_id is null          -- idempotency guard
    and e.game_player_id is null
  returning e.id
)
select count(*) as changed_rows from changed;

-- 5. Post-write verification, inside the same transaction.
do $$
declare
  v_remaining        integer;
  v_written          integer;
  v_cross_game       integer;
begin
  -- 5a. No candidate row remains unattributed.
  select count(*) into v_remaining
  from public.game_log_events e
  join public.game_log_imports i on i.id = e.game_log_import_id
  where e.event_type in ('tile_placed', 'tile_removed')
    and e.player_id is null
    and e.game_player_id is null
    and btrim(coalesce(e.payload->>'actor', '')) <> '';
  if v_remaining <> 0 then
    raise exception 'VERIFY FAILED: % candidate rows still unattributed', v_remaining;
  end if;

  -- 5b. Exactly the snapshotted rows are now attributed.
  select count(*) into v_written
  from public.game_log_events e
  join private.mig_backup_tile_attribution_20260720 b on b.event_id = e.id
  where e.player_id is not null and e.game_player_id is not null;
  if v_written <> 114 then
    raise exception 'VERIFY FAILED: % rows written (expected 114)', v_written;
  end if;

  -- 5c. Every written attribution points at a participant of that same game.
  select count(*) into v_cross_game
  from public.game_log_events e
  join private.mig_backup_tile_attribution_20260720 b on b.event_id = e.id
  join public.game_log_imports i on i.id = e.game_log_import_id
  left join public.game_players gp
         on gp.id = e.game_player_id
        and gp.game_id = i.game_id
        and gp.player_id = e.player_id
  where gp.id is null;
  if v_cross_game <> 0 then
    raise exception 'VERIFY FAILED: % rows attributed outside their own game', v_cross_game;
  end if;

  raise notice 'POST-WRITE OK — 114 rows attributed, 0 remaining, 0 cross-game.';
end
$$;

commit;

-- 6. SECOND-RUN ZERO-CHANGE VERIFICATION.
--    Re-run this entire file. Step 2 must abort with
--      'ABORT: resolved rows 0 (dry run reviewed 114)'
--    because the `player_id is null` predicate no longer matches any row.
--    That abort IS the expected idempotency result: the transaction rolls back
--    and nothing changes. Any other outcome means the write was not idempotent.
