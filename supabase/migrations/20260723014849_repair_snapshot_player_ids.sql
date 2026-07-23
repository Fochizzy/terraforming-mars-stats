-- Repair `game_revisions.snapshot` documents that still name player rows their
-- game no longer has.
--
-- A revision snapshot is frozen at save time. Later roster work — the group
-- collapse/split of 2026-07-20, and the guest cleanup that deleted an import's
-- placeholder rows the same day — rewrote `game_players` but left the snapshots
-- pointing at superseded ids. Thirteen finalized games are affected. The
-- visible symptom was the saved-games list rendering a raw uuid where a player
-- name belongs, but those same stale ids are what "Correct Players" reloads,
-- so the documents themselves have to be corrected.
--
-- `game_players` is the authority: it is deleted and re-inserted on every
-- finalize, so it always describes the game as it stands. Each snapshot player
-- is matched to its `game_players` row on the six score fields both sides
-- carry (total, TR, megacredits, cities, greenery, card points). That match is
-- asserted to be one-to-one, injective, and roster-complete before anything is
-- written — this migration raises rather than guessing.
--
-- Scores, placements, and every analytics view are untouched: they read
-- `game_players`, which was already correct. Only the ids inside the snapshot
-- documents change.
--
-- Applied to production 2026-07-23 as ledger version 20260723014849, after a
-- `begin … rollback` rehearsal against the live schema: 33 ids across 13 games,
-- 16 revisions backed up to `private.mig_backup_snapshot_player_ids_20260722`,
-- with the correction map kept at `private.mig_snapshot_player_remap_20260722`.

-- The correction map, derived from each game's most recent revision. Kept as a
-- permanent record of exactly which id became which.
create table if not exists private.mig_snapshot_player_remap_20260722 as
with latest as (
  select distinct on (r.game_id) r.game_id, r.snapshot
  from public.game_revisions r
  order by r.game_id, r.created_at desc
), snapshot_scores as (
  select l.game_id,
         kv.key as snapshot_player_id,
         (kv.value->>'totalPoints')::int as total_points,
         (kv.value->>'trPoints')::int as tr_points,
         (kv.value->>'finalMegacredits')::int as final_megacredits,
         (kv.value->>'citiesPoints')::int as cities_points,
         (kv.value->>'greeneryPoints')::int as greenery_points,
         (kv.value->>'cardPointsTotal')::int as card_points_total
  from latest l, jsonb_each(l.snapshot->'playerScores') kv
  where jsonb_typeof(l.snapshot->'playerScores') = 'object'
), affected as (
  -- A game is affected when any snapshot player is not one of its participants.
  select distinct s.game_id
  from snapshot_scores s
  left join public.game_players gp
    on gp.game_id = s.game_id and gp.player_id::text = s.snapshot_player_id
  where gp.player_id is null
)
select s.game_id,
       s.snapshot_player_id,
       min(gp.player_id::text) as game_player_id,
       count(gp.player_id) as candidate_count
from snapshot_scores s
join affected a on a.game_id = s.game_id
left join public.game_players gp
  on gp.game_id = s.game_id
 and gp.total_points = s.total_points
 and gp.tr_points = s.tr_points
 and gp.final_megacredits = s.final_megacredits
 and gp.cities_points = s.cities_points
 and gp.greenery_points = s.greenery_points
 and gp.card_points_total = s.card_points_total
group by s.game_id, s.snapshot_player_id;

-- Every revision of every affected game, exactly as it stands before the fix.
create table if not exists private.mig_backup_snapshot_player_ids_20260722 as
select r.id as revision_id,
       r.game_id,
       r.created_at,
       r.snapshot,
       now() as backed_up_at
from public.game_revisions r
where r.game_id in (
  select game_id from private.mig_snapshot_player_remap_20260722
);

do $$
declare
  ambiguous_count int;
  collision_count int;
  incomplete_count int;
  chained_count int;
  remap_count int;
  game_count int;
  revision_count int;
