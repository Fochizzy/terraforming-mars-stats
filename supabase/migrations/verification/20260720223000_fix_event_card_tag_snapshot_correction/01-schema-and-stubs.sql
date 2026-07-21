-- Disposable verification schema: the exact columns/constraints the
-- candidate migration reads and writes, plus faithful-but-simplified stubs
-- for the pre-existing, unmodified production functions it calls
-- (refresh_game_metric_snapshots_internal, rebuild_metric_summaries).
-- Everything unrelated to the tag/total_tag_count columns this correction
-- touches (milestones, awards, corporations, maps, scoring shares, etc.) is
-- intentionally omitted from the stub — documented as a limitation in the
-- correction-package doc.

create schema if not exists public;

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

-- A marker table standing in for "did rebuild_metric_summaries run" — the
-- real function rebuilds several global aggregate tables not replicated
-- here; this stub only proves the call happens exactly when expected.
create table public._rebuild_marker (
  called_at timestamptz not null default now()
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

-- Simplified stub of refresh_game_metric_snapshots_internal: faithfully
-- reimplements only the tag-count-relevant columns this correction actually
-- depends on (game_player_tag_metric_snapshots in full,
-- game_player_metric_snapshots.total_tag_count), using the identical
-- identity-resolution the production function uses. Does not implement
-- milestone/award/scoring-share snapshot rebuilding, which are out of scope
-- for this correction and untouched by it.
create or replace function public.refresh_game_metric_snapshots_internal(
  p_game_id uuid,
  p_require_editor boolean default true
)
returns void
language plpgsql
as $$
begin
  if p_game_id is null then
    raise exception 'game id is required';
  end if;

  delete from public.game_player_tag_metric_snapshots where game_id = p_game_id;

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
    gp.id,
    p.group_id,
    p.id,
    tag_counts.tag_code,
    tag_counts.tag_count,
    coalesce(player_tag_rollups.total_tag_count, 0),
    coalesce(player_tag_rollups.played_card_count, 0),
    coalesce(player_tag_rollups.matched_card_count, 0),
    coalesce(player_tag_rollups.unresolved_card_count, 0)
  from tag_counts
  join public.game_players gp on gp.id = tag_counts.game_player_id
  join public.players p on p.id = gp.player_id
  left join player_tag_rollups on player_tag_rollups.game_player_id = tag_counts.game_player_id;

  with tag_summary_matches as (
    select
      coalesce(glts.game_player_id, resolved_player.game_player_id) as game_player_id,
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
  update public.game_player_metric_snapshots gps
  set played_card_count = coalesce(ptr.played_card_count, 0),
      matched_played_card_count = coalesce(ptr.matched_card_count, 0),
      unresolved_played_card_count = coalesce(ptr.unresolved_card_count, 0),
      total_tag_count = coalesce(ptr.total_tag_count, 0),
      updated_at = now()
  from player_tag_rollups ptr
  where gps.game_player_id = ptr.game_player_id
    and gps.game_id = p_game_id;
end;
$$;

-- Stub: proves the call happened, without rebuilding the (not-fixtured)
-- global aggregate tables the real function touches.
create or replace function public.rebuild_metric_summaries()
returns void
language plpgsql
as $$
begin
  insert into public._rebuild_marker default values;
end;
$$;
