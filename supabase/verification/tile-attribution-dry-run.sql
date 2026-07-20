-- Read-only production dry run for canonical tile-event attribution backfill.
--
-- Scope: historical `game_log_events` placement rows that carry actor evidence
-- but no `player_id` / `game_player_id`, because they were persisted at import
-- time before the game's `game_players` rows existed and nothing re-attributed
-- them at finalization.
--
-- Evidence basis. These three imports store NO
-- `confidence_summary.player_identity_resolutions`, so the finalization-time
-- resolution map is unavailable for them. The only exact evidence is
-- `payload->>'actor'` compared against the participants of that same game.
-- Attribution is therefore accepted ONLY when the actor text resolves to
-- exactly one distinct same-game participant. Ambiguous and unmatched rows are
-- left unattributed by design; they are never guessed from nearby events.
--
-- ORDERING CONSTRAINT — read before scheduling.
-- Two rows (game 46bde90c…, actor "Jenna") resolve solely through
-- `players.display_name`, because that player is the remaining unlinked guest
-- and has no alias, username, or private personal-name evidence. Re-neutralizing
-- that guest's `display_name` BEFORE this backfill destroys the only evidence
-- and makes those rows permanently unattributable. This backfill MUST run
-- before guest re-neutralization. Once written, the attribution is durable and
-- no longer depends on `display_name`.
--
-- Run this whole file. Every stopping condition is asserted at the end.

begin read only;

create temporary table tile_attribution_candidates on commit drop as
with unattributed as (
  select
    e.id                              as event_id,
    e.game_log_import_id,
    i.game_id,
    btrim(e.payload->>'actor')        as actor_text
  from public.game_log_events e
  join public.game_log_imports i on i.id = e.game_log_import_id
  where e.event_type in ('tile_placed', 'tile_removed')
    and e.player_id is null
    and e.game_player_id is null
    and btrim(coalesce(e.payload->>'actor', '')) <> ''
),
-- SAME-GAME ENFORCEMENT: candidates are drawn only from the participants of
-- the game the event's own import belongs to.
participant_match as (
  select
    u.event_id,
    u.game_id,
    u.game_log_import_id,
    u.actor_text,
    gp.id        as game_player_id,
    gp.player_id
  from unattributed u
  join public.game_players gp on gp.game_id = u.game_id
  join public.players p       on p.id = gp.player_id
  where lower(btrim(p.display_name)) = lower(u.actor_text)
     or lower(split_part(btrim(p.display_name), ' ', 1)) = lower(u.actor_text)
)
select
  u.event_id,
  u.game_id,
  u.game_log_import_id,
  u.actor_text,
  count(distinct m.player_id)      as distinct_players,
  count(distinct m.game_player_id) as distinct_game_players,
  min(m.player_id)                 as resolved_player_id,
  min(m.game_player_id)            as resolved_game_player_id
from unattributed u
left join participant_match m on m.event_id = u.event_id
group by u.event_id, u.game_id, u.game_log_import_id, u.actor_text;

-- 1. Disposition summary. Only `BACKFILL` rows are written.
select
  case
    when distinct_players = 1 and distinct_game_players = 1 then 'BACKFILL'
    when distinct_players = 0 then 'EXCLUDE_no_participant_match'
    else 'EXCLUDE_ambiguous_actor'
  end as disposition,
  count(*) as event_rows
from tile_attribution_candidates
group by 1
order by 1;

-- 2. Per-game and per-actor counts for the rows that would change.
select
  game_id,
  game_log_import_id as import_id,
  actor_text,
  count(*) as would_change_rows
from tile_attribution_candidates
where distinct_players = 1 and distinct_game_players = 1
group by game_id, game_log_import_id, actor_text
order by game_id, would_change_rows desc;

-- 3. Per-game totals.
select game_id, count(*) as would_change_rows
from tile_attribution_candidates
where distinct_players = 1 and distinct_game_players = 1
group by game_id
order by would_change_rows desc;

-- 4. Full listing of every excluded row, so exclusions are reviewable rather
--    than silently dropped.
select event_id, game_id, actor_text, distinct_players, distinct_game_players
from tile_attribution_candidates
where not (distinct_players = 1 and distinct_game_players = 1)
order by game_id, actor_text;

-- 5. Stopping conditions. Any failure here blocks the write package.
do $$
declare
  v_total    integer;
  v_backfill integer;
  v_excluded integer;
  v_games    integer;
  v_imports  integer;
begin
  select count(*),
         count(*) filter (where distinct_players = 1 and distinct_game_players = 1),
         count(*) filter (where not (distinct_players = 1 and distinct_game_players = 1)),
         count(distinct game_id),
         count(distinct game_log_import_id)
    into v_total, v_backfill, v_excluded, v_games, v_imports
  from tile_attribution_candidates;

  raise notice 'candidates=% backfill=% excluded=% games=% imports=%',
    v_total, v_backfill, v_excluded, v_games, v_imports;

  -- Pinned expectations measured read-only on 2026-07-20 against production.
  -- Drift means the population moved; re-review before writing.
  if v_total <> 114 then
    raise exception 'EXPECTATION DRIFT: candidate rows % (expected 114)', v_total;
  end if;
  if v_backfill <> 114 then
    raise exception 'EXPECTATION DRIFT: backfill rows % (expected 114)', v_backfill;
  end if;
  if v_excluded <> 0 then
    raise exception 'EXPECTATION DRIFT: excluded rows % (expected 0)', v_excluded;
  end if;
  if v_games <> 3 then
    raise exception 'EXPECTATION DRIFT: games % (expected 3)', v_games;
  end if;
  if v_imports <> 3 then
    raise exception 'EXPECTATION DRIFT: imports % (expected 3)', v_imports;
  end if;

  raise notice 'DRY RUN OK — 114 rows across 3 games / 3 imports, 0 excluded.';
end
$$;

rollback;