begin
  -- Every snapshot player must match exactly one participant.
  select count(*) into ambiguous_count
  from private.mig_snapshot_player_remap_20260722
  where candidate_count <> 1;

  if ambiguous_count > 0 then
    raise exception
      'snapshot player remap is not one-to-one: % entries matched other than 1 participant',
      ambiguous_count;
  end if;

  -- ...and no two snapshot players may claim the same participant.
  select count(*) into collision_count
  from (
    select game_id, game_player_id
    from private.mig_snapshot_player_remap_20260722
    group by game_id, game_player_id
    having count(*) > 1
  ) collisions;

  if collision_count > 0 then
    raise exception
      'snapshot player remap is not injective: % participants claimed twice',
      collision_count;
  end if;

  -- ...and the whole roster must be accounted for, so no participant is lost.
  select count(*) into incomplete_count
  from (
    select m.game_id
    from private.mig_snapshot_player_remap_20260722 m
    group by m.game_id
    having count(*) <> (
      select count(*) from public.game_players gp where gp.game_id = m.game_id
    )
  ) incomplete;

  if incomplete_count > 0 then
    raise exception
      'snapshot player remap does not cover the full roster for % game(s)',
      incomplete_count;
  end if;

  -- A target id must never also be a source id in the same game, or one
  -- substitution could feed the next. The rewrite below is sentinel-guarded
  -- regardless; this asserts the premise anyway.
  select count(*) into chained_count
  from private.mig_snapshot_player_remap_20260722 target
  join private.mig_snapshot_player_remap_20260722 source
    on source.game_id = target.game_id
   and source.snapshot_player_id = target.game_player_id;

  if chained_count > 0 then
    raise exception 'snapshot player remap chains: % overlapping id(s)', chained_count;
  end if;

  select count(*), count(distinct game_id)
    into remap_count, game_count
  from private.mig_snapshot_player_remap_20260722;

  select count(*) into revision_count
  from private.mig_backup_snapshot_player_ids_20260722;

  raise notice
    'remapping % player id(s) across % game(s); % revision(s) backed up',
    remap_count, game_count, revision_count;
end;
$$;

-- Rewrite every revision of an affected game, not just the latest: the older
-- ones are what `getSavedGameForm` falls back to when the newest no longer
-- parses, and a superseded player id is not worth preserving as history.
--
-- One statement per mapped id so the substitutions accumulate — a single
-- `update ... from` would apply only one matching map row per revision — and
-- each new id is parked behind a sentinel so it can never be re-matched by a
-- later substitution within the same document.
do $$
declare
  mapping record;
begin
  for mapping in
    select game_id, snapshot_player_id, game_player_id
    from private.mig_snapshot_player_remap_20260722
  loop
    update public.game_revisions r
    set snapshot = replace(
          r.snapshot::text,
          mapping.snapshot_player_id,
          'REMAPPED:' || mapping.game_player_id
        )::jsonb
    where r.game_id = mapping.game_id;
  end loop;

  update public.game_revisions r
  set snapshot = replace(r.snapshot::text, 'REMAPPED:', '')::jsonb
  where r.game_id in (
    select game_id from private.mig_snapshot_player_remap_20260722
  );
end;
$$;

do $$
declare
  leftover_count int;
  sentinel_count int;
begin
  -- No revision of a repaired game may still name a non-participant.
  select count(distinct r.game_id) into leftover_count
  from public.game_revisions r
  cross join lateral jsonb_each(r.snapshot->'playerScores') kv
  left join public.game_players gp
    on gp.game_id = r.game_id and gp.player_id::text = kv.key
  where r.game_id in (
    select game_id from private.mig_snapshot_player_remap_20260722
  )
    and jsonb_typeof(r.snapshot->'playerScores') = 'object'
    and gp.player_id is null;

  if leftover_count > 0 then
    raise exception
      'snapshot repair incomplete: % game(s) still name a non-participant',
      leftover_count;
  end if;

  select count(*) into sentinel_count
  from public.game_revisions r
  where r.snapshot::text like '%REMAPPED:%';

  if sentinel_count > 0 then
    raise exception 'snapshot repair left % sentinel value(s) behind', sentinel_count;
  end if;
end;
$$;
