-- Rollback for the canonical tile-event attribution backfill.
--
-- Restores `player_id` / `game_player_id` on every event the backfill wrote,
-- using the immutable pre-write snapshot
-- `private.mig_backup_tile_attribution_20260720`.
--
-- Safe to run only while that snapshot table still exists. It restores the
-- exact prior values (both were NULL for all 114 rows at capture time), so the
-- rollback returns the rows to unattributed rather than to a guessed state.
--
-- Run the whole file. It self-aborts if the snapshot is missing or partial.

begin;

do $$
declare v_snapshot integer;
begin
  if to_regclass('private.mig_backup_tile_attribution_20260720') is null then
    raise exception 'ABORT: snapshot table missing — cannot roll back safely';
  end if;

  select count(*) into v_snapshot
  from private.mig_backup_tile_attribution_20260720;
  if v_snapshot <> 114 then
    raise exception 'ABORT: snapshot holds % rows (expected 114)', v_snapshot;
  end if;
end
$$;

with restored as (
  update public.game_log_events e
  set player_id      = b.prior_player_id,
      game_player_id = b.prior_game_player_id
  from private.mig_backup_tile_attribution_20260720 b
  where e.id = b.event_id
    and (e.player_id      is distinct from b.prior_player_id
      or e.game_player_id is distinct from b.prior_game_player_id)
  returning e.id
)
select count(*) as restored_rows from restored;

-- Verification: every snapshotted row again matches its captured prior state.
do $$
declare v_mismatch integer;
begin
  select count(*) into v_mismatch
  from public.game_log_events e
  join private.mig_backup_tile_attribution_20260720 b on b.event_id = e.id
  where e.player_id      is distinct from b.prior_player_id
     or e.game_player_id is distinct from b.prior_game_player_id;
  if v_mismatch <> 0 then
    raise exception 'ROLLBACK VERIFY FAILED: % rows do not match snapshot', v_mismatch;
  end if;
  raise notice 'ROLLBACK OK — 114 rows restored to captured prior state.';
end
$$;

commit;

-- The snapshot table is retained deliberately. Drop it only after the
-- attribution outcome is accepted and recorded in DEPLOY-STATE.md.
