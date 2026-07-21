-- Disposable verification schema: the exact columns/constraints the
-- candidate migration reads and writes, plus faithful-but-simplified stubs
-- for the pre-existing, unmodified production functions it calls
-- (refresh_game_metric_snapshots_internal, rebuild_metric_summaries, and —
-- new this round — rebuild_metric_summaries_base /
-- rebuild_additional_metric_summaries, added so the migration's own
-- neutralize/restore of rebuild_metric_summaries() has something real to
-- delegate to, exactly as it does in production). Everything unrelated to
-- the tag/total_tag_count columns and the rebuild-cascade shape this
-- correction touches (map/corporation/style/generation global summaries,
-- scoring shares, etc.) is intentionally represented only as marker
-- inserts, not full aggregation logic — documented as a limitation below.

create schema if not exists public;

-- Minimal Supabase-shaped roles so the migration's own `revoke ... from
-- public, anon` statement has real roles to target, matching production
-- (anon/authenticated/service_role always exist there). Roles, unlike
-- tables, are cluster-global, so guard against a stale prior run on the
-- same disposable cluster.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end
$$;

create table public.groups (
  id uuid primary key
);

create table public.players (
  id uuid primary key,
  group_id uuid not null references public.groups(id),
  display_name text not null,
  normalized_display_name text not null
);

create table public.games (
  id uuid primary key,
  group_id uuid not null references public.groups(id),
  status text not null check (status in ('draft', 'finalized')),
  player_count integer not null default 1,
  generation_count integer not null default 1
);

create table public.game_players (
  id uuid primary key,
  game_id uuid not null references public.games(id),
  player_id uuid not null references public.players(id),
  placement integer not null default 1,
  is_winner boolean not null default false,
  total_points integer not null default 0
);

create table public.game_log_imports (
  id uuid primary key,
  game_id uuid not null references public.games(id)
);

create table public.game_log_tag_summaries (
  id uuid primary key default gen_random_uuid(),
  game_log_import_id uuid not null references public.game_log_imports(id) on delete cascade,
  game_player_id uuid references public.game_players(id) on delete set null,
  player_name text not null,
  normalized_player_name text not null,
  tag_code text not null,
  tag_count integer not null default 0,
  played_card_count integer not null default 0,
  matched_card_count integer not null default 0,
  unresolved_card_count integer not null default 0,
  total_tag_count integer not null default 0,
  tag_evidence_coverage numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_log_import_id, normalized_player_name, tag_code),
  check (tag_count >= 0),
  check (total_tag_count >= 0)
);

create table public.player_import_aliases (
  player_id uuid not null references public.players(id),
  group_id uuid not null references public.groups(id),
  source_type text not null,
  normalized_alias text not null
);

create table public.game_player_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  played_card_count integer not null default 0 check (played_card_count >= 0),
  matched_played_card_count integer not null default 0 check (matched_played_card_count >= 0),
  unresolved_played_card_count integer not null default 0 check (unresolved_played_card_count >= 0),
  total_tag_count integer not null default 0 check (total_tag_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_player_id)
);

create table public.game_player_tag_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  tag_code text not null,
  tag_count integer not null check (tag_count >= 0),
  total_tag_count integer not null check (total_tag_count >= 0),
  played_card_count integer not null check (played_card_count >= 0),
  matched_card_count integer not null check (matched_card_count >= 0),
  unresolved_card_count integer not null check (unresolved_card_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_player_id, tag_code)
);

-- Milestone/award source (claim) and snapshot tables -- added this round so
-- all four per-game snapshot tables refresh_game_metric_snapshots_internal
-- actually writes in production (game_player_metric_snapshots,
-- game_player_tag_metric_snapshots, game_milestone_metric_snapshots,
-- game_award_metric_snapshots) are represented here, not just the first
-- two. Columns are a deliberately reduced subset of production's real
-- columns -- just enough to prove delete+reinsert-per-game behavior and
-- "unrelated games/tables untouched" -- not a full reimplementation of
-- production's milestone/award snapshot logic (timing buckets, ROI, etc.),
-- which this correction's target predicate never depends on.
create table public.milestones (
  id uuid primary key,
  code text not null
);

create table public.awards (
  id uuid primary key,
  code text not null
);

create table public.game_milestones (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id),
  winner_game_player_id uuid not null references public.game_players(id)
);

create table public.game_awards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  award_id uuid not null references public.awards(id),
  place integer not null,
  funded_by_game_player_id uuid not null references public.game_players(id),
  winner_game_player_id uuid not null references public.game_players(id)
);

create table public.game_milestone_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_milestone_id uuid not null references public.game_milestones(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id),
  winner_game_player_id uuid not null references public.game_players(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_milestone_id)
);

create table public.game_award_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  game_award_id uuid not null references public.game_awards(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  award_id uuid not null references public.awards(id),
  funded_by_game_player_id uuid not null references public.game_players(id),
  winner_game_player_id uuid not null references public.game_players(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_award_id)
);

-- A marker table standing in for "did the rebuild cascade run, and which
-- part." `kind` distinguishes rebuild_metric_summaries_base() from
-- rebuild_additional_metric_summaries() so the harness can assert both real
-- sub-rebuilds happened, and assert the exact count -- not just "some
-- rebuild happened at least once" -- across the whole migration run,
-- including however many games were in the per-game loop.
create table public._rebuild_marker (
  kind text not null check (kind in ('base', 'additional')),
  called_at timestamptz not null default clock_timestamp()
);

-- Verbatim from 20260708142459_add_persisted_metric_snapshots.sql.
create or replace function public.metric_normalized_label(p_label text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(regexp_replace(lower(coalesce(p_label, '')), '[^a-z0-9]+', ' ', 'g')),
    ''
  );
$$;

-- Stubs standing in for the two functions rebuild_metric_summaries()
-- delegates to in production. Each records a marker row instead of
-- reimplementing the real global-aggregate SQL (out of scope for this
-- correction, and untouched by it) -- the point of these stubs is to give
-- the migration's own restored rebuild_metric_summaries() body something
-- real to call, so the harness proves the exact call count of the real
-- cascade shape, not a flattened stand-in for it.
create or replace function public.rebuild_metric_summaries_base()
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public._rebuild_marker (kind) values ('base');
end;
$$;

create or replace function public.rebuild_additional_metric_summaries()
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public._rebuild_marker (kind) values ('additional');
end;
$$;

-- Baseline (pre-correction) production body, reproduced verbatim from
-- pg_get_functiondef('public.rebuild_metric_summaries') read directly
-- against the live tm-stats database for this correction -- not a
-- reimplementation. This is what exists before the candidate migration
-- runs; the migration's own neutralize/restore steps operate on this same
-- function during its run and must leave it back in exactly this state by
-- the time the migration's transaction commits.
create or replace function public.rebuild_metric_summaries()
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if to_regprocedure('public.rebuild_metric_summaries_base()') is null then
    raise exception 'rebuild_metric_summaries_base() is required before rebuilding metric summaries'
      using errcode = '42883';
  end if;

  perform public.rebuild_metric_summaries_base();
  perform public.rebuild_additional_metric_summaries();
end;
$$;

-- Match production's real ACL exactly: owner-only execute, no
-- authenticated/anon/PUBLIC grant. Confirmed against the live database via
-- pg_proc.proacl for this correction (`{postgres=X/postgres}`); reproduced
-- here so the migration's defense-in-depth `revoke ... from public, anon`
-- statement is exercised against a harness that starts from the same
-- baseline ACL production does, not a harness that happens to have no
-- grants to revoke for an unrelated reason (e.g. roles not existing).
revoke all on function public.rebuild_metric_summaries() from public;
do $$
begin
  execute 'revoke all on function public.rebuild_metric_summaries() from anon';
  execute 'revoke all on function public.rebuild_metric_summaries() from authenticated';
end
$$;

-- Simplified stub of refresh_game_metric_snapshots_internal: faithfully
-- reimplements the tag-count-relevant columns this correction actually
-- depends on, using the identical identity-resolution production uses, the
-- same delete-then-insert-for-every-game-player pattern for
-- game_player_metric_snapshots (not a plain UPDATE) -- needed so a game
-- whose players have never been snapshotted before gets a correct fresh row
-- created, not silently skipped -- and, new this round, deletes and
-- reinserts game_milestone_metric_snapshots / game_award_metric_snapshots
-- for the game too (matching production's real four-table scope), and
-- calls public.rebuild_metric_summaries() unconditionally at the end of
-- every invocation, on both the finalized and the early-return
-- non-finalized paths -- matching production's real control flow exactly
-- (confirmed against the live function's definition, not assumed). This
-- last point is the specific fidelity gap this harness round closes: the
-- previous stub never called rebuild_metric_summaries() at all, so it could
-- not have caught the once-per-game rebuild defect this correction fixes.
-- Score-share/normalized-efficiency/win-margin columns are not modeled --
-- out of scope for this correction and untouched by it.
create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid,
  p_require_editor boolean default true
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_status text;
begin
  if p_game_id is null then
    raise exception 'game id is required';
  end if;

  select status into v_status from public.games where id = p_game_id;

  if v_status is null then
    raise exception 'game % does not exist', p_game_id;
  end if;

  delete from public.game_player_tag_metric_snapshots where game_id = p_game_id;
  delete from public.game_milestone_metric_snapshots    where game_id = p_game_id;
  delete from public.game_award_metric_snapshots        where game_id = p_game_id;
  delete from public.game_player_metric_snapshots       where game_id = p_game_id;

  if v_status <> 'finalized' then
    perform public.rebuild_metric_summaries();
    return;
  end if;

  with tag_summary_matches as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.tag_code,
      glts.tag_count,
      glts.game_log_import_id,
      glts.played_card_count,
      glts.matched_card_count,
      glts.unresolved_card_count,
      glts.total_tag_count
    from public.game_log_imports gli
    join public.game_log_tag_summaries glts on glts.game_log_import_id = gli.id
    left join lateral (
      select gp_resolved.id as game_player_id
      from public.game_players gp_resolved
      join public.players p_resolved on p_resolved.id = gp_resolved.player_id
      where gp_resolved.game_id = gli.game_id
        and (
          public.metric_normalized_label(p_resolved.display_name) = glts.normalized_player_name
          or exists (
            select 1 from public.player_import_aliases pia
            where pia.player_id = p_resolved.id
              and pia.source_type = 'game_log'
              and pia.normalized_alias = glts.normalized_player_name
          )
        )
      order by gp_resolved.id
      limit 1
    ) resolved_player on glts.game_player_id is null
    where gli.game_id = p_game_id
  ),
  player_tag_rollups as (
    select
      import_rollups.game_player_id,
      sum(import_rollups.played_card_count)::integer as played_card_count,
      sum(import_rollups.matched_card_count)::integer as matched_card_count,
      sum(import_rollups.unresolved_card_count)::integer as unresolved_card_count,
      sum(import_rollups.total_tag_count)::integer as total_tag_count
    from (
      select
        game_player_id,
        game_log_import_id,
        max(played_card_count) as played_card_count,
        max(matched_card_count) as matched_card_count,
        max(unresolved_card_count) as unresolved_card_count,
        max(total_tag_count) as total_tag_count
      from tag_summary_matches
      where game_player_id is not null
      group by game_player_id, game_log_import_id
    ) import_rollups
    group by import_rollups.game_player_id
  )
  -- Unconditional: one row per game_player of this (finalized) game,
  -- whether or not root has any evidence for them -- matches production's
  -- target_players (games join game_players, no snapshot-existence check).
  insert into public.game_player_metric_snapshots (
    game_id, game_player_id, group_id, player_id, total_tag_count,
    played_card_count, matched_played_card_count, unresolved_played_card_count
  )
  select
    p_game_id,
    gp.id,
    p.group_id,
    p.id,
    coalesce(ptr.total_tag_count, 0),
    coalesce(ptr.played_card_count, 0),
    coalesce(ptr.matched_card_count, 0),
    coalesce(ptr.unresolved_card_count, 0)
  from public.game_players gp
  join public.players p on p.id = gp.player_id
  left join player_tag_rollups ptr on ptr.game_player_id = gp.id
  where gp.game_id = p_game_id;

  with tag_summary_matches as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
      glts.tag_code,
      glts.tag_count,
      glts.game_log_import_id,
      glts.played_card_count,
      glts.matched_card_count,
      glts.unresolved_card_count,
      glts.total_tag_count
    from public.game_log_imports gli
    join public.game_log_tag_summaries glts on glts.game_log_import_id = gli.id
    left join lateral (
      select gp_resolved.id as game_player_id
      from public.game_players gp_resolved
      join public.players p_resolved on p_resolved.id = gp_resolved.player_id
      where gp_resolved.game_id = gli.game_id
        and (
          public.metric_normalized_label(p_resolved.display_name) = glts.normalized_player_name
          or exists (
            select 1 from public.player_import_aliases pia
            where pia.player_id = p_resolved.id
              and pia.source_type = 'game_log'
              and pia.normalized_alias = glts.normalized_player_name
          )
        )
      order by gp_resolved.id
      limit 1
    ) resolved_player on glts.game_player_id is null
    where gli.game_id = p_game_id
  ),
  tag_counts as (
    select game_player_id, tag_code, sum(tag_count)::integer as tag_count
    from tag_summary_matches
    where game_player_id is not null
    group by game_player_id, tag_code
  ),
  player_tag_rollups as (
    select
      import_rollups.game_player_id,
      sum(import_rollups.played_card_count)::integer as played_card_count,
      sum(import_rollups.matched_card_count)::integer as matched_card_count,
      sum(import_rollups.unresolved_card_count)::integer as unresolved_card_count,
      sum(import_rollups.total_tag_count)::integer as total_tag_count
    from (
      select
        game_player_id,
        game_log_import_id,
        max(played_card_count) as played_card_count,
        max(matched_card_count) as matched_card_count,
        max(unresolved_card_count) as unresolved_card_count,
        max(total_tag_count) as total_tag_count
      from tag_summary_matches
      where game_player_id is not null
      group by game_player_id, game_log_import_id
    ) import_rollups
    group by import_rollups.game_player_id
  )
  insert into public.game_player_tag_metric_snapshots (
    game_id, game_player_id, group_id, player_id, tag_code, tag_count,
    total_tag_count, played_card_count, matched_card_count, unresolved_card_count
  )
  select
    p_game_id,
    gps.game_player_id,
    gps.group_id,
    gps.player_id,
    tag_counts.tag_code,
    tag_counts.tag_count,
    coalesce(player_tag_rollups.total_tag_count, 0),
    coalesce(player_tag_rollups.played_card_count, 0),
    coalesce(player_tag_rollups.matched_card_count, 0),
    coalesce(player_tag_rollups.unresolved_card_count, 0)
  from tag_counts
  join public.game_player_metric_snapshots gps on gps.game_player_id = tag_counts.game_player_id
  left join player_tag_rollups on player_tag_rollups.game_player_id = tag_counts.game_player_id
  where gps.game_id = p_game_id;

  -- game_milestone_metric_snapshots: one row per claimed milestone in this
  -- game, mirroring production's join shape (reduced column set).
  insert into public.game_milestone_metric_snapshots (
    game_id, game_milestone_id, group_id, milestone_id, winner_game_player_id
  )
  select
    gm.game_id,
    gm.id,
    g.group_id,
    gm.milestone_id,
    gm.winner_game_player_id
  from public.game_milestones gm
  join public.games g on g.id = gm.game_id
  where gm.game_id = p_game_id;

  -- game_award_metric_snapshots: one row per funded award in this game.
  insert into public.game_award_metric_snapshots (
    game_id, game_award_id, group_id, award_id, funded_by_game_player_id, winner_game_player_id
  )
  select
    ga.game_id,
    ga.id,
    g.group_id,
    ga.award_id,
    ga.funded_by_game_player_id,
    ga.winner_game_player_id
  from public.game_awards ga
  join public.games g on g.id = ga.game_id
  where ga.game_id = p_game_id;

  perform public.rebuild_metric_summaries();
end;
$$;

revoke all on function public.refresh_game_metric_snapshots_internal(uuid, boolean) from public;
do $$
begin
  execute 'revoke all on function public.refresh_game_metric_snapshots_internal(uuid, boolean) from anon';
  execute 'grant execute on function public.refresh_game_metric_snapshots_internal(uuid, boolean) to authenticated';
end
$$;
